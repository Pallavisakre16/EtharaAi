from __future__ import annotations

import os
from datetime import date

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, engine, get_db

app = FastAPI(title="HRMS Lite API", version="1.0.0")

raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"message": "Validation failed", "errors": exc.errors()},
    )


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/employees", response_model=schemas.EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee(payload: schemas.EmployeeCreate, db: Session = Depends(get_db)) -> schemas.EmployeeRead:
    existing_by_id = db.scalar(
        select(models.Employee).where(models.Employee.employee_id == payload.employee_id)
    )
    if existing_by_id:
        raise HTTPException(status_code=409, detail="Employee ID already exists")

    existing_by_email = db.scalar(select(models.Employee).where(models.Employee.email == payload.email))
    if existing_by_email:
        raise HTTPException(status_code=409, detail="Email already exists")

    employee = models.Employee(
        employee_id=payload.employee_id,
        full_name=payload.full_name,
        email=payload.email,
        department=payload.department,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    return schemas.EmployeeRead.model_validate(employee)


@app.get("/api/employees", response_model=list[schemas.EmployeeRead])
def list_employees(db: Session = Depends(get_db)) -> list[schemas.EmployeeRead]:
    present_counts = (
        select(models.Attendance.employee_fk, func.count(models.Attendance.id).label("present_count"))
        .where(models.Attendance.status == "Present")
        .group_by(models.Attendance.employee_fk)
        .subquery()
    )

    query = (
        select(models.Employee, func.coalesce(present_counts.c.present_count, 0).label("present_count"))
        .outerjoin(present_counts, models.Employee.id == present_counts.c.employee_fk)
        .order_by(models.Employee.full_name.asc())
    )

    rows = db.execute(query).all()
    results: list[schemas.EmployeeRead] = []
    for employee, present_count in rows:
        employee_data = schemas.EmployeeRead.model_validate(employee)
        employee_data.total_present_days = int(present_count)
        results.append(employee_data)
    return results


@app.delete(
    "/api/employees/{employee_id}",
    response_model=schemas.DeleteResponse,
    status_code=status.HTTP_200_OK,
)
def delete_employee(employee_id: str, db: Session = Depends(get_db)) -> schemas.DeleteResponse:
    employee = db.scalar(select(models.Employee).where(models.Employee.employee_id == employee_id))
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.delete(employee)
    db.commit()
    return schemas.DeleteResponse(message="Employee deleted successfully")


@app.post(
    "/api/attendance",
    response_model=schemas.AttendanceRead,
    status_code=status.HTTP_201_CREATED,
)
def mark_attendance(payload: schemas.AttendanceCreate, db: Session = Depends(get_db)) -> schemas.AttendanceRead:
    employee = db.scalar(
        select(models.Employee).where(models.Employee.employee_id == payload.employee_id)
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    duplicate = db.scalar(
        select(models.Attendance).where(
            models.Attendance.employee_fk == employee.id,
            models.Attendance.date == payload.date,
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Attendance already marked for this date")

    attendance = models.Attendance(employee_fk=employee.id, date=payload.date, status=payload.status)
    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return schemas.AttendanceRead(
        id=attendance.id,
        employee_id=employee.employee_id,
        full_name=employee.full_name,
        date=attendance.date,
        status=attendance.status,
        marked_at=attendance.marked_at,
    )


@app.get("/api/attendance", response_model=list[schemas.AttendanceRead])
def list_attendance(
    employee_id: str | None = Query(default=None),
    date_filter: date | None = Query(default=None, alias="date"),
    db: Session = Depends(get_db),
) -> list[schemas.AttendanceRead]:
    query = (
        select(
            models.Attendance.id,
            models.Employee.employee_id,
            models.Employee.full_name,
            models.Attendance.date,
            models.Attendance.status,
            models.Attendance.marked_at,
        )
        .join(models.Employee, models.Attendance.employee_fk == models.Employee.id)
        .order_by(models.Attendance.date.desc(), models.Employee.full_name.asc())
    )

    if employee_id:
        query = query.where(models.Employee.employee_id == employee_id.strip())
    if date_filter:
        query = query.where(models.Attendance.date == date_filter)

    rows = db.execute(query).all()
    return [schemas.AttendanceRead(**row._mapping) for row in rows]


@app.get("/api/employees/{employee_id}/attendance", response_model=list[schemas.AttendanceRead])
def attendance_by_employee(employee_id: str, db: Session = Depends(get_db)) -> list[schemas.AttendanceRead]:
    query = (
        select(
            models.Attendance.id,
            models.Employee.employee_id,
            models.Employee.full_name,
            models.Attendance.date,
            models.Attendance.status,
            models.Attendance.marked_at,
        )
        .join(models.Employee, models.Attendance.employee_fk == models.Employee.id)
        .where(models.Employee.employee_id == employee_id)
        .order_by(models.Attendance.date.desc())
    )

    rows = db.execute(query).all()
    return [schemas.AttendanceRead(**row._mapping) for row in rows]


@app.get("/api/dashboard/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> schemas.DashboardSummary:
    today = date.today()
    total_employees = db.scalar(select(func.count(models.Employee.id))) or 0
    total_attendance_records = db.scalar(select(func.count(models.Attendance.id))) or 0
    present_today = (
        db.scalar(
            select(func.count(models.Attendance.id)).where(
                models.Attendance.date == today,
                models.Attendance.status == "Present",
            )
        )
        or 0
    )
    absent_today = (
        db.scalar(
            select(func.count(models.Attendance.id)).where(
                models.Attendance.date == today,
                models.Attendance.status == "Absent",
            )
        )
        or 0
    )

    return schemas.DashboardSummary(
        total_employees=int(total_employees),
        total_attendance_records=int(total_attendance_records),
        present_today=int(present_today),
        absent_today=int(absent_today),
    )
