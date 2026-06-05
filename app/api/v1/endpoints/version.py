from fastapi import APIRouter
from core.config import settings

router = APIRouter(tags=["system"])


@router.get("/version")
def get_version() -> dict:
    return {"version": settings.app_version}
