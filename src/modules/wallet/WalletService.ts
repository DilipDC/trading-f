import { WalletAPI } from './WalletAPI';

export const WalletService = {
  async addMoney(userId: string, amount: number) {
    if (amount < 100) {
      throw new Error('Minimum deposit is ₹100');
    }
    return WalletAPI.createDeposit(userId, amount);
  },

  async withdrawMoney(userId: string, amount: number, upiId: string, upiName: string) {
    if (!upiId || !upiName) {
      throw new Error('UPI ID and UPI Name are required');
    }
    return WalletAPI.createWithdraw(userId, amount, upiId, upiName);
  },
};
