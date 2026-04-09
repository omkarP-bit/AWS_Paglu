from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal
import models
from api import router as api_router
from typing import List
from contextlib import asynccontextmanager

def populate_blood_compat():
    db = SessionLocal()
    if db.query(models.BloodCompatibility).count() == 0:
        compat_map = [
            ("O+", "O+"), ("O+", "A+"), ("O+", "B+"), ("O+", "AB+"),
            ("O-", "O-"), ("O-", "O+"), ("O-", "A-"), ("O-", "A+"), ("O-", "B-"), ("O-", "B+"), ("O-", "AB-"), ("O-", "AB+"),
            ("A+", "A+"), ("A+", "AB+"),
            ("A-", "A-"), ("A-", "A+"), ("A-", "AB-"), ("A-", "AB+"),
            ("B+", "B+"), ("B+", "AB+"),
            ("B-", "B-"), ("B-", "B+"), ("B-", "AB-"), ("B-", "AB+"),
            ("AB+", "AB+"),
            ("AB-", "AB-"), ("AB-", "AB+")
        ]
        for donor, recip in compat_map:
            db.add(models.BloodCompatibility(donor_group=donor, recipient_group=recip))
        db.commit()
    db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    models.Base.metadata.create_all(bind=engine)
    # Populate initial data
    populate_blood_compat()
    yield

app = FastAPI(title="Organ Allocation System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

# Make manager available to API routes
from api import set_ws_manager
set_ws_manager(manager)

app.include_router(api_router, prefix="/api")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
