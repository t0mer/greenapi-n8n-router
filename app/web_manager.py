from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from api.v1.router import api_router
from config_loader import ensure_config
from core.config import settings

ensure_config(settings.config_path)

app = FastAPI(title="Green API n8n Router", docs_url="/api/docs", redoc_url=None)

# Angular 18 builder emits into a browser/ subdirectory inside outputPath
_dist = Path("static/dist/browser")
_dist_resolved = _dist.resolve()

if _dist.is_dir() and (_dist / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

app.include_router(api_router, prefix="/api/v1")


@app.get("/{full_path:path}", include_in_schema=False, response_model=None)
async def serve_spa(full_path: str) -> FileResponse | JSONResponse:
    """Serve Angular SPA — path-traversal safe, API routes take precedence."""
    # Resolve and contain: reject any path that escapes the dist directory
    try:
        candidate = (_dist / full_path).resolve()
        candidate.relative_to(_dist_resolved)  # raises ValueError on escape
    except (ValueError, OSError):
        candidate = None

    if candidate is not None and candidate.is_file():
        return FileResponse(candidate)

    index = _dist / "index.html"
    if index.exists():
        return FileResponse(index)

    return JSONResponse(
        {"message": "Angular app not built. Run: cd web && npm run build"},
        status_code=503,
    )
