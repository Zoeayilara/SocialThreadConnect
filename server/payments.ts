import { Router, Request, Response } from 'express';
import { sqlite } from './db';
import { initializePayment, verifyPayment } from './paystack';

const router = Router();

// Initialize payment
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { productId, quantity, size, shippingAddress } = req.body;

    if (!productId || !quantity || !shippingAddress) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get product details and vendor's bank account
    const product = sqlite.prepare(`
      SELECT p.*, u.email as vendor_email, vba.paystack_subaccount_code
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN vendor_bank_accounts vba ON p.vendor_id = vba.vendor_id
      WHERE p.id = ?
    `).get(productId) as any;

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if vendor has Paystack subaccount
    if (!product.paystack_subaccount_code) {
      return res.status(400).json({ 
        message: 'Vendor has not set up payment account. Please contact the vendor.' 
      });
    }

    // Check stock
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Get customer details
    const customer = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Calculate total (product price * quantity)
    const subtotal = product.price * quantity;
    
    // Platform fee is 2% (already configured in subaccount)
    const totalAmount = subtotal;

    // Generate unique reference
    const reference = `ORDER-${Date.now()}-${productId}-${userId}`;

    // Create order record
    const orderResult = sqlite.prepare(`
      INSERT INTO orders (
        customer_id, vendor_id, product_id, quantity, size,
        total_amount, shipping_address, payment_reference, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      userId,
      product.vendor_id,
      productId,
      quantity,
      size || null,
      totalAmount,
      shippingAddress,
      reference
    );

    // Get callback URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'https://entreefox.com';
    const callbackUrl = `${frontendUrl}/payment-callback?reference=${reference}`;

    // Initialize Paystack payment
    const paystackResponse = await initializePayment({
      email: customer.email,
      amount: Math.round(totalAmount * 100), // Convert to kobo
      reference: reference,
      subaccount: product.paystack_subaccount_code,
      bearer: 'subaccount', // Vendor pays transaction fee
      callback_url: callbackUrl,
      metadata: {
        order_id: orderResult.lastInsertRowid,
        product_id: productId,
        product_name: product.name,
        quantity: quantity,
        size: size || 'N/A',
        customer_name: `${customer.first_name} ${customer.last_name}`,
        vendor_id: product.vendor_id,
      },
    });

    res.json({
      authorization_url: paystackResponse.data.authorization_url,
      access_code: paystackResponse.data.access_code,
      reference: reference,
    });
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ 
      message: 'Failed to initialize payment',
      error: error.message 
    });
  }
});

// Verify payment
router.get('/verify/:reference', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { reference } = req.params;

    // Get order
    const order = sqlite.prepare(`
      SELECT * FROM orders WHERE payment_reference = ?
    `).get(reference) as any;

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify with Paystack
    const verification = await verifyPayment(reference);

    if (verification.data.status === 'success') {
      // Update order status
      sqlite.prepare(`
        UPDATE orders 
        SET status = 'paid', 
            payment_verified_at = CURRENT_TIMESTAMP
        WHERE payment_reference = ?
      `).run(reference);

      // Update product stock
      sqlite.prepare(`
        UPDATE products 
        SET stock = stock - ? 
        WHERE id = ?
      `).run(order.quantity, order.product_id);

      res.json({
        status: 'success',
        message: 'Payment verified successfully',
        transaction: verification.data,
        order: {
          id: order.id,
          shipping_address: order.shipping_address,
          total_amount: order.total_amount,
        },
      });
    } else {
      // Update order to failed
      sqlite.prepare(`
        UPDATE orders 
        SET status = 'failed'
        WHERE payment_reference = ?
      `).run(reference);

      res.json({
        status: 'failed',
        message: 'Payment verification failed',
        transaction: verification.data,
      });
    }
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      message: 'Failed to verify payment',
      error: error.message 
    });
  }
});

export default router;
