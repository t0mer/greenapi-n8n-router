from whatsapp_chatbot_python import GreenAPIBot, Notification
from config_loader import load_config, ensure_config
from config_watcher import start_config_watcher
from logger import update_execution_count, get_execution_counts
from loguru import logger
import httpx, asyncio
from threading import Thread
from web_manager import app  # Import FastAPI app
import uvicorn
from typing import Dict, List
import sys  # For exiting the application on critical errors
import time  # For keeping the main thread alive
from shared_resources import sqlite_handler  # Import sqlite_handler from shared_resources

CONFIG_PATH = "config/config.yaml"

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
    logger.info("🔁 Config reloaded")

start_config_watcher(CONFIG_PATH, reload_config)

# 🟢 Init bot
try:
    bot = GreenAPIBot(
        config["green_api"]["instance_id"],
        config["green_api"]["token"]
    )
except Exception as e:
    logger.critical(f"❌ Failed to initialize GreenAPIBot: {e}")
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
        logger.warning(f"🚫 No routes for chatId: {chat_id}")
        return

    logger.info(f"➡️ Forwarding from {chat_id} to {len(target_urls)} webhook(s)")

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
                update_execution_count(chat_id, url)  # Update execution count only for existing routes
                logger.success(f"✅ Forwarded to {url}")
            except Exception as e:
                logger.error(f"❌ Error forwarding to {url}: {e}")

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
