import { createDeposit, createWithdraw } from './WalletAPI';

export async function requestDeposit(userId: string, amount: number) {
  if (amount < 100) {
    throw new Error('Minimum deposit is ₹100');
  }
  return createDeposit({ user_id: userId, amount });
}

export async function requestWithdraw(userId: string, amount: number, upiId: string, upiName: string) {
  if (!upiId || !upiName) {
    throw new Error('UPI ID and name are required');
  }
  return createWithdraw({ user_id: userId, amount, upi_id: upiId, upi_name: upiName });
}
