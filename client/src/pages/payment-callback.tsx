import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '@/lib/authenticatedFetch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, ShoppingBag } from 'lucide-react';

export default function PaymentCallback() {
  const [location, setLocation] = useLocation();
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    const ref = params.get('reference');
    setReference(ref);
  }, [location]);

  const { data: verification, isLoading, error } = useQuery({
    queryKey: ['payment-verification', reference],
    queryFn: async () => {
      if (!reference) throw new Error('No reference provided');
      
      const response = await authenticatedFetch(`/api/payments/verify/${reference}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Payment verification failed');
      }
      
      return response.json();
    },
    enabled: !!reference,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-500" />
              <h2 className="text-lg sm:text-xl font-semibold text-white">Verifying Payment...</h2>
              <p className="text-sm sm:text-base text-gray-400">Please wait while we confirm your transaction</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <XCircle className="w-6 h-6" />
              Payment Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              {error instanceof Error ? error.message : 'Unable to verify your payment. Please contact support.'}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setLocation('/marketplace')}
                className="flex-1 bg-gray-800 hover:bg-gray-700"
              >
                Back to Marketplace
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { status, transaction, order } = verification;

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-6 h-6" />
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-400">Order ID:</span>
                <span className="text-white font-mono">#{order?.id}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-400">Amount Paid:</span>
                <span className="text-white font-semibold">
                  ₦{((transaction?.amount || 0) / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-gray-400">Reference:</span>
                <span className="text-white font-mono text-xs sm:text-sm break-all">{transaction?.reference}</span>
              </div>
              {order?.shipping_address && (
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400 flex-shrink-0">Shipping To:</span>
                  <span className="text-white text-xs sm:text-sm text-right max-w-[200px] break-words">
                    {order.shipping_address}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-300">
                Your order has been confirmed! The vendor will process it soon and contact you for delivery.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setLocation('/marketplace')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-500">
            <XCircle className="w-6 h-6" />
            Payment Not Completed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300">
            Your payment was not completed. No charges were made to your account.
          </p>
          <Button
            onClick={() => setLocation('/marketplace')}
            className="w-full bg-gray-800 hover:bg-gray-700"
          >
            Back to Marketplace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
