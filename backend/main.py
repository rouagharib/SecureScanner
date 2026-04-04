from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import connect_db, close_db
from routes.auth import router as auth_router
from routes.scan import router as scan_router
from routes.history import router as history_router

app = FastAPI(title="SecureScan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

app.include_router(auth_router)
app.include_router(scan_router)
app.include_router(history_router)

@app.get("/")
def root():
    return {"message": "SecureScan API is running"}