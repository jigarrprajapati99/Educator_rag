import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.schemas.ingest import IngestResponse
from app.services.rag.engine import rag_engine

router = APIRouter()

@router.post("/", response_model=IngestResponse)
async def ingest_document(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported currently.")
    
    # Save uploaded file temporarily
    temp_file_path = f"temp_{file.filename}"
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Pass the file to your Pinecone RAG engine
        chunks_added = rag_engine.ingest_pdf(temp_file_path)
    finally:
        # Clean up the temp file so your server doesn't fill up
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return {"status": "success", "chunks_stored": chunks_added}