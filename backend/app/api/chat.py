from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ChatRequest, ChatResponse
from app.api.auth import get_current_user
from app.models import User
from app.langgraph.agent import run_agent

router = APIRouter(tags=["chat"])

@router.post("/api/chat", response_model=ChatResponse)
def chat_assistant(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        result = run_agent(request.message, current_user.id)
        return ChatResponse(
            response=result["response"],
            extracted_data=result["extracted_data"],
            tool_triggered=result["tool_triggered"],
            success=result["success"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {str(e)}"
        )

@router.post("/api/langgraph", response_model=ChatResponse)
def langgraph_assistant(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    # Route directly to the same LangGraph runner
    return chat_assistant(request, current_user)
