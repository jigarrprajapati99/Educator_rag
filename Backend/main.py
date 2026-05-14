# pyrefly: ignore [missing-import]
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import chat, ingest,auth ,session

app = FastAPI(
    title="Educator RAG API",
    description="Backend API for the educational Retrieval-Augmented Generation system powered by Pinecone and Groq",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(ingest.router, prefix="/ingest", tags=["Ingestion"])
app.include_router(session.router, prefix="/session", tags=["Sessions"])

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "message": "API Gateway is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)