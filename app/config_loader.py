import os
import yaml
from loguru import logger
from typing import Dict, List

DEFAULT_CONFIG: Dict[str, Dict[str, List[str]]] = {
    "green_api": {
        "instance_id": "your-instance-id",
        "token": "your-token"
    },
    "routes": {
        "1234567890@c.us": ["https://n8n.local/webhook/one"]
    }
}

def ensure_config(path: str = "config/config.yaml") -> None:
    """
    Ensures the configuration file exists. Creates a default configuration file if it does not exist.

    Args:
        path (str): Path to the configuration file.
    """
    if not os.path.exists(path):
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w") as f:
                yaml.dump(DEFAULT_CONFIG, f)
            logger.warning(f"🆕 Config file created at {path}. Please update it with your credentials.")
        except Exception as e:
            logger.error(f"Failed to create config file at {path}: {e}")

def load_config(path: str = "config/config.yaml") -> Dict[str, Dict[str, List[str]]]:
    """
    Loads the configuration file. Returns the default configuration if the file is missing or invalid.

    Args:
        path (str): Path to the configuration file.

    Returns:
        Dict[str, Dict[str, List[str]]]: The loaded configuration.
    """
    if not os.path.exists(path):
        logger.error(f"Config file not found at {path}. Using default configuration.")
        return DEFAULT_CONFIG

    try:
        with open(path, "r") as f:
            config = yaml.safe_load(f)
            if not config:
                logger.error("Config file is empty or invalid. Using default configuration.")
                return DEFAULT_CONFIG
            return config
    except Exception as e:
        logger.error(f"Failed to load config file at {path}: {e}. Using default configuration.")
        return DEFAULT_CONFIG
