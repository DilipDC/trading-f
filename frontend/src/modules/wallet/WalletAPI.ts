export type DepositPayload = { user_id: string; amount: number };
export type WithdrawPayload = { user_id: string; amount: number; upi_id: string; upi_name: string };

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export async function createDeposit(payload: DepositPayload) {
  const res = await fetch(`${BASE}/api/wallet/deposit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createWithdraw(payload: WithdrawPayload) {
  const res = await fetch(`${BASE}/api/wallet/withdraw`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
