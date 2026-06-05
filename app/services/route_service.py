import yaml
from config_loader import load_config
from core.config import settings


class RouteService:
    def get_all(self) -> dict:
        return load_config(settings.config_path).get("routes", {})

    def get_one(self, chat_id: str) -> dict | None:
        return self.get_all().get(chat_id)

    def exists(self, chat_id: str) -> bool:
        return chat_id in self.get_all()

    def create(self, chat_id: str, name: str, target_urls: list[str]) -> None:
        config = load_config(settings.config_path)
        config["routes"][chat_id] = {"name": name, "target_urls": target_urls}
        self._save(config)

    def update(self, chat_id: str, target_urls: list[str], name: str | None = None) -> None:
        config = load_config(settings.config_path)
        existing = config["routes"].get(chat_id, {})
        if isinstance(existing, dict):
            existing_name = existing.get("name", chat_id)
        else:
            existing_name = chat_id
        config["routes"][chat_id] = {
            "name": name if name else existing_name,
            "target_urls": target_urls,
        }
        self._save(config)

    def rename(self, chat_id: str, name: str) -> None:
        config = load_config(settings.config_path)
        route = config["routes"][chat_id]
        if isinstance(route, dict):
            config["routes"][chat_id]["name"] = name
        elif isinstance(route, list):
            config["routes"][chat_id] = {"name": name, "target_urls": route}
        else:
            config["routes"][chat_id] = {"name": name, "target_urls": [route]}
        self._save(config)

    def delete(self, chat_id: str) -> None:
        config = load_config(settings.config_path)
        if chat_id not in config.get("routes", {}):
            raise KeyError(f"Route '{chat_id}' not found")
        del config["routes"][chat_id]
        self._save(config)

    def _save(self, config: dict) -> None:
        with open(settings.config_path, "w") as f:
            yaml.dump(config, f)
