import os
import shutil
import uuid
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, UploadFile, HTTPException, Depends
from app.schemas.ingest import IngestResponse
from app.services.rag.engine import rag_engine
from app.core.security import get_current_user_email
from app.core.database import documents_collection, users_collection

router = APIRouter()

@router.get("/")
async def get_documents(current_email: str = Depends(get_current_user_email)):
    user = await users_collection.find_one({"email": current_email})
    cursor = documents_collection.find({"user_id": str(user["_id"])}).sort("uploaded_at", -1)
    docs = await cursor.to_list(length=100)
    for d in docs:
        d["id"] = str(d["_id"])
        del d["_id"]
    return docs

@router.post("/", response_model=IngestResponse)
async def ingest_documents(files: list[UploadFile], current_email: str = Depends(get_current_user_email)):
    user = await users_collection.find_one({"email": current_email})
    total_chunks_added = 0
    
    for file in files:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF.")

    for file in files:
        temp_file_path = f"temp_{file.filename}"
        
        # 1. Generate the ID here
        doc_id = str(uuid.uuid4())
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        try:
            # 2. Pass the ID directly to Pinecone
            chunks_added = rag_engine.ingest_pdf(temp_file_path, doc_id)
            total_chunks_added += chunks_added
            
            # 3. Save the EXACT SAME ID to MongoDB
            await documents_collection.insert_one({
                "user_id": str(user["_id"]),
                "filename": file.filename,
                "doc_id": doc_id, 
                "chunks": chunks_added,
                "uploaded_at": datetime.now(timezone.utc)
            })
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    return {"status": "success", "chunks_stored": total_chunks_added}

@router.delete("/{mongo_id}")
async def delete_document(mongo_id: str, current_email: str = Depends(get_current_user_email)):
    user = await users_collection.find_one({"email": current_email})
    
    doc = await documents_collection.find_one({"_id": ObjectId(mongo_id), "user_id": str(user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if "doc_id" in doc and "chunks" in doc:
        # Delete from Pinecone
        rag_engine.delete_document(doc["doc_id"], doc["chunks"])
    
    # Delete from MongoDB
    await documents_collection.delete_one({"_id": ObjectId(mongo_id)})
    
    return {"status": "deleted successfully"}