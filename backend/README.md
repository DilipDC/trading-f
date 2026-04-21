# Backend (FastAPI)

## Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Key APIs

- `GET /health`
- `GET /api/market/chart/{symbol}?timeframe=1m|2m|3m|5m`
- `POST /api/wallet/deposit`
- `POST /api/wallet/withdraw`
- `GET /api/admin/dashboard`
- `PATCH /api/admin/features`
- `PATCH /api/admin/wallet-rules`
- `POST /api/admin/wallet/decision`

Chart data is capped to the latest 1 hour using a sliding window policy.
