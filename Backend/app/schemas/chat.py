from pydantic import BaseModel
from typing import List

class ChatRequest(BaseModel):
    query: str
    top_k: int = 3

class ChatResponse(BaseModel):
    answer: str
    context_used: List[str]
    query_time_seconds: float