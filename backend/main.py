from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes.auth import router as auth_router
from routes.scan import router as scan_router
from routes.history import router as history_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SecureScan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)

app.include_router(auth_router)
app.include_router(scan_router)
app.include_router(history_router)

@app.get("/")
def root():
    return {"message": "SecureScan API is running"}