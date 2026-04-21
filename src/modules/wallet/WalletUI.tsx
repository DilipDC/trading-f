import React, { useEffect, useState } from 'react';
import { WalletService } from './WalletService';
import { WalletAPI } from './WalletAPI';

interface WalletUIProps {
  userId: string;
}

const WalletUI: React.FC<WalletUIProps> = ({ userId }) => {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('100');
  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    WalletAPI.getBalance(userId).then(setBalance).catch(() => setStatus('Failed to fetch balance'));
  }, [userId]);

  return (
    <section>
      <h3>Wallet</h3>
      <p>Balance: ₹{balance}</p>
      <div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
        <button onClick={async () => {
          try {
            const request = await WalletService.addMoney(userId, Number(amount));
            setStatus(`Deposit ${request.status}`);
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Deposit failed');
          }
        }}>Add Money</button>
      </div>
      <div>
        <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="UPI ID" />
        <input value={upiName} onChange={(e) => setUpiName(e.target.value)} placeholder="UPI Name" />
        <button onClick={async () => {
          try {
            const request = await WalletService.withdrawMoney(userId, Number(amount), upiId, upiName);
            setStatus(`Withdraw ${request.status}`);
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Withdraw failed');
          }
        }}>Withdraw</button>
      </div>
      <small>{status}</small>
    </section>
  );
};

export default WalletUI;
