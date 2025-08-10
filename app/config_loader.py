import os
import yaml
from loguru import logger
from typing import Dict, List, Union

DEFAULT_CONFIG: Dict[str, Union[Dict[str, str], Dict[str, Union[str, List[str]]]]] = {
    "green_api": {
        "instance_id": "",
        "token": ""
    },
    "routes": {
        "1234567890@c.us": {
            "name": "Example Contact",
            "target_urls": ["https://n8n.local/webhook/one"]
        }
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

def _process_route_entry(chat_id: str, target_urls) -> Dict:
    """
    Process a single route entry and convert it to the standardized format.
    
    Args:
        chat_id (str): The chat ID for this route
        target_urls: The target URLs configuration (can be list, dict, or string)
        
    Returns:
        Dict: Standardized route entry
    """
    if isinstance(target_urls, list):
        # Legacy format: chat_id -> [urls]
        return {
            "name": chat_id,  # Use chat_id as default name
            "target_urls": target_urls
        }
    elif isinstance(target_urls, dict):
        # New format: chat_id -> {name, target_urls}
        result = target_urls.copy()
        # Ensure name exists
        if "name" not in result:
            result["name"] = chat_id
        return result
    else:
        # Handle single URL case
        return {
            "name": chat_id,
            "target_urls": [target_urls] if isinstance(target_urls, str) else []
        }

def migrate_legacy_config(config: Dict) -> Dict:
    """
    Migrates legacy configuration format to new format with names.
    
    Args:
        config (Dict): The configuration to migrate.
        
    Returns:
        Dict: The migrated configuration.
    """
    result = config.copy()
    
    if "routes" in result:
        migrated_routes = {}
        for chat_id, target_urls in result["routes"].items():
            migrated_routes[chat_id] = _process_route_entry(chat_id, target_urls)
        result["routes"] = migrated_routes
    
    return result

def load_config(path: str = "config/config.yaml") -> Dict:
    """
    Loads the configuration file. Returns the default configuration if the file is missing or invalid.

    Args:
        path (str): Path to the configuration file.

    Returns:
        Dict: The loaded configuration.
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
            
            # Migrate legacy format if needed
            config = migrate_legacy_config(config)
            return config
    except Exception as e:
        logger.error(f"Failed to load config file at {path}: {e}. Using default configuration.")
        return DEFAULT_CONFIG
