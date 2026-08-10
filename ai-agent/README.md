# QuickShow AI — Phases 1–2

A separate, read-only Streamlit prototype using LangChain and Groq. It calls the
existing QuickShow backend and does not connect directly to MongoDB.

## Current capabilities

- List movies currently playing in QuickShow.
- Search by title, cast, genre, language, or minimum rating.
- Fetch movie details and available show dates/times.
- Find currently vacant seats in a preferred row for an exact showtime.
- Refuse seat holds, booking, authentication, and admin operations until later phases.

## Setup (PowerShell)

From the repository root:

```powershell
cd .\ai-agent
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e .
Copy-Item .env.example .env
```

Open `.env` and replace `your_groq_api_key` with your Groq API key.
The default `openai/gpt-oss-20b` model supports Groq tool calling.
Showtimes default to `Asia/Kolkata`; change `DISPLAY_TIMEZONE` if needed.

Choose one backend:

```dotenv
# Local Node backend (npm run start in server/)
QUICKSHOW_API_URL=http://localhost:3000

# OR deployed backend; local Node server is not required
QUICKSHOW_API_URL=https://book-show-server.vercel.app
```

Then run:

```powershell
streamlit run app.py
```

Streamlit normally opens `http://localhost:8501` automatically.

## Private FastAPI service

The integration API reuses the same agent and backend tools as Streamlit. Add a
long random `AI_SERVICE_SECRET` to `.env`, then run:

```powershell
uvicorn api:app --reload --port 8000
```

Health check:

```http
GET http://localhost:8000/health
```

Chat requests require the shared secret:

```http
POST http://localhost:8000/chat
X-AI-Service-Key: your-shared-secret
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Which movies are currently playing?"}
  ]
}
```

## Node proxy configuration

Add these values to `server/.env`:

```dotenv
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_SECRET=the_same_value_used_by_the_python_service
```

The authenticated user-facing endpoint is then:

```http
POST http://localhost:3000/api/ai/chat
Authorization: Bearer <Clerk session token>
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Which movies are currently playing?"}
  ]
}
```

## Architecture

```text
User -> Streamlit chat -> Groq model -> allowlisted LangChain tools
                                      -> QuickShow REST API -> MongoDB/Redis
```

Groq decides which read-only tool is needed. Python executes that tool against
the existing backend, and the model converts the returned JSON into a concise
answer. The backend remains the source of truth.
