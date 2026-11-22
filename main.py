from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI(title="Fest CRUD API", description="Student records with validated CRUD routes", version="2.0.0")

students = [
    {"id": 1, "name": "Asha Rao", "course": "Python"},
    {"id": 2, "name": "Rahul Das", "course": "Web Development"},
    {"id": 3, "name": "Meera Shah", "course": "FastAPI"},
]


@app.get("/", tags=["Home"])
def home():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/students", tags=["Students"])
def get_students():
    return students


@app.get("/students/{student_id}", tags=["Students"])
def get_student(student_id: int):
    for student in students:
        if student["id"] == student_id:
            return student
    raise HTTPException(status_code=404, detail="Student not found")

class StudentInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=1)
    course: str = Field(min_length=1)
    email: str = ""


class Student(StudentInput):
    id: int


next_student_id = 4


@app.post("/students", response_model=Student, status_code=201, tags=["Students"])
def create_student(student: StudentInput):
    global next_student_id
    record = {"id": next_student_id, **student.model_dump()}
    next_student_id += 1
    students.append(record)
    return record


@app.put("/students/{student_id}", response_model=Student, tags=["Students"])
def update_student(student_id: int, student: StudentInput):
    record = get_student(student_id)
    record.update(student.model_dump())
    return record


@app.delete("/students/{student_id}", status_code=204, tags=["Students"])
def delete_student(student_id: int):
    students.remove(get_student(student_id))
    return Response(status_code=204)

from datetime import date
from fastapi.encoders import jsonable_encoder


class EventInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=1)
    date: date
    venue: str = Field(min_length=1)


class Event(EventInput):
    id: int


events = []
next_record_id = 1


@app.get("/events", response_model=list[Event])
def list_records():
    return events


@app.get("/events/{record_id}", response_model=Event)
def get_record(record_id: int):
    for record in events:
        if record["id"] == record_id:
            return record
    raise HTTPException(status_code=404, detail="Event not found")


@app.post("/events", response_model=Event, status_code=201)
def create_record(item: EventInput):
    global next_record_id
    record = {"id": next_record_id, **jsonable_encoder(item)}
    next_record_id += 1
    events.append(record)
    return record


@app.put("/events/{record_id}", response_model=Event)
def update_record(record_id: int, item: EventInput):
    record = get_record(record_id)
    record.update(jsonable_encoder(item))
    return record


@app.delete("/events/{record_id}", status_code=204)
def delete_record(record_id: int):
    events.remove(get_record(record_id))
    return Response(status_code=204)

from pathlib import Path
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).resolve().parent


@app.get("/app.js", include_in_schema=False)
def javascript():
    return FileResponse(BASE_DIR / "app.js", media_type="text/javascript")


@app.get("/style.css", include_in_schema=False)
def stylesheet():
    return FileResponse(BASE_DIR / "style.css", media_type="text/css")
