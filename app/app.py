from whatsapp_chatbot_python import GreenAPIBot, Notification
from config_loader import load_config, ensure_config
from config_watcher import start_config_watcher
from loguru import logger
import httpx, asyncio
from typing import Dict, List

CONFIG_PATH = "config/config.yaml"

ensure_config(CONFIG_PATH)  # 🛡️ Ensure file exists

config: Dict[str, Dict[str, List[str]]] = load_config(CONFIG_PATH)

def reload_config(new_config: Dict[str, Dict[str, List[str]]]) -> None:
    global config
    config = new_config
    logger.info("🔁 Config reloaded")

start_config_watcher(CONFIG_PATH, reload_config)

# 🟢 Init bot
bot = GreenAPIBot(
    config["green_api"]["instance_id"],
    config["green_api"]["token"]
)

@bot.router.message()
def route_handler(notification: Notification) -> None:
    chat_id = notification.event["senderData"]["chatId"]
    routes = config.get("routes", {})
    target_urls = routes.get(chat_id)

    if not target_urls:
        logger.warning(f"🚫 No routes for chatId: {chat_id}")
        return

    logger.info(f"➡️ Forwarding from {chat_id} to {len(target_urls)} webhook(s)")

    async def forward(url: str):
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
                logger.success(f"✅ Forwarded to {url}")
            except Exception as e:
                logger.error(f"❌ Error forwarding to {url}: {e}")

    for url in target_urls:
        asyncio.run(forward(url))

bot.run_forever()
