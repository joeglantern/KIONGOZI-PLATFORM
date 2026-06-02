from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from routers import inputs, funds, advocacy


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Kiongozi Youth Platform API",
    description="Youth Input Gathering, Fund Tracking & Policy Advocacy Tools",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "https://kiongozi.org", "https://chat.kiongozi.org"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inputs.router, prefix="/api/v1")
app.include_router(funds.router, prefix="/api/v1")
app.include_router(advocacy.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "service": "Kiongozi Platform API"}
