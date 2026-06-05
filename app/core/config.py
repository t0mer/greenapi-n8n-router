from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    config_path: str = "config/config.yaml"
    log_level: str = "info"
    port: int = 8000
    app_version: str = "dev"

    model_config = SettingsConfigDict(env_prefix="ROUTER_")


settings = Settings()
