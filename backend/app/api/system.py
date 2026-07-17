from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from app.database import get_db
from app.models import SystemConfig, SystemTool, User
from app.api.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/system", tags=["system"])

# Pydantic Schemas
class SystemConfigSchema(BaseModel):
    id: int
    engine_mode: str
    evaluation_mode: bool
    production_mode: bool
    ai_enabled: bool
    active_model: str
    temperature: float
    max_tokens: int
    top_p: float
    frequency_penalty: float
    presence_penalty: float
    api_key: str
    api_status: str
    last_connection_time: str

    class Config:
        from_attributes = True

class SystemConfigUpdate(BaseModel):
    engine_mode: Optional[str] = None
    evaluation_mode: Optional[bool] = None
    production_mode: Optional[bool] = None
    ai_enabled: Optional[bool] = None
    active_model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    api_key: Optional[str] = None

class SystemConfigPatch(BaseModel):
    evaluation_mode: Optional[bool] = None
    production_mode: Optional[bool] = None
    ai_enabled: Optional[bool] = None

class SystemToolSchema(BaseModel):
    id: str
    name: str
    description: str
    enabled: bool

    class Config:
        from_attributes = True

class SystemToolPatch(BaseModel):
    enabled: bool

class APIKeyRequest(BaseModel):
    api_key: str

class APIKeyResponse(BaseModel):
    api_key: str
    api_status: str
    last_connection_time: str

class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    context_length: int

class StatusResponse(BaseModel):
    connection_status: str # Connected, Disconnected, Warning
    target_provider: str
    active_model: str
    response_time: int # in ms
    last_checked: str
    api_health: str

class UsageResponse(BaseModel):
    daily_token_limit: int
    tokens_used_today: int
    remaining_tokens: int
    requests_per_minute: int
    current_rpm_usage: int

class TestRequest(BaseModel):
    tool_id: str
    prompt: str

class TestResponse(BaseModel):
    status: str
    response_time: int
    generated_response: str
    tool_used: str
    model_used: str

class InfoResponse(BaseModel):
    ai_engine_version: str
    backend_version: str
    environment: str
    region: str
    encryption: str
    data_retention: str
    last_updated: str

def get_or_create_config(db: Session) -> SystemConfig:
    config = db.query(SystemConfig).first()
    if not config:
        config = SystemConfig(
            engine_mode="Evaluation",
            evaluation_mode=True,
            production_mode=False,
            ai_enabled=True,
            active_model="llama-3.3-70b-versatile",
            temperature=0.2,
            max_tokens=2048,
            top_p=0.9,
            frequency_penalty=0.0,
            presence_penalty=0.0,
            api_key="gsk_********************",
            api_status="Connected",
            last_connection_time="May 16, 2026 • 10:30 AM"
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.get("/configuration", response_model=SystemConfigSchema)
def get_configuration(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_or_create_config(db)

@router.put("/configuration", response_model=SystemConfigSchema)
def update_configuration(
    config_in: SystemConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = get_or_create_config(db)
    update_data = config_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key == "api_key" and value:
            # Mask key if updating
            config.api_key = value if "gsk_" in value else f"gsk_{value[:6]}****************"
        else:
            setattr(config, key, value)
    
    db.commit()
    db.refresh(config)
    return config

@router.patch("/configuration", response_model=SystemConfigSchema)
def patch_configuration(
    config_in: SystemConfigPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = get_or_create_config(db)
    if config_in.evaluation_mode is not None:
        config.evaluation_mode = config_in.evaluation_mode
        config.engine_mode = "Evaluation" if config_in.evaluation_mode else "Production"
        config.production_mode = not config_in.evaluation_mode
    if config_in.production_mode is not None:
        config.production_mode = config_in.production_mode
        config.engine_mode = "Production" if config_in.production_mode else "Evaluation"
        config.evaluation_mode = not config_in.production_mode
    if config_in.ai_enabled is not None:
        config.ai_enabled = config_in.ai_enabled
        
    db.commit()
    db.refresh(config)
    return config

@router.get("/models", response_model=List[ModelInfo])
def get_available_models(current_user: User = Depends(get_current_user)):
    return [
        ModelInfo(id="llama-3.3-70b-versatile", name="Llama 3.3 70b Versatile", provider="Groq Cloud", context_length=128000),
        ModelInfo(id="gemma2-9b-it", name="Gemma 2 9b IT", provider="Groq Cloud", context_length=8192),
        ModelInfo(id="mixtral-8x7b-32768", name="Mixtral 8x7b Instruct", provider="Groq Cloud", context_length=32768),
        ModelInfo(id="llama-3.1-8b-instant", name="Llama 3.1 8b Instant", provider="Groq Cloud", context_length=8192)
    ]

@router.put("/model-settings", response_model=SystemConfigSchema)
def update_model_settings(
    config_in: SystemConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = get_or_create_config(db)
    if config_in.active_model:
        config.active_model = config_in.active_model
    if config_in.temperature is not None:
        config.temperature = config_in.temperature
    if config_in.max_tokens is not None:
        config.max_tokens = config_in.max_tokens
    if config_in.top_p is not None:
        config.top_p = config_in.top_p
    if config_in.frequency_penalty is not None:
        config.frequency_penalty = config_in.frequency_penalty
    if config_in.presence_penalty is not None:
        config.presence_penalty = config_in.presence_penalty
        
    db.commit()
    db.refresh(config)
    return config

@router.get("/tools", response_model=List[SystemToolSchema])
def get_system_tools(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tools = db.query(SystemTool).all()
    if not tools:
        # Seed tools default list
        default_tools = [
            SystemTool(id="log_interaction", name="Log Interaction Tool", description="Extract and analyze interaction data from doctor discussions.", enabled=True),
            SystemTool(id="edit_interaction", name="Edit Interaction Tool", description="Refine, update, and correct interaction summaries.", enabled=True),
            SystemTool(id="relationship_intelligence", name="Relationship Intelligence Tool", description="Compute HCP relationships, scores, and risk flags.", enabled=True),
            SystemTool(id="next_best_action", name="Next Best Action Engine", description="Recommend products to promote and actions to take.", enabled=True),
            SystemTool(id="smart_followup", name="Smart Follow-up Planner", description="Schedule subsequent visits automatically.", enabled=True),
            SystemTool(id="compliance_guard", name="Safety & Compliance Guard", description="Validate compliance with medical guidelines.", enabled=True)
        ]
        db.add_all(default_tools)
        db.commit()
        tools = db.query(SystemTool).all()
    return tools

@router.patch("/tools/{tool_id}", response_model=SystemToolSchema)
def patch_system_tool(
    tool_id: str,
    tool_in: SystemToolPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tool = db.query(SystemTool).filter(SystemTool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="System tool not found")
        
    tool.enabled = tool_in.enabled
    db.commit()
    db.refresh(tool)
    return tool

@router.post("/api-key", response_model=APIKeyResponse)
def post_api_key(
    req: APIKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = get_or_create_config(db)
    config.api_key = f"gsk_{req.api_key[:6]}****************" if "gsk_" not in req.api_key else req.api_key
    config.api_status = "Connected"
    config.last_connection_time = datetime.now().strftime("%b %d, %Y • %I:%M %p")
    db.commit()
    db.refresh(config)
    return APIKeyResponse(
        api_key=config.api_key,
        api_status=config.api_status,
        last_connection_time=config.last_connection_time
    )

@router.post("/validate-key", response_model=APIKeyResponse)
def post_validate_key(
    req: APIKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Mock validator
    if len(req.api_key) < 15:
        raise HTTPException(status_code=400, detail="Invalid API Key format. Must be a valid Groq Cloud key.")
        
    config = get_or_create_config(db)
    config.api_status = "Connected"
    config.last_connection_time = datetime.now().strftime("%b %d, %Y • %I:%M %p")
    db.commit()
    db.refresh(config)
    return APIKeyResponse(
        api_key=config.api_key,
        api_status=config.api_status,
        last_connection_time=config.last_connection_time
    )

@router.get("/status", response_model=StatusResponse)
def get_system_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = get_or_create_config(db)
    return StatusResponse(
        connection_status="Connected" if config.api_status == "Connected" else "Warning",
        target_provider="Groq API Gateway",
        active_model=config.active_model,
        response_time=842,
        last_checked=datetime.now().strftime("%b %d, %Y • %I:%M %p"),
        api_health="Healthy"
    )

@router.get("/usage", response_model=UsageResponse)
def get_system_usage(current_user: User = Depends(get_current_user)):
    return UsageResponse(
        daily_token_limit=10000000,
        tokens_used_today=2145320,
        remaining_tokens=7854680,
        requests_per_minute=60,
        current_rpm_usage=18
    )

@router.post("/test", response_model=TestResponse)
def post_system_test(
    req: TestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = get_or_create_config(db)
    tool = db.query(SystemTool).filter(SystemTool.id == req.tool_id).first()
    tool_name = tool.name if tool else "AI Planner"
    
    # Return simulated AI execution
    return TestResponse(
        status="Success",
        response_time=842,
        generated_response=f"Test executed successfully using {req.prompt}. Prompt was processed by model {config.active_model} via the {tool_name} module.",
        tool_used=tool_name,
        model_used=config.active_model
    )

@router.get("/info", response_model=InfoResponse)
def get_system_info(current_user: User = Depends(get_current_user)):
    return InfoResponse(
        ai_engine_version="v2.4.1",
        backend_version="v1.0.0",
        environment="Production",
        region="us-east-1",
        encryption="AES-256",
        data_retention="180 days",
        last_updated="May 16, 2026 • 09:15 AM"
    )

@router.post("/reset", response_model=SystemConfigSchema)
def post_system_reset(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = db.query(SystemConfig).first()
    if config:
        config.engine_mode = "Evaluation"
        config.evaluation_mode = True
        config.production_mode = False
        config.ai_enabled = True
        config.active_model = "llama-3.3-70b-versatile"
        config.temperature = 0.2
        config.max_tokens = 2048
        config.top_p = 0.9
        config.frequency_penalty = 0.0
        config.presence_penalty = 0.0
        config.api_key = "gsk_********************"
        config.api_status = "Connected"
        config.last_connection_time = "May 16, 2026 • 10:30 AM"
        
        # Reset tools too
        tools = db.query(SystemTool).all()
        for t in tools:
            t.enabled = True
            
        db.commit()
        db.refresh(config)
    return config
