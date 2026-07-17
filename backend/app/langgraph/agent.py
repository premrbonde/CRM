import json
import re
from datetime import datetime, date, timedelta
from typing import TypedDict, Annotated, Sequence, Optional, List, Dict, Any
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_groq import ChatGroq
from app.config import settings
from app.langgraph.tools import (
    log_interaction_tool,
    edit_interaction_tool,
    hcp_relationship_intelligence_tool,
    smart_followup_planner_tool,
    next_best_action_engine_tool
)

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    user_id: int
    extracted_data: Optional[Dict[str, Any]]
    tool_triggered: Optional[str]
    response_text: Optional[str]

# Define 5 required sales tools list
tools_list = [
    log_interaction_tool,
    edit_interaction_tool,
    hcp_relationship_intelligence_tool,
    smart_followup_planner_tool,
    next_best_action_engine_tool
]

tools_map = {tool.name: tool for tool in tools_list}

# --- SMART REGEX-BASED MOCK EXTRACTOR ---
def parse_relative_date(text: str) -> str:
    """Parses date keywords to YYYY-MM-DD."""
    text_lower = text.lower()
    today = date.today()
    
    if "today" in text_lower:
        return today.strftime("%Y-%m-%d")
    elif "tomorrow" in text_lower:
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    elif "next monday" in text_lower:
        days_ahead = 0 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    elif "next friday" in text_lower:
        days_ahead = 4 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    elif "two weeks" in text_lower or "2 weeks" in text_lower:
        return (today + timedelta(days=14)).strftime("%Y-%m-%d")
    
    match = re.search(r"(\d{4}-\d{2}-\d{2})", text)
    if match:
        return match.group(1)
        
    return (today + timedelta(days=7)).strftime("%Y-%m-%d")

def extract_mock_data(text: str) -> Dict[str, Any]:
    """Identify intent and arguments for local Mock execution."""
    text_lower = text.lower()
    
    # 1. Next Best Action Engine Tool
    if any(k in text_lower for k in ["next action", "next best action", "what should i do next", "pitch", "suggest action"]):
        doc_match = re.search(r"(?:for|dr\.?)\s+([a-z\s]+)", text, re.IGNORECASE)
        doc_name = doc_match.group(1).strip() if doc_match else "Dr. Sharma"
        doc_name = re.sub(r"^dr\.?\s+", "", doc_name, flags=re.IGNORECASE)
        doc_name = " ".join(doc_name.split()[:2])
        return {"tool": "next_best_action_engine_tool", "doctor_name": f"Dr. {doc_name.title()}"}
        
    # 2. HCP Relationship Intelligence Tool
    if any(k in text_lower for k in ["relationship", "audit", "objection", "intelligence", "visit frequency", "relationship score", "history", "timeline"]):
        doc_match = re.search(r"(?:for|dr\.?)\s+([a-z\s]+)", text, re.IGNORECASE)
        doc_name = doc_match.group(1).strip() if doc_match else "Dr. Sharma"
        doc_name = re.sub(r"^dr\.?\s+", "", doc_name, flags=re.IGNORECASE)
        doc_name = " ".join(doc_name.split()[:2])
        return {"tool": "hcp_relationship_intelligence_tool", "doctor_name": f"Dr. {doc_name.title()}"}
        
    # 3. Smart Follow-up Planner Tool
    if any(k in text_lower for k in ["follow-up plan", "planner", "suggest follow-up", "followup", "schedule plan"]):
        doc_match = re.search(r"(?:for|dr\.?)\s+([a-z\s]+)", text, re.IGNORECASE)
        doc_name = doc_match.group(1).strip() if doc_match else "Dr. Sharma"
        doc_name = re.sub(r"^dr\.?\s+", "", doc_name, flags=re.IGNORECASE)
        doc_name = " ".join(doc_name.split()[:2])
        suggested_date = parse_relative_date(text)
        return {
            "tool": "smart_followup_planner_tool",
            "doctor_name": f"Dr. {doc_name.title()}",
            "suggested_date": suggested_date
        }
        
    # 4. Edit Interaction Tool
    if any(k in text_lower for k in ["edit", "update", "change"]) and any(k in text_lower for k in ["#", "interaction", "meeting", "saved", "logged"]) and re.search(r"\d+", text_lower):
        meeting_id_match = re.search(r"(?:meeting|interaction|#)\s*(\d+)", text_lower)
        interaction_id = int(meeting_id_match.group(1)) if meeting_id_match else 1
        
        updates = {}
        if "notes" in text_lower:
            notes_match = re.search(r"notes?\s+(?:to|as)\s+[\"'](.+?)[\"']", text, re.IGNORECASE)
            if notes_match:
                updates["notes"] = notes_match.group(1)
        if "interest" in text_lower:
            interest_match = re.search(r"interest\s+(?:level\s+)?(?:to|as)\s+(\w+)", text_lower)
            if interest_match:
                updates["interest_level"] = interest_match.group(1).title()
        if "follow up" in text_lower or "date" in text_lower:
            updates["follow_up_date"] = parse_relative_date(text)
            
        if not updates:
            updates["notes"] = "Updated notes from chat request."
            
        return {
            "tool": "edit_interaction_tool",
            "interaction_id": interaction_id,
            "updates": updates
        }

    # 5. Log Interaction Tool (Default Fallback)
    doc_name = None
    doc_name_match = re.search(r"(?:doctor|dr)(?:\s+name)?(?:\s+was|\s+is|\s+to)?\s+([a-z]+(?:\s+[a-z]+)?)", text, re.IGNORECASE)
    if doc_name_match:
        doc_name = doc_name_match.group(1).strip()
    else:
        doc_match = re.search(r"dr\.?\s+([a-z]+(?:\s+[a-z]+)?)", text, re.IGNORECASE)
        if doc_match:
            doc_name = doc_match.group(1).strip()
            
    if doc_name:
        doc_name = re.sub(r"^dr\.?\s+", "", doc_name, flags=re.IGNORECASE)
        doc_name = f"Dr. {doc_name.title()}"
    else:
        doc_name = "Dr. Sharma"
        
    hosp_match = re.search(r"(?:at|in)\s+([a-z\s]+hospital)", text, re.IGNORECASE)
    if not hosp_match:
        hosp_match = re.search(r"hospital\s+([a-z]+)", text, re.IGNORECASE)
    hosp_name = hosp_match.group(1).title() if hosp_match else "Apollo Hospital"
    if "Hospital" not in hosp_name:
        hosp_name = f"{hosp_name} Hospital"
        
    products = []
    for prod in ["CardioPlus", "NeuroShield", "DiaCure", "OsteoRelief"]:
        if prod.lower() in text_lower:
            products.append(prod)
    if not products:
        products = ["CardioPlus"]
        
    # Analyze sentiment
    sentiment = "Neutral"
    if any(w in text_lower for w in ["interested", "great", "excellent", "impressed", "positive", "good", "receptive"]):
        sentiment = "Positive"
    elif any(w in text_lower for w in ["uninterested", "rejected", "negative", "bad", "poor", "difficult"]):
        sentiment = "Negative"
        
    # Interest level
    interest = "Medium"
    if "high" in text_lower or "receptive" in text_lower:
        interest = "High"
    elif "low" in text_lower or "uninterested" in text_lower:
        interest = "Low"
        
    specialization = "Cardiology"
    if "neuro" in text_lower:
        specialization = "Neurology"
    elif "dia" in text_lower:
        specialization = "Endocrinology"
    elif "osteo" in text_lower:
        specialization = "Orthopedics"
        
    int_type = "Meeting"
    if "email" in text_lower or "mail" in text_lower:
        int_type = "Email"
    elif "zoom" in text_lower or "virtual" in text_lower:
        int_type = "Virtual Call"
    elif "phone" in text_lower or "call" in text_lower:
        int_type = "Phone Call"
        
    meeting_mode = "Virtual" if int_type in ("Virtual Call", "Phone Call", "Email") else "In-Person"
    
    # Meeting Objective
    meeting_objective = "Product Discussion"
    if "sample" in text_lower:
        meeting_objective = "Sample Distribution"
    elif "symposium" in text_lower:
        meeting_objective = "Symposium Invitation"
    elif "formulary" in text_lower:
        meeting_objective = "Formulary Follow-up"

    # Materials Shared
    materials_shared = []
    if "brochure" in text_lower:
        materials_shared.append("Efficacy Brochure")
    if "clinical study" in text_lower or "study" in text_lower:
        materials_shared.append("Clinical Trial Study")
        
    # Samples Distributed
    samples_distributed = []
    if "sample" in text_lower:
        quantity = 1
        qty_match = re.search(r"(\d+|two|three|four|five)\s+sample", text_lower)
        if qty_match:
            word_to_num = {"two": 2, "three": 3, "four": 4, "five": 5}
            qty_str = qty_match.group(1)
            quantity = int(qty_str) if qty_str.isdigit() else word_to_num.get(qty_str, 1)
        samples_distributed.append({"product": products[0], "quantity": quantity})
        
    # Key Outcomes
    key_outcomes = None
    outcome_match = re.search(r"(?:requested|asked for)\s+([a-z\s]+)", text_lower)
    if outcome_match:
        key_outcomes = f"Doctor requested {outcome_match.group(1).strip()}."
    elif "long-term safety data" in text_lower:
        key_outcomes = "Doctor requested additional long-term safety data."
        
    # Next Step
    next_step = None
    if "safety data" in text_lower:
        next_step = "Share long-term safety data."
    elif "follow-up" in text_lower:
        next_step = "Follow up with doctor."
        
    priority = interest # match priority to interest level
    
    # Dates
    int_date = parse_relative_date(text)
    follow_up_date = None
    if "follow-up" in text_lower or "follow up" in text_lower:
        follow_up_date = parse_relative_date(text)
        
    topics_discussed = f"Discussed {', '.join(products)}."
    if " efficacy " in text_lower or " trial " in text_lower:
        topics_discussed = f"Discussed {products[0]} efficacy and latest trial details."
        
    summary = f"Met {doc_name} at {hosp_name}. Discussed {products[0]}. High interest. Follow-up scheduled."
    
    return {
        "tool": "log_interaction_tool",
        "doctor_name": doc_name,
        "hospital": hosp_name,
        "specialization": specialization,
        "interaction_type": int_type,
        "meeting_mode": meeting_mode,
        "meeting_objective": meeting_objective,
        "interaction_date": int_date,
        "interaction_time": "10:30",
        "products_discussed": products,
        "topics_discussed": topics_discussed,
        "materials_shared": materials_shared,
        "samples_distributed": samples_distributed,
        "sentiment": sentiment,
        "interest_level": interest,
        "key_outcomes": key_outcomes,
        "next_step": next_step,
        "priority": priority,
        "follow_up_date": follow_up_date,
        "summary": summary
    }

# --- HELPER FUNCTIONS ---

def format_log_confirmation(data: Dict[str, Any]) -> str:
    if not data:
        return "✅ **Interaction logged successfully!** Form details auto-extracted. Please review before saving."
        
    doc = data.get("doctor_name") or "null"
    hosp = data.get("hospital") or "null"
    prods = ", ".join(data.get("products_discussed") or []) or "null"
    sentiment = data.get("sentiment") or "null"
    interest = data.get("interest_level") or "null"
    
    mats = data.get("materials_shared") or []
    mats_str = ", ".join(mats) if mats else "None"
    
    samps = data.get("samples_distributed") or []
    samps_str = "None"
    if samps:
        s_list = []
        for s in samps:
            if isinstance(s, dict):
                s_list.append(f"{s.get('quantity', 1)} Boxes" if "box" in str(s.get("product", "")).lower() else f"{s.get('quantity', 1)} Units")
            else:
                s_list.append(str(s))
        samps_str = ", ".join(s_list)
        
    fup = data.get("follow_up_date")
    if fup:
        try:
            dt = datetime.strptime(fup, "%Y-%m-%d")
            fup_str = dt.strftime("%b %d, %Y")
        except Exception:
            fup_str = fup
    else:
        fup_str = "Not scheduled"
        
    return f"""✓ Doctor: {doc}
✓ Hospital: {hosp}
✓ Product: {prods}
✓ Sentiment: {sentiment}
✓ Interest Level: {interest}
✓ Materials Shared: {mats_str}
✓ Samples Distributed: {samps_str}
✓ Follow-up: {fup_str}

All form fields have been auto-populated.
Please review before saving."""

# --- LANGGRAPH NODE DEFINITIONS ---
def call_model(state: AgentState):
    """Real LLM call node using ChatGroq with multi-level fallback for rate limits."""
    messages = state["messages"]
    today_str = date.today().strftime("%A, %B %d, %Y")

    system_msg = SystemMessage(content=f"""You are an AI sales coach assistant for a Healthcare CRM (HCP Module).
The user is a pharmaceutical representative logging meetings or asking for relationship guidance.

Today's date is: {today_str}.

When calling `log_interaction_tool`, extract and populate every available field from the conversation:
- doctor_name: Full name of the doctor (e.g. Dr. Rahul Sharma)
- hospital: Hospital name (e.g. Apollo Hospital)
- specialization: Doctor's specialization if mentioned or inferred (Cardiology, Neurology, Orthopedics, Endocrinology, General Medicine)
- interaction_type: Type of meeting (Normalize to: Meeting, Virtual Call, Phone Call, or Email)
- meeting_mode: Mode of meeting (Normalize to: In-Person or Virtual)
- meeting_objective: Objective of meeting (Normalize to: Product Discussion, Formulary Follow-up, Symposium Invitation, or Sample Distribution)
- interaction_date: Date of the interaction in YYYY-MM-DD format. Convert relative dates (e.g., today, yesterday, tomorrow) using the reference date: {today_str}.
- interaction_time: Time of the interaction in HH:MM format (24h or 12h, e.g. 14:30)
- products_discussed: List of medical products discussed (CardioPlus, NeuroShield, DiaCure, OsteoRelief)
- topics_discussed: Concrete summary of discussion topics/notes
- materials_shared: List of brochures/papers shared (e.g. ['Efficacy Brochure'])
- samples_distributed: List of distributed drug samples with quantities, format: [{{'product': 'CardioPlus', 'quantity': 2}}]
- sentiment: Sentiment of the interaction (Normalize to: Positive, Neutral, or Negative)
- interest_level: Doctor's interest level (Normalize to: High, Medium, or Low)
- key_outcomes: Key outcomes, agreements, or requests (e.g. He requested additional long-term safety data)
- next_step: The next concrete follow-up step/action (e.g. Share long-term safety data)
- priority: Priority of followup (Normalize to: High, Medium, or Low)
- follow_up_date: Scheduled next follow-up date in YYYY-MM-DD format. Convert relative dates (e.g., 'next Friday', 'next Monday', 'tomorrow', 'next week', 'after two weeks') to YYYY-MM-DD using the reference date: {today_str}.
- summary: A concise 1-sentence summary of the meeting
- notes: Full raw discussion notes

CRITICAL RULES:
1. If a field is not mentioned or cannot be inferred, return `null`. Do NOT fabricate values.
2. Resolve relative dates like 'next Friday' or 'tomorrow' to absolute calendar dates YYYY-MM-DD based on today being {today_str}.
3. Normalize all dropdown/categorical values to match the options listed above.
4. If the user mentions "next Friday", calculate the date mathematically based on today ({today_str}).
""")

    # Fallback level 1: Llama 3.3
    try:
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0.1
        )
        llm_with_tools = llm.bind_tools(tools_list)
        response = llm_with_tools.invoke([system_msg] + list(messages))
        return {"messages": [response]}
    except Exception as e:
        print(f"Llama 3.3 failed (likely rate limit): {e}. Trying Llama 3.1 fallback...")
        
        # Fallback level 2: Llama 3.1
        try:
            llm = ChatGroq(
                model="llama-3.1-8b-instant",
                groq_api_key=settings.GROQ_API_KEY,
                temperature=0.1
            )
            llm_with_tools = llm.bind_tools(tools_list)
            response = llm_with_tools.invoke([system_msg] + list(messages))
            return {"messages": [response]}
        except Exception as e2:
            print(f"Llama 3.1 failed: {e2}. Falling back to Smart Offline Local NLP Extractor...")
            
            # Fallback level 3: Offline local NLP extraction
            user_msg = ""
            for m in reversed(messages):
                if isinstance(m, HumanMessage):
                    user_msg = m.content
                    break
            
            extracted = extract_mock_data(user_msg)
            tool_name = extracted.pop("tool")
            
            # Formulate AIMessage with tool call
            response = AIMessage(
                content="⚠️ **Groq API Rate Limit Reached.** Switched to offline extraction engine to log details.",
                tool_calls=[{
                    "name": tool_name,
                    "args": extracted,
                    "id": "mock_call_fallback"
                }]
            )
            return {"messages": [response]}

def execute_tools(state: AgentState):
    """Executes the tool calls emitted by the LLM."""
    messages = state["messages"]
    last_message = messages[-1]
    
    tool_responses = []
    extracted_data = None
    tool_name = None
    
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        for tool_call in last_message.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            
            # Inject user_id if logging
            if tool_name == "log_interaction_tool" and "created_by_user_id" not in tool_args:
                tool_args["created_by_user_id"] = state["user_id"]
                
            tool_func = tools_map[tool_name]
            result_str = tool_func.invoke(tool_args)
            
            try:
                result_json = json.loads(result_str)
                if "data" in result_json:
                    extracted_data = result_json["data"]
            except Exception:
                pass
                
            tool_responses.append(ToolMessage(
                content=result_str,
                tool_call_id=tool_call["id"]
            ))
            
    return {
        "messages": tool_responses,
        "extracted_data": extracted_data,
        "tool_triggered": tool_name
    }

def should_continue(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

# --- COMPOSE THE GRAPH ---
workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", execute_tools)

workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
workflow.add_edge("tools", END)

graph = workflow.compile()

# --- EXPOSED RUNNER FUNCTION ---
def run_agent(user_message: str, user_id: int) -> Dict[str, Any]:
    """Runs the LangGraph agent in either Groq API mode or Smart Mock mode."""
    if settings.MOCK_LLM or not settings.GROQ_API_KEY:
        extracted = extract_mock_data(user_message)
        tool_name = extracted.pop("tool")
        
        if tool_name == "log_interaction_tool":
            extracted["created_by_user_id"] = user_id
            tool_result_str = log_interaction_tool.invoke(extracted)
        elif tool_name == "edit_interaction_tool":
            tool_result_str = edit_interaction_tool.invoke(extracted)
        elif tool_name == "hcp_relationship_intelligence_tool":
            tool_result_str = hcp_relationship_intelligence_tool.invoke(extracted)
        elif tool_name == "smart_followup_planner_tool":
            tool_result_str = smart_followup_planner_tool.invoke(extracted)
        elif tool_name == "next_best_action_engine_tool":
            tool_result_str = next_best_action_engine_tool.invoke(extracted)
        else:
            tool_result_str = json.dumps({"success": False, "message": "Unknown tool."})
            
        try:
            result_json = json.loads(tool_result_str)
        except Exception:
            result_json = {"success": False, "message": tool_result_str}
            
        # Formulate chat responses based on tool output
        if tool_name == "log_interaction_tool" and result_json.get("success"):
            response_text = format_log_confirmation(result_json.get("data"))
        elif tool_name == "edit_interaction_tool" and result_json.get("success"):
            response_text = f"I've updated interaction #{extracted.get('interaction_id')}. {result_json.get('message')}"
        elif tool_name == "hcp_relationship_intelligence_tool" and result_json.get("success"):
            audit = result_json.get("data", {})
            response_text = f"**AI HCP Relationship intelligence for {audit.get('doctor_name')}**:\n- **Relationship Score**: `{audit.get('relationship_score')}/100`\n- **Risk Level**: `{audit.get('risk_level')}`\n- **Visit Frequency**: `{audit.get('visit_frequency')}`\n- **Objections**: `{', '.join(audit.get('objections')) if audit.get('objections') else 'None'}`\n- **Summary**: {audit.get('ai_relationship_summary')}"
        elif tool_name == "smart_followup_planner_tool" and result_json.get("success"):
            fup = result_json.get("data", {})
            response_text = f"📅 **Smart Follow-up Proposal for {fup.get('doctor_name')}**:\n- **Suggested Date**: {fup.get('suggested_follow_up_date')}\n- **Objective**: {fup.get('meeting_objective')}\n- **Priority**: {fup.get('priority')}\n- **Recommended Literature**: {fup.get('required_clinical_literature')}\n- **Risk if Delayed**: {fup.get('risk_if_delayed')}"
        elif tool_name == "next_best_action_engine_tool" and result_json.get("success"):
            nba = result_json.get("data", {})
            response_text = f"💡 **AI Next Best Action for {nba.get('doctor_name')}**:\n- **Recommended Product**: {nba.get('recommended_product')}\n- **Clinical Paper**: {nba.get('clinical_paper')}\n- **Suggested Samples**: {nba.get('suggested_samples')}\n- **AI Rationale**: {nba.get('ai_rationale')}\n- **Expected Outcome**: {nba.get('expected_outcome')}"
        else:
            response_text = result_json.get("message", "Executed successfully.")
            
        return {
            "response": response_text,
            "extracted_data": result_json.get("data"),
            "tool_triggered": tool_name,
            "success": result_json.get("success", False)
        }
    
    try:
        inputs = {
            "messages": [HumanMessage(content=user_message)],
            "user_id": user_id,
            "extracted_data": None,
            "tool_triggered": None,
            "response_text": None
        }
        
        final_state = graph.invoke(inputs)
        messages = final_state["messages"]
        last_msg = messages[-1]
        
        response_content = ""
        if isinstance(last_msg, ToolMessage):
            tool_res = last_msg.content
            try:
                tool_json = json.loads(tool_res)
                trig = final_state.get("tool_triggered")
                if trig == "log_interaction_tool":
                    response_content = format_log_confirmation(tool_json.get("data"))
                elif trig == "hcp_relationship_intelligence_tool" and tool_json.get("success"):
                    audit = tool_json.get("data", {})
                    response_content = f"**AI HCP Relationship intelligence for {audit.get('doctor_name')}**:\n- **Relationship Score**: `{audit.get('relationship_score')}/100`\n- **Risk Level**: `{audit.get('risk_level')}`\n- **Visit Frequency**: `{audit.get('visit_frequency')}`\n- **Summary**: {audit.get('ai_relationship_summary')}"
                elif trig == "smart_followup_planner_tool" and tool_json.get("success"):
                    fup = tool_json.get("data", {})
                    response_content = f"📅 **Smart Follow-up Proposal for {fup.get('doctor_name')}**:\n- **Suggested Date**: {fup.get('suggested_follow_up_date')}\n- **Objective**: {fup.get('meeting_objective')}\n- **Priority**: {fup.get('priority')}"
                elif trig == "next_best_action_engine_tool" and tool_json.get("success"):
                    nba = tool_json.get("data", {})
                    response_content = f"💡 **AI Next Best Action for {nba.get('doctor_name')}**:\n- **Recommended Product**: {nba.get('recommended_product')}\n- **Clinical Paper**: {nba.get('clinical_paper')}\n- **AI Rationale**: {nba.get('ai_rationale')}"
                else:
                    response_content = tool_json.get("message") or f"Execution result: {tool_res}"
            except Exception:
                response_content = f"Tool execution completed: {tool_res}"
        else:
            response_content = last_msg.content
            
        return {
            "response": response_content,
            "extracted_data": final_state.get("extracted_data"),
            "tool_triggered": final_state.get("tool_triggered"),
            "success": True
        }
    except Exception as e:
        return {
            "response": f"An error occurred while executing the agent: {str(e)}",
            "extracted_data": None,
            "tool_triggered": None,
            "success": False
        }
