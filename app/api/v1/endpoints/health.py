import time
from fastapi import APIRouter

router = APIRouter(tags=["system"])


@router.get("/health")
def health_check() -> dict:
    return {"status": "healthy", "timestamp": time.time()}
