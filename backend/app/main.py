from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_admin import router as admin_router
from app.api.routes_market import router as market_router
from app.api.routes_wallet import router as wallet_router

app = FastAPI(title="Trading-F Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market_router, prefix="/api/market", tags=["market"])
app.include_router(wallet_router, prefix="/api/wallet", tags=["wallet"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
