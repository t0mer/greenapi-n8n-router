from fastapi import APIRouter, HTTPException
from schemas.contact import ContactsResponse, ContactSearchResponse
from services.contacts_service import contacts_service
import httpx

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=ContactsResponse)
async def get_contacts() -> dict:
    try:
        data, cached = await contacts_service.get_contacts()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Green API error")
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Could not reach Green API")
    return {"contacts": data, "cached": cached}


@router.get("/search", response_model=ContactSearchResponse)
async def search_contacts(q: str = "") -> dict:
    if len(q.strip()) < 3:
        return {"contacts": [], "total": 0, "cached": False}
    try:
        all_contacts, cached = await contacts_service.get_contacts()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (httpx.HTTPStatusError, httpx.RequestError):
        return {"contacts": [], "total": 0, "cached": False}
    filtered = contacts_service.search(all_contacts, q)
    return {"contacts": filtered, "total": len(filtered), "cached": cached}
