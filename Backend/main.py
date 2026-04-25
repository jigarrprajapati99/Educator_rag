from fastapi import FastAPI
from app.api.routes import chat, ingest

app = FastAPI(
    title="Educator RAG API",
    description="Backend API for the educational Retrieval-Augmented Generation system powered by Pinecone and Groq",
    version="1.0.0"
)

# Include routers
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(ingest.router, prefix="/ingest", tags=["Ingestion"])

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "message": "API Gateway is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)