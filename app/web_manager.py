from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from config_loader import load_config, ensure_config
from pydantic import BaseModel, validator, HttpUrl
import yaml
import os
import sys
import signal
import threading
import subprocess
import time
import re
from typing import List

CONFIG_PATH = "config/config.yaml"

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
# Ensure config file exists
ensure_config(CONFIG_PATH)

# Load initial config
config = load_config(CONFIG_PATH)

templates = Jinja2Templates(directory="templates")

def validate_webhook_url(url: str) -> str:
    """
    Validates that a webhook URL has proper format.
    
    Args:
        url (str): The URL to validate
        
    Returns:
        str: The validated URL
        
    Raises:
        ValueError: If the URL is invalid
    """
    url = url.strip()
    
    if not url:
        raise ValueError("URL cannot be empty")
    
    # Check if it's a valid URL format
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    
    if not url_pattern.match(url):
        raise ValueError("Invalid URL format. URL must start with http:// or https:// and have valid structure")
    
    return url

class RouteCreate(BaseModel):
    chat_id: str
    target_urls: List[str]
    name: str = None

    @validator('target_urls')
    def validate_urls(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one webhook URL is required")
        
        validated_urls = []
        for i, url in enumerate(v):
            try:
                validated_url = validate_webhook_url(url)
                validated_urls.append(validated_url)
            except ValueError as e:
                raise ValueError(f"URL {i+1}: {str(e)}")
        
        # Check for duplicates
        if len(set(validated_urls)) != len(validated_urls):
            raise ValueError("Duplicate URLs are not allowed")
        
        return validated_urls

class RouteUpdate(BaseModel):
    chat_id: str
    target_urls: List[str]
    name: str = None

    @validator('target_urls')
    def validate_urls(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one webhook URL is required")
        
        validated_urls = []
        for i, url in enumerate(v):
            try:
                validated_url = validate_webhook_url(url)
                validated_urls.append(validated_url)
            except ValueError as e:
                raise ValueError(f"URL {i+1}: {str(e)}")
        
        # Check for duplicates
        if len(set(validated_urls)) != len(validated_urls):
            raise ValueError("Duplicate URLs are not allowed")
        
        return validated_urls

class SettingsUpdate(BaseModel):
    instance_id: str
    token: str

class CardNameUpdate(BaseModel):
    name: str

@app.get("/")
def routes_ui(request: Request):
    """
    Renders the routes management page.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    return templates.TemplateResponse("routes.html", {"request": request, "routes": config["routes"]})

@app.post("/routes-ui/add")
def add_route_ui(chat_id: str = Form(...), target_urls: str = Form(...)):
    """
    Adds a new route via the UI.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    target_urls_list = target_urls.split(",")
    if chat_id in config["routes"]:
        raise HTTPException(status_code=400, detail="Route already exists")
    config["routes"][chat_id] = target_urls_list

    # Save updated config to file
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)

    return RedirectResponse(url="/", status_code=302)

@app.post("/routes-ui/update")
def update_route_ui(chat_id: str = Form(...), target_urls: str = Form(...)):
    """
    Updates an existing route via the UI.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    target_urls_list = target_urls.split(",")
    if chat_id not in config["routes"]:
        raise HTTPException(status_code=404, detail="Route not found")
    config["routes"][chat_id] = target_urls_list

    # Save updated config to file
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)

    return RedirectResponse(url="/", status_code=302)

@app.post("/routes-ui/delete")
def delete_route_ui(chat_id: str = Form(...)):
    """
    Deletes a route via the UI.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    if chat_id not in config["routes"]:
        raise HTTPException(status_code=404, detail="Route not found")
    del config["routes"][chat_id]

    # Save updated config to file
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)

    return RedirectResponse(url="/", status_code=302)

@app.get("/routes")
def get_routes():
    """
    Retrieves all routes.

    Returns:
        dict: The current routes configuration.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    return {
        "routes": config.get("routes", {})
    }

@app.post("/routes")
def add_route(route_data: RouteCreate):
    """
    Adds a new route for a chat ID.

    Args:
        route_data (RouteCreate): The route data containing chat_id, target_urls, and optional name.

    Returns:
        dict: A message indicating the route was added.
    """
    try:
        # Reload config to get latest data
        global config
        config = load_config(CONFIG_PATH)
        
        if route_data.chat_id in config["routes"]:
            raise HTTPException(status_code=400, detail="Route already exists")
        
        # Use provided name or default to chat_id
        name = route_data.name if route_data.name else route_data.chat_id
        
        config["routes"][route_data.chat_id] = {
            "name": name,
            "target_urls": route_data.target_urls
        }

        # Save updated config to file
        with open(CONFIG_PATH, "w") as f:
            yaml.dump(config, f)

        return {"message": "Route added"}
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/routes/{chat_id}")
def update_route(chat_id: str, route_update: RouteUpdate):
    """
    Updates the route for a chat ID.

    Args:
        chat_id (str): The chat ID.
        route_update (RouteUpdate): The route update data.

    Returns:
        dict: A message indicating the route was updated.
    """
    try:
        # Reload config to get latest data
        global config
        config = load_config(CONFIG_PATH)
        
        if chat_id not in config["routes"]:
            raise HTTPException(status_code=404, detail="Route not found")
        
        # Preserve existing name if not provided in update
        existing_route = config["routes"][chat_id]
        if isinstance(existing_route, dict):
            existing_name = existing_route.get("name", chat_id)
        else:
            existing_name = chat_id
        
        config["routes"][chat_id] = {
            "name": route_update.name if route_update.name else existing_name,
            "target_urls": route_update.target_urls
        }

        # Save updated config to file
        with open(CONFIG_PATH, "w") as f:
            yaml.dump(config, f)

        return {"message": "Route updated"}
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/routes/{chat_id}")
def delete_route(chat_id: str):
    """
    Deletes the route for a chat ID.

    Args:
        chat_id (str): The chat ID.

    Returns:
        dict: A message indicating the route was deleted.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    if chat_id not in config["routes"]:
        raise HTTPException(status_code=404, detail="Route not found")
    
    del config["routes"][chat_id]

    # Save updated config to file
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)

    return {"message": "Route deleted"}

@app.delete("/routes/{chat_id}/url")
def delete_route_url(chat_id: str, url: str):
    """
    Deletes a specific webhook URL for a chat ID.

    Args:
        chat_id (str): The chat ID.
        url (str): The webhook URL to delete.

    Returns:
        dict: A message indicating the URL was removed.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    if chat_id not in config["routes"]:
        raise HTTPException(status_code=404, detail="Chat ID not found")
    
    target_urls = config["routes"][chat_id]
    if url not in target_urls:
        raise HTTPException(status_code=404, detail="URL not found for the given Chat ID")
    
    target_urls.remove(url)
    if not target_urls:  # If no URLs remain, remove the chat_id entirely
        del config["routes"][chat_id]

    # Save updated config to file
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)

    return {"message": "URL removed from route"}

@app.put("/routes/{chat_id}/name")
def update_card_name(chat_id: str, name_update: CardNameUpdate):
    """
    Updates only the name/title of a card.

    Args:
        chat_id (str): The chat ID.
        name_update (CardNameUpdate): The new name for the card.

    Returns:
        dict: A message indicating the name was updated.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    if chat_id not in config["routes"]:
        raise HTTPException(status_code=404, detail="Route not found")
    
    route_data = config["routes"][chat_id]
    
    # Handle both legacy and new format
    if isinstance(route_data, list):
        # Legacy format: convert to new format
        config["routes"][chat_id] = {
            "name": name_update.name,
            "target_urls": route_data
        }
    elif isinstance(route_data, dict):
        # New format: update name
        config["routes"][chat_id]["name"] = name_update.name
    else:
        # Single URL format: convert to new format
        config["routes"][chat_id] = {
            "name": name_update.name,
            "target_urls": [route_data] if isinstance(route_data, str) else []
        }

    # Save updated config to file
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)

    return {"message": "Card name updated"}

@app.get("/execution_counts")
def get_execution_logs():
    """
    Retrieves the execution counts for all webhooks.
    This endpoint is kept for compatibility but returns empty data.

    Returns:
        list[dict]: An empty list since we're not tracking executions.
    """
    return []

@app.get("/settings")
def get_settings():
    """
    Retrieves the general settings (instance_id and token).

    Returns:
        dict: The current general settings.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    return config["green_api"]

@app.post("/settings")
def update_settings(settings: SettingsUpdate):
    """
    Updates the general settings (instance_id and token).

    Args:
        settings (SettingsUpdate): The new settings data.

    Returns:
        dict: A message indicating the settings were updated.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    config["green_api"]["instance_id"] = settings.instance_id
    config["green_api"]["token"] = settings.token

    # Save updated config to file
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)

    return {"message": "Settings updated"}

@app.get("/health")
def health_check():
    """
    Simple health check endpoint for monitoring server status.
    
    Returns:
        dict: Server status information.
    """
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "message": "Server is running"
    }

def is_running_in_docker():
    """
    Detect if the application is running inside a Docker container.
    """
    try:
        # Check for Docker-specific files
        if os.path.exists('/.dockerenv'):
            return True
        
        # Check cgroup for Docker
        with open('/proc/1/cgroup', 'r') as f:
            return 'docker' in f.read().lower()
    except:
        return False

@app.post("/restart")
def restart_bot():
    """
    Restarts only the bot component while keeping the web server running.
    """
    def perform_restart():
        # Give time for the response to be sent
        time.sleep(1.0)
        
        # Import here to avoid circular import
        import app as main_app
        main_app.restart_bot_component()
    
    # Start restart in background thread
    threading.Timer(0.5, perform_restart).start()
    
    return {"message": "Bot restart initiated (web server remains running)"}
