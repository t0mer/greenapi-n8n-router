import httpx
from datetime import datetime
from config_loader import load_config
from core.config import settings


class ContactsService:
    def __init__(self) -> None:
        self._cache: list[dict] | None = None
        self._cache_time: datetime | None = None
        self._cache_ttl = 300  # seconds

    def is_cache_valid(self) -> bool:
        if self._cache_time is None or self._cache is None:
            return False
        return (datetime.now() - self._cache_time).total_seconds() < self._cache_ttl

    def _get_credentials(self) -> tuple[str, str, str]:
        config = load_config(settings.config_path)
        ga = config["green_api"]
        instance_id = ga.get("instance_id", "").strip()
        token = ga.get("token", "").strip()
        api_url = ga.get("api_url", "https://api.green-api.com").strip().rstrip("/")
        if not instance_id or not token:
            raise ValueError("Green API credentials not configured")
        return instance_id, token, api_url

    async def get_contacts(self) -> tuple[list[dict], bool]:
        if self.is_cache_valid() and self._cache is not None:
            return self._cache, True
        instance_id, token, api_url = self._get_credentials()
        contacts = await self._fetch(instance_id, token, api_url)
        self._cache = contacts
        self._cache_time = datetime.now()
        return contacts, False

    async def _fetch(self, instance_id: str, token: str, api_url: str) -> list[dict]:
        url = f"{api_url}/waInstance{instance_id}/getContacts/{token}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
        response.raise_for_status()
        raw = response.json()
        contacts = []
        for c in raw:
            cid = c.get("id", "")
            name = c.get("name", cid)
            if cid:
                contacts.append({
                    "id": cid,
                    "name": name,
                    "display_text": f"{name} ({cid})" if name != cid else cid,
                })
        contacts.sort(key=lambda x: x["name"].lower())
        return contacts

    def search(self, contacts: list[dict], query: str) -> list[dict]:
        q = query.lower().strip()
        filtered = [
            c for c in contacts
            if q in c["name"].lower()
            or q in c["id"].lower()
            or q in c["display_text"].lower()
        ]

        def relevance(c: dict) -> int:
            if c["name"].lower() == q or c["id"].lower() == q:
                return 0
            if c["name"].lower().startswith(q) or c["id"].lower().startswith(q):
                return 1
            return 2

        filtered.sort(key=relevance)
        return filtered[:20]


# Module-level singleton so cache persists across requests
contacts_service = ContactsService()
