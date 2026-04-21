# Backend (FastAPI)

Run locally:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Key APIs:
- `GET /api/v1/chart/{symbol}?timeframe=1m|2m|3m|5m&chart_type=candlestick|line|area`
- `DELETE /api/v1/chart/cache`
- `POST /api/v1/wallet/deposit`
- `POST /api/v1/wallet/withdraw`
- `GET /api/v1/wallet/requests`
- `POST /api/v1/admin/feature-toggle`
- `POST /api/v1/admin/requests/{request_id}/approve|reject`
