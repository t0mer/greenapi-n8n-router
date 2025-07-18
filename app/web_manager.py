from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from config_loader import load_config, ensure_config
from pydantic import BaseModel
import yaml
import os

CONFIG_PATH = "config/config.yaml"

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
# Ensure config file exists
ensure_config(CONFIG_PATH)

# Load initial config
config = load_config(CONFIG_PATH)

templates = Jinja2Templates(directory="templates")

class RouteUpdate(BaseModel):
    chat_id: str
    target_urls: list[str]

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
def update_settings(instance_id: str, token: str):
    """
    Updates the general settings (instance_id and token).

    Args:
        instance_id (str): The new instance ID.
        token (str): The new token.

    Returns:
        dict: A message indicating the settings were updated.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    config["green_api"]["instance_id"] = instance_id
    config["green_api"]["token"] = token

    # Save updated config to file
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)

    return {"message": "Settings updated"}

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
def add_route(chat_id: str, target_urls: list[str]):
    """
    Adds a new route for a chat ID.

    Args:
        chat_id (str): The chat ID.
        target_urls (list[str]): List of webhook URLs.

    Returns:
        dict: A message indicating the route was added.
    """
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    if chat_id in config["routes"]:
        raise HTTPException(status_code=400, detail="Route already exists")
    config["routes"][chat_id] = target_urls

    # Save updated config to file
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)

    return {"message": "Route added"}

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
    # Reload config to get latest data
    global config
    config = load_config(CONFIG_PATH)
    
    if chat_id not in config["routes"]:
        raise HTTPException(status_code=404, detail="Route not found")
    
    config["routes"][chat_id] = route_update.target_urls

    # Save updated config to file
    with open(CONFIG_PATH, "w") as f:
        yaml.dump(config, f)

    return {"message": "Route updated"}

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

@app.get("/execution_counts")
def get_execution_logs():
    """
    Retrieves the execution counts for all webhooks.

    Returns:
        list[dict]: A list of execution counts for each webhook.
    """
    return []
