from whatsapp_chatbot_python import GreenAPIBot, Notification
from config_loader import load_config, ensure_config
from config_watcher import start_config_watcher
from loguru import logger
import httpx, asyncio
from threading import Thread
from web_manager import app  # Import FastAPI app
import uvicorn
from typing import Dict, List
import sys  # For exiting the application on critical errors
import time  # For keeping the main thread alive
from fastapi import WebSocket, WebSocketDisconnect
import json
from datetime import datetime
import concurrent.futures
# from shared_resources import sqlite_handler  # Import sqlite_handler from shared_resources

CONFIG_PATH = "config/config.yaml"

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.loop = None

    def set_loop(self, loop):
        self.loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_log(self, message: str, level: str = "info"):
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message
        }
        if self.active_connections:
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(json.dumps(log_data))
                except:
                    disconnected.append(connection)
            
            # Remove disconnected clients
            for conn in disconnected:
                self.active_connections.remove(conn)

    def safe_broadcast_log(self, message: str, level: str = "info"):
        """Thread-safe method to broadcast logs"""
        if self.loop and not self.loop.is_closed():
            try:
                if self.active_connections:  # Only schedule if there are connections
                    asyncio.run_coroutine_threadsafe(
                        self.broadcast_log(message, level), 
                        self.loop
                    )
            except Exception as e:
                # Silently ignore WebSocket broadcast errors
                pass

manager = ConnectionManager()

# Add WebSocket endpoint to FastAPI app
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    # Set the event loop for the manager when first WebSocket connects
    if manager.loop is None:
        manager.loop = asyncio.get_event_loop()
    
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)

ensure_config(CONFIG_PATH)  # 🛡️ Ensure file exists

config: Dict[str, Dict[str, List[str]]] = load_config(CONFIG_PATH)

def reload_config(new_config: Dict[str, Dict[str, List[str]]]) -> None:
    """
    Reloads the configuration and updates the global config variable.

    Args:
        new_config (Dict[str, Dict[str, List[str]]]): The new configuration to load.
    """
    global config
    config = new_config
    log_message = "🔁 Config reloaded"
    logger.info(log_message)
    manager.safe_broadcast_log(log_message, "info")

start_config_watcher(CONFIG_PATH, reload_config)

# 🟢 Init bot
try:
    bot = GreenAPIBot(
        config["green_api"]["instance_id"],
        config["green_api"]["token"]
    )
    log_message = f"🟢 Bot initialized successfully with instance {config['green_api']['instance_id']}"
    logger.info(log_message)
    manager.safe_broadcast_log(log_message, "success")
except Exception as e:
    log_message = f"❌ Failed to initialize GreenAPIBot: {e}"
    logger.critical(log_message)
    manager.safe_broadcast_log(log_message, "error")
    sys.exit(1)  # Exit the application if bot initialization fails

@bot.router.message()
def route_handler(notification: Notification) -> None:
    """
    Handles incoming messages and forwards them to the appropriate webhooks.

    Args:
        notification (Notification): The incoming message notification.
    """
    chat_id = notification.event["senderData"]["chatId"]
    routes = config.get("routes", {})
    target_urls = routes.get(chat_id)

    if not target_urls:
        log_message = f"🚫 No routes for chatId: {chat_id}"
        logger.warning(log_message)
        manager.safe_broadcast_log(log_message, "warning")
        return

    log_message = f"➡️ Forwarding from {chat_id} to {len(target_urls)} webhook(s)"
    logger.info(log_message)
    manager.safe_broadcast_log(log_message, "info")

    async def forward(url: str):
        """
        Sends the notification payload to the specified webhook URL.

        Args:
            url (str): The webhook URL to forward the payload to.
        """
        async with httpx.AsyncClient() as client:
            try:
                await client.post(
                    url,
                    json={
                        "chatId": chat_id,
                        "payload": notification.event
                    },
                    timeout=5.0
                )
                success_message = f"✅ Forwarded to {url}"
                logger.success(success_message)
                manager.safe_broadcast_log(success_message, "success")
            except Exception as e:
                error_message = f"❌ Error forwarding to {url}: {e}"
                logger.error(error_message)
                manager.safe_broadcast_log(error_message, "error")

    for url in target_urls:
        asyncio.run(forward(url))

def run_web_manager():
    """
    Starts the FastAPI web server using Uvicorn.
    """
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)
    server.run()  # Start the server properly

# Run bot and web manager in separate threads
Thread(target=bot.run_forever, daemon=True).start()
Thread(target=run_web_manager, daemon=True).start()

# Keep the main thread alive
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    logger.info("🛑 Shutting down...")
