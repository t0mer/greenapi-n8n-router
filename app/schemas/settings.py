from pydantic import BaseModel, model_serializer


class SettingsUpdate(BaseModel):
    instance_id: str
    token: str


class SettingsResponse(BaseModel):
    instance_id: str
    token: str

    @model_serializer
    def serialize(self) -> dict:
        return {
            "instance_id": self.instance_id,
            "token": "••••••••" if self.token else "",
        }
