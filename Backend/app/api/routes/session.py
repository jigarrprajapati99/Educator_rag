from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.security import get_current_user_email
from app.core.database import sessions_collection, users_collection
from pydantic import BaseModel

class SessionRename(BaseModel):
    title: str

router = APIRouter()


@router.put("/{session_id}")
async def rename_session(session_id: str, request: SessionRename, current_email: str = Depends(get_current_user_email)):
    user = await users_collection.find_one({"email": current_email})
    result = await sessions_collection.update_one(
        {"_id": ObjectId(session_id), "user_id": str(user["_id"])},
        {"$set": {"title": request.title}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "updated", "new_title": request.title}

@router.get("/")
async def get_user_sessions(current_email: str = Depends(get_current_user_email)):
    user = await users_collection.find_one({"email": current_email})
    # Fetch sessions but exclude the heavy messages array to save bandwidth
    cursor = sessions_collection.find({"user_id": str(user["_id"])}, {"messages": 0}).sort("created_at", -1)
    sessions = await cursor.to_list(length=50)
    
    for s in sessions:
        s["id"] = str(s["_id"])
        del s["_id"]
    return sessions

@router.get("/{session_id}")
async def get_session_history(session_id: str, current_email: str = Depends(get_current_user_email)):
    user = await users_collection.find_one({"email": current_email})
    session = await sessions_collection.find_one({"_id": ObjectId(session_id), "user_id": str(user["_id"])})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session["id"] = str(session["_id"])
    del session["_id"]
    return session

@router.delete("/{session_id}")
async def delete_session(session_id: str, current_email: str = Depends(get_current_user_email)):
    user = await users_collection.find_one({"email": current_email})
    await sessions_collection.delete_one({"_id": ObjectId(session_id), "user_id": str(user["_id"])})
    return {"status": "deleted"}