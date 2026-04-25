import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from bson import ObjectId
from app.core.security import get_current_user_email
from app.core.database import sessions_collection, users_collection
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag.engine import rag_engine

router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest, 
    current_email: str = Depends(get_current_user_email)
):
    start_time = time.time()
    user = await users_collection.find_one({"email": current_email})
    user_id = str(user["_id"])
    
    # 1. Retrieve Context & Generate Answer
    context = rag_engine.search(request.query, top_k=request.top_k)
    answer = rag_engine.generate_answer(request.query, context)
    query_time = round(time.time() - start_time, 4)

    # 2. Format the new messages for MongoDB
    new_messages = [
        {"role": "user", "content": request.query},
        {"role": "assistant", "content": answer, "context": context, "time": query_time}
    ]

    # 3. Save to MongoDB (Update existing session OR create new one)
    if request.session_id:
        await sessions_collection.update_one(
            {"_id": ObjectId(request.session_id), "user_id": user_id},
            {"$push": {"messages": {"$each": new_messages}}}
        )
        session_id = request.session_id
    else:
        new_session = {
            "user_id": user_id,
            "title": request.query[:30] + "..." if len(request.query) > 30 else request.query,
            "created_at": datetime.now(timezone.utc),
            "messages": new_messages
        }
        result = await sessions_collection.insert_one(new_session)
        session_id = str(result.inserted_id)
    
    return {
        "answer": answer,
        "context_used": context,
        "query_time_seconds": query_time,
        "session_id": session_id
    }