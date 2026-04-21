from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_admin import router as admin_router
from app.api.routes_chart import router as chart_router
from app.api.routes_wallet import router as wallet_router

app = FastAPI(title="Trading-F Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chart_router, prefix="/api/v1/chart", tags=["chart"])
app.include_router(wallet_router, prefix="/api/v1/wallet", tags=["wallet"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
