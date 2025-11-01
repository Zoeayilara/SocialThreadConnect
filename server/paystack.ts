import axios from 'axios';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY) {
  console.warn('Warning: PAYSTACK_SECRET_KEY is not set in environment variables');
}

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

export interface InitializePaymentParams {
  email: string;
  amount: number; // in kobo (multiply by 100)
  reference: string;
  subaccount?: string;
  bearer?: 'account' | 'subaccount';
  callback_url?: string;
  metadata?: any;
}

export async function initializePayment(params: InitializePaymentParams) {
  const response = await paystackClient.post('/transaction/initialize', params);
  return response.data;
}

export async function verifyPayment(reference: string) {
  const response = await paystackClient.get(`/transaction/verify/${reference}`);
  return response.data;
}

export interface CreateSubaccountParams {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
}

export async function createSubaccount(params: CreateSubaccountParams) {
  const response = await paystackClient.post('/subaccount', params);
  return response.data;
}

export async function updateSubaccount(subaccountCode: string, params: Partial<CreateSubaccountParams>) {
  const response = await paystackClient.put(`/subaccount/${subaccountCode}`, params);
  return response.data;
}

export async function listBanks() {
  const response = await paystackClient.get('/bank?country=nigeria');
  return response.data;
}

export interface ResolveAccountParams {
  account_number: string;
  bank_code: string;
}

export async function resolveAccountNumber(params: ResolveAccountParams) {
  const response = await paystackClient.get('/bank/resolve', { params });
  return response.data;
}
