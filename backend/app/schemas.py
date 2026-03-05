from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class EmployeeCreate(BaseModel):
    employee_id: str = Field(min_length=2, max_length=50)
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    department: str = Field(min_length=2, max_length=80)

    @field_validator("employee_id", "full_name", "department", mode="before")
    @classmethod
    def strip_text(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip()
        return value


class EmployeeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: str
    full_name: str
    email: EmailStr
    department: str
    created_at: datetime
    total_present_days: int = 0


class AttendanceCreate(BaseModel):
    employee_id: str = Field(min_length=2, max_length=50)
    date: date
    status: str

    @field_validator("employee_id", mode="before")
    @classmethod
    def strip_employee_id(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().capitalize()
        if normalized not in {"Present", "Absent"}:
            raise ValueError("Status must be Present or Absent")
        return normalized


class AttendanceRead(BaseModel):
    id: int
    employee_id: str
    full_name: str
    date: date
    status: str
    marked_at: datetime


class DashboardSummary(BaseModel):
    total_employees: int
    total_attendance_records: int
    present_today: int
    absent_today: int


class DeleteResponse(BaseModel):
    message: str