import threading
from fastapi import APIRouter

router = APIRouter(tags=["system"])


@router.post("/restart")
def restart_bot() -> dict:
    def _perform() -> None:
        import app as main_app
        main_app.restart_bot_component()

    threading.Timer(0.5, _perform).start()
    return {"message": "Bot restart initiated (web server remains running)"}
