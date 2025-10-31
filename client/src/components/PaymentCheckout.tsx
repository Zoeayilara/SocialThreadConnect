import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { authenticatedFetch } from '@/lib/authenticatedFetch';
import { Loader2, ShoppingCart } from 'lucide-react';

interface PaymentCheckoutProps {
  product: {
    id: number;
    name: string;
    price: number;
    image_url?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentCheckout({ product, isOpen, onClose }: PaymentCheckoutProps) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  const initializePaymentMutation = useMutation({
    mutationFn: async (data: { productId: number; quantity: number; size?: string; shippingAddress: string }) => {
      const response = await authenticatedFetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initialize payment');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Paystack payment page
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Payment Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCheckout = () => {
    if (!shippingAddress.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a shipping address',
        variant: 'destructive',
      });
      return;
    }

    initializePaymentMutation.mutate({
      productId: product.id,
      quantity,
      size: size || undefined,
      shippingAddress,
    });
  };

  const totalPrice = product.price * quantity;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Checkout
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="flex gap-4 p-4 bg-gray-800 rounded-lg">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-20 h-20 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-400">₦{product.price.toLocaleString()}</p>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          {/* Size (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="size">Size (Optional)</Label>
            <Input
              id="size"
              type="text"
              placeholder="e.g., M, L, XL"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          {/* Shipping Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Shipping Address *</Label>
            <Input
              id="address"
              type="text"
              placeholder="Enter your delivery address"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          {/* Total */}
          <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
            <span className="font-semibold">Total:</span>
            <span className="text-xl font-bold text-green-500">
              ₦{totalPrice.toLocaleString()}
            </span>
          </div>

          {/* Checkout Button */}
          <Button
            onClick={handleCheckout}
            disabled={initializePaymentMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {initializePaymentMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
