import os
import shutil
from fastapi import APIRouter, UploadFile, HTTPException
from app.schemas.ingest import IngestResponse
from app.services.rag.engine import rag_engine

router = APIRouter()

# Notice it now expects a list of files called 'files' (matching the frontend)
@router.post("/", response_model=IngestResponse)
async def ingest_documents(files: list[UploadFile]):
    total_chunks_added = 0
    
    # Check if all files are PDFs before processing any
    for file in files:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF. Only PDF files are supported.")

    # Process each file
    for file in files:
        # Save uploaded file temporarily
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        try:
            # Pass the file to your Pinecone RAG engine
            chunks_added = rag_engine.ingest_pdf(temp_file_path)
            total_chunks_added += chunks_added
        finally:
            # Clean up the temp file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    return {"status": "success", "chunks_stored": total_chunks_added}