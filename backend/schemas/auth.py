from typing import Literal
from pydantic import BaseModel, Field, field_validator

class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return cleaned

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if "@" not in cleaned or "." not in cleaned:
            raise ValueError("Please provide a valid email address")
        return cleaned

class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def clean_login_email(cls, v: str) -> str:
        return v.strip().lower()

class DemoLoginIn(BaseModel):
    role: Literal["citizen", "admin", "worker"] = "citizen"

class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    avatar_url: str | None = None
    points: int = 0
    badge_level: str = "Bronze Scout"
    model_config = {"from_attributes": True}

class AuthOut(BaseModel):
    access_token: str
    user: UserOut

class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=1000000) # Supports avatar preset id or data URI

class ForgotPasswordIn(BaseModel):
    email: str = Field(min_length=3, max_length=120)

    @field_validator("email")
    @classmethod
    def clean_forgot_email(cls, v: str) -> str:
        return v.strip().lower()

class ResetPasswordIn(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    otp: str
    new_password: str

    @field_validator("email")
    @classmethod
    def clean_reset_email(cls, v: str) -> str:
        return v.strip().lower()

class PhoneSendOtpIn(BaseModel):
    phone: str = Field(min_length=10, max_length=20)

class PhoneVerifyOtpIn(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    otp: str = Field(min_length=4, max_length=10)
    full_name: str | None = None