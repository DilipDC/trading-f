import React, { useEffect, useState } from 'react';
import { WalletAPI, type WalletRequest } from '../../modules/wallet/WalletAPI';

const WithdrawRequests: React.FC = () => {
  const [rows, setRows] = useState<WalletRequest[]>([]);

  useEffect(() => {
    WalletAPI.listRequests('pending').then((items) => {
      setRows(items.filter((item) => item.request_type === 'withdraw'));
    });
  }, []);

  return (
    <div>
      <h4>Pending Withdrawals</h4>
      {rows.map((row) => (
        <div key={row.request_id}>{row.user_id} - ₹{row.amount} - {row.status}</div>
      ))}
    </div>
  );
};

export default WithdrawRequests;
