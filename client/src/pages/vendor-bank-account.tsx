import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, CreditCard, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authenticatedFetch } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function VendorBankAccount() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    bankCode: '',
    accountNumber: '',
    accountName: '',
  });

  // Fetch banks list
  const { data: banks = [], isLoading: loadingBanks } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/vendor/banks');
      if (!response.ok) throw new Error('Failed to fetch banks');
      return response.json();
    },
  });

  // Fetch existing bank account
  const { data: existingAccount, isLoading: loadingAccount } = useQuery({
    queryKey: ['vendorBankAccount'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/vendor/bank-account');
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch bank account');
      }
      return response.json();
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingAccount) {
      setFormData({
        bankCode: existingAccount.bank_code || '',
        accountNumber: existingAccount.account_number || '',
        accountName: existingAccount.account_name || '',
      });
    }
  }, [existingAccount]);

  // Verify account number
  const verifyAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedFetch('/api/vendor/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankCode: formData.bankCode,
          accountNumber: formData.accountNumber,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify account');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, accountName: data.account_name }));
      toast({
        title: 'Account Verified!',
        description: `Account belongs to ${data.account_name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save/Update bank account
  const saveBankAccountMutation = useMutation({
    mutationFn: async () => {
      const endpoint = existingAccount 
        ? '/api/vendor/bank-account/update' 
        : '/api/vendor/bank-account';
      
      const response = await authenticatedFetch(endpoint, {
        method: existingAccount ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankCode: formData.bankCode,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save bank account');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorBankAccount'] });
      toast({
        title: 'Success!',
        description: existingAccount 
          ? 'Bank account updated successfully' 
          : 'Bank account linked successfully. You can now add products!',
      });
      setLocation('/vendor-products');
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleVerify = () => {
    if (!formData.bankCode || !formData.accountNumber) {
      toast({
        title: 'Missing Information',
        description: 'Please select a bank and enter account number',
        variant: 'destructive',
      });
      return;
    }

    if (formData.accountNumber.length !== 10) {
      toast({
        title: 'Invalid Account Number',
        description: 'Account number must be 10 digits',
        variant: 'destructive',
      });
      return;
    }

    verifyAccountMutation.mutate();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accountName) {
      toast({
        title: 'Verification Required',
        description: 'Please verify your account number first',
        variant: 'destructive',
      });
      return;
    }

    saveBankAccountMutation.mutate();
  };

  if (loadingBanks || loadingAccount) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Bank Account Setup</h1>
              <p className="text-sm text-gray-400">
                {existingAccount ? 'Update your bank account' : 'Link your bank account to receive payments'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Info Card */}
        <Card className="bg-blue-900/20 border-blue-800 mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-blue-300">
                <p className="font-semibold mb-1">Why do I need this?</p>
                <p>
                  To sell products on our platform, you need to link your bank account. 
                  We use Paystack to process payments securely. You'll receive 98% of each sale 
                  (2% platform fee).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Bank Details
              </CardTitle>
              <CardDescription>
                Enter your bank account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bank Selection */}
              <div className="space-y-2">
                <Label htmlFor="bank">Bank Name *</Label>
                <Select
                  value={formData.bankCode}
                  onValueChange={(value) => setFormData({ ...formData, bankCode: value, accountName: '' })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank: any) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Number */}
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number *</Label>
                <div className="flex gap-2">
                  <Input
                    id="accountNumber"
                    type="text"
                    maxLength={10}
                    placeholder="0123456789"
                    value={formData.accountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, accountNumber: value, accountName: '' });
                    }}
                    className="bg-gray-800 border-gray-700"
                  />
                  <Button
                    type="button"
                    onClick={handleVerify}
                    disabled={verifyAccountMutation.isPending || !formData.bankCode || formData.accountNumber.length !== 10}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {verifyAccountMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  Enter your 10-digit account number and click Verify
                </p>
              </div>

              {/* Account Name (Auto-filled after verification) */}
              {formData.accountName && (
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-800 rounded-md">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-300 font-medium">{formData.accountName}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!formData.accountName || saveBankAccountMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {saveBankAccountMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {existingAccount ? 'Update Bank Account' : 'Link Bank Account'}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
