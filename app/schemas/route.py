import urllib.parse

from pydantic import AnyHttpUrl, BaseModel, field_validator
from pydantic import ValidationError as PydanticValidationError
from typing import Optional


def _validate_urls(v: list[str]) -> list[str]:
    if not v:
        raise ValueError("At least one webhook URL is required")
    validated = []
    for i, url in enumerate(v):
        url = url.strip()
        if not url:
            raise ValueError(f"URL {i + 1} cannot be empty")
        try:
            AnyHttpUrl(url)
        except (ValueError, PydanticValidationError):
            raise ValueError(f"URL {i + 1} must be a valid http:// or https:// URL")
        # AnyHttpUrl can normalise malformed paths into hosts (e.g. http:///foo ->
        # http://foo/). Reject anything whose netloc is empty after strict parsing.
        if not urllib.parse.urlparse(url).netloc:
            raise ValueError(f"URL {i + 1} must be a valid http:// or https:// URL")
        validated.append(url)
    if len(set(validated)) != len(validated):
        raise ValueError("Duplicate URLs are not allowed")
    return validated


class RouteCreate(BaseModel):
    chat_id: str
    target_urls: list[str]
    name: Optional[str] = None

    @field_validator("target_urls")
    @classmethod
    def validate_urls(cls, v: list[str]) -> list[str]:
        return _validate_urls(v)


class RouteUpdate(BaseModel):
    target_urls: list[str]
    name: Optional[str] = None

    @field_validator("target_urls")
    @classmethod
    def validate_urls(cls, v: list[str]) -> list[str]:
        return _validate_urls(v)


class CardNameUpdate(BaseModel):
    name: str


class RouteData(BaseModel):
    name: str
    target_urls: list[str]


class RoutesListResponse(BaseModel):
    routes: dict[str, RouteData]
