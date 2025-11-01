import { Router, Request, Response } from 'express';
import { sqlite } from './db';
import { listBanks, resolveAccountNumber, createSubaccount, updateSubaccount } from './paystack';

const router = Router();

// Get list of banks
router.get('/banks', async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching banks list from Paystack...');
    const response = await listBanks();
    console.log('✅ Banks fetched successfully:', response.data?.length || 0, 'banks');
    res.json(response.data);
  } catch (error: any) {
    console.error('❌ Error fetching banks:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Failed to fetch banks', 
      error: error.response?.data?.message || error.message 
    });
  }
});

// Verify account number
router.post('/verify-account', async (req: Request, res: Response) => {
  try {
    const { bankCode, accountNumber } = req.body;

    if (!bankCode || !accountNumber) {
      return res.status(400).json({ message: 'Bank code and account number are required' });
    }

    const response = await resolveAccountNumber({
      account_number: accountNumber,
      bank_code: bankCode,
    });

    res.json({
      account_name: response.data.account_name,
      account_number: response.data.account_number,
    });
  } catch (error: any) {
    console.error('Error verifying account:', error);
    res.status(400).json({ 
      message: 'Failed to verify account number', 
      error: error.response?.data?.message || error.message 
    });
  }
});

// Get vendor's bank account
router.get('/bank-account', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    const bankAccount = sqlite.prepare(`
      SELECT * FROM vendor_bank_accounts WHERE vendor_id = ?
    `).get(userId) as any;

    if (!bankAccount) {
      return res.status(404).json({ message: 'No bank account found' });
    }

    res.json(bankAccount);
  } catch (error: any) {
    console.error('Error fetching bank account:', error);
    res.status(500).json({ message: 'Failed to fetch bank account', error: error.message });
  }
});

// Create vendor bank account and Paystack subaccount
router.post('/bank-account', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { bankCode, accountNumber, accountName } = req.body;

    if (!bankCode || !accountNumber || !accountName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if bank account already exists
    const existing = sqlite.prepare(`
      SELECT * FROM vendor_bank_accounts WHERE vendor_id = ?
    `).get(userId);

    if (existing) {
      return res.status(400).json({ message: 'Bank account already exists. Use update endpoint.' });
    }

    // Get vendor details
    const vendor = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Create Paystack subaccount with 2% platform fee
    const subaccountResponse = await createSubaccount({
      business_name: `${vendor.first_name} ${vendor.last_name}`,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: 2, // 2% platform fee
    });

    // Save to database
    sqlite.prepare(`
      INSERT INTO vendor_bank_accounts (
        vendor_id, bank_code, account_number, account_name, 
        paystack_subaccount_code, created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      userId,
      bankCode,
      accountNumber,
      accountName,
      subaccountResponse.data.subaccount_code
    );

    // Update user record with subaccount code
    sqlite.prepare(`
      UPDATE users SET paystack_subaccount_code = ? WHERE id = ?
    `).run(subaccountResponse.data.subaccount_code, userId);

    res.json({
      message: 'Bank account linked successfully',
      subaccount_code: subaccountResponse.data.subaccount_code,
    });
  } catch (error: any) {
    console.error('Error creating bank account:', error);
    res.status(500).json({ 
      message: 'Failed to create bank account', 
      error: error.response?.data?.message || error.message 
    });
  }
});

// Update vendor bank account
router.put('/bank-account/update', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { bankCode, accountNumber, accountName } = req.body;

    if (!bankCode || !accountNumber || !accountName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Get existing bank account
    const existing = sqlite.prepare(`
      SELECT * FROM vendor_bank_accounts WHERE vendor_id = ?
    `).get(userId) as any;

    if (!existing) {
      return res.status(404).json({ message: 'No bank account found. Use create endpoint.' });
    }

    // Get vendor details
    const vendor = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Update Paystack subaccount
    await updateSubaccount(existing.paystack_subaccount_code, {
      business_name: `${vendor.first_name} ${vendor.last_name}`,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: 2,
    });

    // Update database
    sqlite.prepare(`
      UPDATE vendor_bank_accounts 
      SET bank_code = ?, account_number = ?, account_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE vendor_id = ?
    `).run(bankCode, accountNumber, accountName, userId);

    res.json({ message: 'Bank account updated successfully' });
  } catch (error: any) {
    console.error('Error updating bank account:', error);
    res.status(500).json({ 
      message: 'Failed to update bank account', 
      error: error.response?.data?.message || error.message 
    });
  }
});

export default router;
