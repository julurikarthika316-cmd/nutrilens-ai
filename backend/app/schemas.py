from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional

class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    age: Optional[int] = Field(default=None, ge=1, le=120)
    height_cm: Optional[float] = Field(default=None, ge=30, le=260)
    weight_kg: Optional[float] = Field(default=None, ge=2, le=500)
    conditions: list[str] = []
    allergies: list[str] = []
    dietary_preferences: list[str] = []
    sugar_daily_reference_g: float = Field(default=50.0, gt=0, le=500)

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    age: Optional[int]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    conditions: list[str]
    allergies: list[str]
    dietary_preferences: list[str]
    sugar_daily_reference_g: float
    model_config = ConfigDict(from_attributes=True)
