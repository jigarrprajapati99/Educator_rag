import time
from fastapi import APIRouter , Depends
from app.core.security import get_current_user_email
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag.engine import rag_engine

router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest, 
    current_user: str = Depends(get_current_user_email) # <--- THIS LOCKS THE ROUTE
):
    start_time = time.time()
    
    # 1. Retrieve Context
    context = rag_engine.search(request.query, top_k=request.top_k)
    
    # 2. Generate Answer
    answer = rag_engine.generate_answer(request.query, context)
    
    end_time = time.time()
    
    return {
        "answer": answer,
        "context_used": context,
        "query_time_seconds": round(end_time - start_time, 4)
    }