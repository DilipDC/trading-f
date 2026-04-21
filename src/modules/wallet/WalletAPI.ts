import { backendClient } from '../../services/backendClient';

export interface WalletRequest {
  request_id: string;
  user_id: string;
  amount: number;
  request_type: 'deposit' | 'withdraw';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const WalletAPI = {
  getBalance: async (userId: string): Promise<number> => {
    const { data } = await backendClient.get<{ balance: number }>(`/wallet/balance/${userId}`);
    return data.balance;
  },
  createDeposit: async (userId: string, amount: number): Promise<WalletRequest> => {
    const { data } = await backendClient.post<WalletRequest>('/wallet/deposit', { user_id: userId, amount });
    return data;
  },
  createWithdraw: async (userId: string, amount: number, upiId: string, upiName: string): Promise<WalletRequest> => {
    const { data } = await backendClient.post<WalletRequest>('/wallet/withdraw', {
      user_id: userId,
      amount,
      upi_id: upiId,
      upi_name: upiName,
    });
    return data;
  },
  listRequests: async (status?: WalletRequest['status']): Promise<WalletRequest[]> => {
    const { data } = await backendClient.get<WalletRequest[]>('/wallet/requests', { params: { status } });
    return data;
  },
};
