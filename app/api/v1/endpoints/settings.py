import yaml
from fastapi import APIRouter, HTTPException
from config_loader import load_config
from core.config import settings as app_settings
from schemas.settings import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_settings() -> dict:
    config = load_config(app_settings.config_path)
    return config["green_api"]


@router.post("")
def update_settings(data: SettingsUpdate) -> dict:
    config = load_config(app_settings.config_path)
    config["green_api"]["instance_id"] = data.instance_id
    config["green_api"]["token"] = data.token
    try:
        with open(app_settings.config_path, "w") as f:
            yaml.dump(config, f)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {e}")
    return {"message": "Settings updated"}
