import os
import yaml
from loguru import logger

DEFAULT_CONFIG = {
    "green_api": {
        "instance_id": "your-instance-id",
        "token": "your-token"
    },
    "routes": {
        "1234567890@c.us": "https://n8n.local/webhook/one"
    }
}

def ensure_config(path: str = "config/config.yaml") -> None:
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            yaml.dump(DEFAULT_CONFIG, f)
        logger.warning(f"🆕 Config file created at {path}. Please update it with your credentials.")

def load_config(path: str = "config/config.yaml") -> dict:
    with open(path, "r") as f:
        config = yaml.safe_load(f)
        if not config:
            logger.error("Config file is empty or invalid.")
            return DEFAULT_CONFIG
        return config
