# AI-First CRM – HCP Interaction Module

AI-First Customer Relationship Management (CRM) module for Medical Representatives (MRs) to log, analyze, and manage interactions with Healthcare Professionals (HCPs) like doctors. It offers a premium split user experience allowing MRs to log interactions through a **Structured Form** or a **Conversational AI Chat Interface**.

---

## Overall Architecture

```mermaid
graph TD
    User([Medical Rep]) -->|Form / Chat UI| React[React 19 Frontend]
    React -->|REST / API Client| FastAPI[FastAPI Backend]
    FastAPI -->|Invoke Agent| LangGraph[LangGraph StateGraph]
    LangGraph -->|Decide Intent| Groq[Groq LLM gemma2-9b-it]
    Groq -->|Select Action| Tools[LangGraph Tools]
    Tools -->|SQLAlchemy Query| DB[(SQLite / PostgreSQL)]
    DB -->|ORM Data| React
```

### High-Level Data Flow
```text
Medical Representative
          ↓
    React Frontend
          ↓
  FastAPI REST APIs
          ↓
   LangGraph Agent
          ↓
      5 AI Tools
          ↓
   SQLite Database
          ↓
     Redux State
          ↓
   Live UI Refresh
```

---

## Tech Stack

* **Frontend:** React 19, Redux Toolkit (State Management), React Router v6 (Guards & Routing), Material UI (v6 Theme & Layouts), Axios, Recharts (KPI Data Visualizations).
* **Backend:** Python 3.12, FastAPI, SQLAlchemy ORM, SQLite (Default out-of-the-box dev database), Pydantic (Request/Response schemas).
* **AI Agent:** LangGraph (State Machine), LangChain, Groq API (Inference on `gemma2-9b-it`).

---

## Features

1. **Structured Form Logging:** Traditional dropdowns and textfields with auto-doctor resolution and follow-up scheduling.
2. **AI Chat Logging:** Allows Representatives to dictate narratives (e.g. *"I met Dr. Sharma today at Apollo Hospital. Discussed CardioPlus. Interest was high, schedule follow-up next Monday"*). The LangGraph agent parses entities and commits them to the database automatically.
3. **Doctor Directory & Profiles:** Detailed summary of doctors, contact cards, historical timeline of past visits, and **AI Next Best Action** recommendations.
4. **Analytics Dashboard:** Graphical widgets showcasing weekly visitation trends, doctor interest breakdowns, product focus distributions, and upcoming calendars.
5. **System Settings:** Configurations displaying database connection status and toggles to run the system in **LLM Mock Mode** (local regex-rule parser) for evaluation without API keys.

Every page in the CRM is fully database-driven. Dashboard widgets, HCP profiles, interaction history, calendar events, AI recommendations, relationship scores, and follow-up tasks automatically update in real time after every successful AI interaction.

---

## Directory Structure

```text
/project-root
│  docker-compose.yml
│  .env.example
│  .env
│  README.md
│
├─backend
│  │  Dockerfile
│  │  requirements.txt
│  └─app
│      │  config.py
│      │  database.py
│      │  models.py
│      │  schemas.py
│      │  main.py
│      ├─api
│      │      auth.py
│      │      chat.py
│      │      dashboard.py
│      │      doctors.py
│      │      followups.py
│      │      interactions.py
│      └─langgraph
│              agent.py
│              tools.py
│
└─frontend
    │  Dockerfile
    │  package.json
    │  tsconfig.json
    │  vite.config.ts
    └─src
        │  App.tsx
        │  main.tsx
        │  index.css
        │  theme.ts
        ├─components
        │      Layout.tsx
        ├─pages
        │      Dashboard.tsx
        │      DoctorProfile.tsx
        │      History.tsx
        │      LogInteraction.tsx
        │      Login.tsx
        │      NotFound.tsx
        │      Settings.tsx
        ├─services
        │      api.ts
        └─store
            │  index.ts
            └─slices
                    authSlice.ts
                    chatSlice.ts
                    dashboardSlice.ts
                    doctorSlice.ts
                    followupSlice.ts
                    interactionSlice.ts
```

---

## LangGraph AI Coordinator & Tools

The LangGraph coordinator maintains a state machine (`AgentState`) containing the conversation context and message history. When a representative communicates with the AI Assistant, the coordinator uses the LLM to decide user intent and execute specific actions using a suite of custom tools. We have implemented **five (5) specific tools** in [tools.py](file:///c:/Users/a/OneDrive/Desktop/TASKS/CRM/backend/app/langgraph/tools.py):

### 1. `log_interaction_tool` (Log Interaction — Required)
* **Objective:** Capture, analyze, and log conversational interactions.
* **LLM Entity Extraction:** Extracts entities like the HCP/doctor's name, hospital name, specialization, products discussed, meeting notes, interest level, and next optimal follow-up date.
* **Sentiment Analysis:** Integrates an automatic rule-based NLP engine to determine if the discussion note was **Positive**, **Neutral**, or **Negative** based on terminology indicators.
* **Auto-Resolution:** Automatically checks if the target doctor profile exists. If not, it creates a new profile in the database on-the-fly and initializes their details.
* **Syncing Layouts:** Returns a complete JSON entity structure, triggering real-time pre-filling of the left structured form fields on the split screen.

### 2. `edit_interaction_tool` (Edit Interaction — Required)
* **Objective:** Allow direct modifications of already-logged database interactions.
* **Database Updates:** Takes the target `interaction_id` and a dictionary of `updates` containing modified parameters (e.g. modified date, changed products, rewritten discussion notes).
* **Cascade Changes:** Retrieves the target entry from SQLAlchemy ORM, updates values, and automatically re-evaluates the notes for updated sentiment and summaries before committing. If the follow-up date was updated, it synchronizes the associated calendar reminder.

### 3. `hcp_relationship_intelligence_tool`
* **Objective:** Evaluate and calculate comprehensive relationship indicators.
* **Functionality:** Dynamically computes the doctor's **Relationship Score**, **Sales Opportunity Score**, **Churn Risk Level**, **AI Summary**, and **Next Best Action** recommendations based on recent interaction recency and frequency trends.

### 4. `schedule_followup_tool`
* **Objective:** Add or update calendar tasks linked to interactions.
* **Functionality:** Parses relative dates (e.g., *"next Friday"*) and schedules reminders in the database follow-ups table.

### 5. `next_best_action_tool`
* **Objective:** Compute AI recommendations based on interaction logs.
* **Functionality:** Analyzes the duration since the last visit to calculate **HCP Churn Risk** (High/Medium/Low), schedules the next optimal visit date, and selects target products + literature materials to present.

---

## LangGraph Tools Summary

```text
LangGraph Tools
✔ Log Interaction
✔ Edit Interaction
✔ HCP Relationship Intelligence
✔ Smart Follow-up Planner
✔ Next Best Action Engine
```

---

## Demo Workflow

1. **User logs into the CRM.**
2. **Dashboard loads live KPIs.**
3. **Representative opens Log Interaction.**
4. **Representative describes the visit using natural language.**
5. **LangGraph identifies the intent.**
6. **Appropriate AI Tool executes.**
7. **Structured entities are extracted.**
8. **Interaction is stored in SQLite.**
9. **Follow-up is scheduled automatically.**
10. **Relationship score recalculates.**
11. **Dashboard widgets refresh automatically.**
12. **AI generates the Next Best Action recommendation.**

---

## Real-Time Synchronization

The application automatically refreshes all connected modules after every interaction. This includes:
* Dashboard KPIs
* Recent Activities
* AI Insights
* HCP Directory
* Relationship Scores
* Calendar
* Pending Follow-ups
* Interaction History
* Next Best Action Recommendations

No manual refresh is required.

---

## AI Capabilities

* **Natural Language Processing**
* **Structured Entity Extraction**
* **Automatic Sentiment Analysis**
* **Relationship Intelligence**
* **Follow-up Planning**
* **Churn Risk Prediction**
* **Opportunity Detection**
* **Product Recommendation**
* **Next Best Action Recommendation**

---

## Authentication

* **JWT Authentication**
* **Protected Routes**
* **Role-based Login**
* **Medical Representative Dashboard**
* **Persistent Session Management**

---

## Enterprise Features

* **Modular Architecture**
* **Database Driven**
* **REST APIs**
* **Redux State Management**
* **LangGraph Agent Orchestration**
* **SQLite / PostgreSQL Support**
* **Docker Ready**
* **Production Deployment Ready**

---

## Database Configuration (MySQL & Postgres Support)

Our database layer utilizes the **SQLAlchemy ORM** engine configured in [database.py](file:///c:/Users/a/OneDrive/Desktop/TASKS/CRM/backend/app/database.py). Because SQLAlchemy abstracts sql dialects, the project is **fully database-agnostic**.

You can switch the database engine dynamically by updating the `DATABASE_URL` in your [.env](file:///c:/Users/a/OneDrive/Desktop/TASKS/CRM/.env) file:
* **PostgreSQL:** Set `DATABASE_URL=postgresql://user:password@localhost:5432/crm_db`
* **MySQL:** Set `DATABASE_URL=mysql+pymysql://user:password@localhost:3306/crm_db`
* **SQLite (Local Testing):** Set `DATABASE_URL=sqlite:///./crm.db`

*Note: The project includes a complete [docker-compose.yml](file:///c:/Users/a/OneDrive/Desktop/TASKS/CRM/docker-compose.yml) which spins up a production PostgreSQL database container and automatically binds it to the FastAPI backend and static Nginx frontend, handling migrations and schema setups on startup.*

---

## Quick Setup Instructions

### Environment Configuration
Create a `.env` file at the root of the project:
```env
DATABASE_URL=sqlite:///./crm.db
SECRET_KEY=supersecretjwtkeyforcrmapplication2026!
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GROQ_API_KEY=your_groq_api_key_here
MOCK_LLM=True
```
*Note: If `MOCK_LLM` is set to `True` (or if `GROQ_API_KEY` is left blank), the backend will automatically fallback to an intelligent rule-based parsing engine. This matches all tools and extraction shapes, enabling full evaluation without Groq API keys.*

---

### Step-by-Step Local Run

#### 1. Backend Server Setup
From the project root:
```bash
# Create python virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate      # Windows PowerShell
source venv/bin/activate    # macOS/Linux

# Install python requirements
pip install -r backend/requirements.txt

# Run the FastAPI server in production-ready reload host mode
python -m uvicorn app.main:app --app-dir backend --port 8000 --host 0.0.0.0 --reload
```

#### 2. Database Seeding & Verification (Demo Readiness)
With the backend server running, you can seed the database with the pre-populated 3-Phase production dataset and run the integrity checker:
```bash
# Seed the master data (10 HCPs, 5 products, 5 planned visits, 0 historical interactions)
.\venv\Scripts\python seed_db.py

# Run the database integrity audit & verification checklist
.\venv\Scripts\python verify_audit.py
```

#### 3. Frontend Client Setup
From the `frontend` directory:
```bash
# Install NPM packages
npm install

# Run Vite dev server exposed on host network
npm run dev -- --host
```
*Note: Exposing the servers on host network (`--host 0.0.0.0` and `--host`) allows multiple devices connected to the same Wi-Fi/Hotspot network to access the web application concurrently.*

Open **`http://<YOUR_HOST_IP>:5173`** on your browser (or localhost: `http://localhost:5173`).

---

## Evaluation Credentials
To log in immediately, use the seeded representative credentials:
* **Email:** `representative@crm.com`
* **Password:** `password123`
* **Role:** Medical Representative

---

## Verification Checklist

The application includes an automated terminal verification suite. Run:
```bash
.\venv\Scripts\python verify_audit.py
```
This confirms:
- **Authentication**: `representative@crm.com` account is active and operational.
- **HCP Directory**: 10 distinct doctors populated in SQLite.
- **Product Portfolio**: 5 core pharmaceutical products populated.
- **Calendar**: 5 future planned visits correctly scheduled.
- **Interaction History**: 100% empty (ready for live recording of the first interaction).
- **Dashboard & Search**: Dynamic metrics loaded, search engine supporting cities and specializations.
- **AI Engine Connectivity**: Connected and loaded with `gemma2-9b-it` model profile.
