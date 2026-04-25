from pydantic import BaseModel
from typing import List ,Optional

class ChatRequest(BaseModel):
    query: str
    top_k: int = 3
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    context_used: List[str]
    query_time_seconds: float
    session_id: str