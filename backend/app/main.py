from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat
from app.core.config import settings

app = FastAPI(title="Lumina Search Backend")

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001", # In case Vite switches ports
    "http://localhost:5173", # Default Vite port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(chat.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Lumina Search Backend is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
