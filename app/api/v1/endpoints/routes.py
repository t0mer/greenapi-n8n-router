from fastapi import APIRouter, HTTPException
from schemas.route import RouteCreate, RouteUpdate, CardNameUpdate
from services.route_service import RouteService

router = APIRouter(prefix="/routes", tags=["routes"])
_svc = RouteService()
_NOT_FOUND = "Route not found"


@router.get("")
def get_routes() -> dict:
    return {"routes": _svc.get_all()}


@router.post("", status_code=201)
def create_route(data: RouteCreate) -> dict:
    if _svc.exists(data.chat_id):
        raise HTTPException(status_code=400, detail="Route already exists")
    _svc.create(data.chat_id, data.name or data.chat_id, data.target_urls)
    return {"message": "Route added"}


@router.put("/{chat_id}")
def update_route(chat_id: str, data: RouteUpdate) -> dict:
    if not _svc.exists(chat_id):
        raise HTTPException(status_code=404, detail=_NOT_FOUND)
    _svc.update(chat_id, data.target_urls, data.name)
    return {"message": "Route updated"}


@router.delete("/{chat_id}")
def delete_route(chat_id: str) -> dict:
    if not _svc.exists(chat_id):
        raise HTTPException(status_code=404, detail=_NOT_FOUND)
    _svc.delete(chat_id)
    return {"message": "Route deleted"}


@router.put("/{chat_id}/name")
def rename_route(chat_id: str, data: CardNameUpdate) -> dict:
    if not _svc.exists(chat_id):
        raise HTTPException(status_code=404, detail=_NOT_FOUND)
    _svc.rename(chat_id, data.name)
    return {"message": "Card name updated"}
