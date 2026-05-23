from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://lookout:lookout@db:5432/lookout"
    redis_url: str = "redis://redis:6379/0"
    cors_origins: str = "http://localhost:3000"
    ingest_interval_hours: int = 6
    feed_secret_key: str = ""
    seed_on_empty: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
