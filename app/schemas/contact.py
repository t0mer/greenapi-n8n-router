from pydantic import BaseModel


class Contact(BaseModel):
    id: str
    name: str
    display_text: str


class ContactsResponse(BaseModel):
    contacts: list[Contact]
    cached: bool = False


class ContactSearchResponse(BaseModel):
    contacts: list[Contact]
    total: int
    cached: bool = False
