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
        if (websocket in self.active_connections):
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

# Global bot reference
bot = None
bot_thread = None

def initialize_bot():
    """Initialize the bot with current configuration."""
    global bot, config
    
    # Check if credentials are configured
    instance_id = config["green_api"].get("instance_id", "").strip()
    token = config["green_api"].get("token", "").strip()

    if instance_id and token:
        try:
            new_bot = GreenAPIBot(instance_id, token)
            
            @new_bot.router.message()
            def route_handler(notification: Notification) -> None:
                """
                Handles incoming messages and forwards them to the appropriate webhooks.

                Args:
                    notification (Notification): The incoming message notification.
                """
                chat_id = notification.event["senderData"]["chatId"]
                routes = config.get("routes", {})
                route_data = routes.get(chat_id)

                if not route_data:
                    log_message = f"🚫 No routes for chatId: {chat_id}"
                    logger.warning(log_message)
                    manager.safe_broadcast_log(log_message, "warning")
                    return

                # Handle both legacy and new format
                if isinstance(route_data, list):
                    # Legacy format: [urls...]
                    target_urls = route_data
                    route_name = chat_id
                elif isinstance(route_data, dict):
                    # New format: {name, target_urls}
                    target_urls = route_data.get("target_urls", [])
                    route_name = route_data.get("name", chat_id)
                elif isinstance(route_data, str):
                    # Single URL format
                    target_urls = [route_data]
                    route_name = chat_id
                else:
                    target_urls = []
                    route_name = chat_id

                if not target_urls:
                    log_message = f"🚫 No webhook URLs configured for {route_name} ({chat_id})"
                    logger.warning(log_message)
                    manager.safe_broadcast_log(log_message, "warning")
                    return

                log_message = f"➡️ Forwarding from {route_name} ({chat_id}) to {len(target_urls)} webhook(s)"
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
            
            log_message = f"🟢 Bot initialized successfully with instance {instance_id}"
            logger.info(log_message)
            manager.safe_broadcast_log(log_message, "success")
            return new_bot
            
        except Exception as e:
            log_message = f"❌ Failed to initialize GreenAPIBot: {e}"
            logger.critical(log_message)
            manager.safe_broadcast_log(log_message, "error")
            return None
    else:
        log_message = "⚠️ Bot not started - Instance ID and Token not configured. Use Settings to configure."
        logger.warning(log_message)
        manager.safe_broadcast_log(log_message, "warning")
        return None

def start_bot_thread(bot_instance):
    """Start the bot in a separate thread."""
    if bot_instance:
        thread = Thread(target=bot_instance.run_forever, daemon=True)
        thread.start()
        return thread
    return None

def restart_bot_component():
    """Restart only the bot component."""
    global bot, bot_thread
    
    log_message = "🔄 Restarting bot component..."
    logger.info(log_message)
    manager.safe_broadcast_log(log_message, "info")
    
    # Stop existing bot if running
    if bot:
        try:
            log_message = "🛑 Stopping existing bot instance..."
            logger.info(log_message)
            manager.safe_broadcast_log(log_message, "info")
            
            # Set bot to None to stop processing new messages
            bot = None
            bot_thread = None
            
            # Give a moment for any ongoing operations to complete
            time.sleep(1)
            
        except Exception as e:
            log_message = f"⚠️ Error stopping bot: {e}"
            logger.warning(log_message)
            manager.safe_broadcast_log(log_message, "warning")
    
    # Small delay to ensure clean shutdown
    time.sleep(0.5)
    
    # Reload configuration
    global config
    try:
        config = load_config(CONFIG_PATH)
        log_message = "📁 Configuration reloaded"
        logger.info(log_message)
        manager.safe_broadcast_log(log_message, "info")
    except Exception as e:
        log_message = f"❌ Failed to reload config: {e}"
        logger.error(log_message)
        manager.safe_broadcast_log(log_message, "error")
        return
    
    # Initialize new bot with updated config
    try:
        bot = initialize_bot()
        bot_thread = start_bot_thread(bot)
        
        if bot:
            log_message = "✅ Bot restarted successfully"
            logger.info(log_message)
            manager.safe_broadcast_log(log_message, "success")
        else:
            log_message = "❌ Bot restart failed or bot not configured"
            logger.error(log_message)
            manager.safe_broadcast_log(log_message, "error")
            
    except Exception as e:
        log_message = f"❌ Error during bot restart: {e}"
        logger.error(log_message)
        manager.safe_broadcast_log(log_message, "error")

def reload_config(new_config: Dict[str, Dict[str, List[str]]]) -> None:
    """
    Reloads the configuration and restarts the bot if credentials changed.

    Args:
        new_config (Dict[str, Dict[str, List[str]]]): The new configuration to load.
    """
    global config
    old_instance_id = config["green_api"].get("instance_id", "").strip()
    old_token = config["green_api"].get("token", "").strip()
    
    config = new_config
    
    new_instance_id = config["green_api"].get("instance_id", "").strip()
    new_token = config["green_api"].get("token", "").strip()
    
    # Check if credentials changed
    if old_instance_id != new_instance_id or old_token != new_token:
        log_message = "🔧 Bot credentials changed, restarting bot..."
        logger.info(log_message)
        manager.safe_broadcast_log(log_message, "info")
        restart_bot_component()
    else:
        log_message = "🔁 Config reloaded (routes updated)"
        logger.info(log_message)
        manager.safe_broadcast_log(log_message, "info")

start_config_watcher(CONFIG_PATH, reload_config)

def run_web_manager():
    """
    Starts the FastAPI web server using Uvicorn.
    """
    try:
        config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
        server = uvicorn.Server(config)
        server.run()
    except OSError as e:
        if "address already in use" in str(e).lower():
            log_message = "⚠️ Port 8000 already in use - web server may already be running"
            logger.warning(log_message)
            manager.safe_broadcast_log(log_message, "warning")
        else:
            log_message = f"❌ Failed to start web server: {e}"
            logger.error(log_message)
            manager.safe_broadcast_log(log_message, "error")
    except Exception as e:
        log_message = f"❌ Unexpected error starting web server: {e}"
        logger.error(log_message)
        manager.safe_broadcast_log(log_message, "error")

# Check if we should start the web server (avoid starting if already running)
def is_port_in_use(port):
    """Check if a port is already in use."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('0.0.0.0', port))
            return False
        except OSError:
            return True

# Initialize bot
bot = initialize_bot()
bot_thread = start_bot_thread(bot)

# Only start web server if port is available
if not is_port_in_use(8000):
    Thread(target=run_web_manager, daemon=True).start()
    log_message = "🌐 Web server starting on port 8000"
    logger.info(log_message)
    manager.safe_broadcast_log(log_message, "info")
else:
    log_message = "⚠️ Port 8000 already in use - assuming web server is already running"
    logger.warning(log_message)
    manager.safe_broadcast_log(log_message, "warning")

# Keep the main thread alive
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    logger.info("🛑 Shutting down...")
