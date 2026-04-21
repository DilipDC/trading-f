import React, { useState } from 'react';
import { requestDeposit, requestWithdraw } from './WalletService';

export const WalletUI: React.FC<{ userId: string; balance: number }> = ({ userId, balance }) => {
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('');
  const [message, setMessage] = useState('');

  return (
    <section>
      <h3>Wallet</h3>
      <p>Balance: ₹{balance.toFixed(2)}</p>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
      <button onClick={async () => setMessage((await requestDeposit(userId, Number(amount))).message)}>Add Money</button>
      <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="UPI ID" />
      <input value={upiName} onChange={(e) => setUpiName(e.target.value)} placeholder="UPI Name" />
      <button onClick={async () => setMessage((await requestWithdraw(userId, Number(amount), upiId, upiName)).message)}>Withdraw</button>
      {message ? <small>{message}</small> : null}
    </section>
  );
};
