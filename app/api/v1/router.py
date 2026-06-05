from fastapi import APIRouter
from .endpoints import routes, settings, restart, contacts, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(routes.router)
api_router.include_router(settings.router)
api_router.include_router(restart.router)
api_router.include_router(contacts.router)
