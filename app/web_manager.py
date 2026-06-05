import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from api.v1.router import api_router
from config_loader import ensure_config
from core.config import settings

ensure_config(settings.config_path)

app = FastAPI(title="Green API n8n Router", docs_url="/api/docs", redoc_url=None)

# Serve Angular static assets that exist as actual files
_dist = Path("static/dist")
if _dist.is_dir() and (_dist / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

app.include_router(api_router, prefix="/api/v1")


@app.get("/{full_path:path}", include_in_schema=False, response_model=None)
async def serve_spa(full_path: str) -> FileResponse | JSONResponse:
    """Serve Angular SPA for any path not matched by the API."""
    candidate = _dist / full_path
    if candidate.is_file():
        return FileResponse(candidate)
    index = _dist / "index.html"
    if index.exists():
        return FileResponse(index)
    return JSONResponse(
        {"message": "Angular app not built. Run: cd web && npm run build"},
        status_code=503,
    )
