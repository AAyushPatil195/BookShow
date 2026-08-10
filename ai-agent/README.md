# QuickShow AI

QuickShow's LangChain and Groq movie assistant. The Python service calls the
existing Express APIs and never connects directly to MongoDB.

## Current capabilities

- List and search currently playing movies by title, cast, genre, language, or rating.
- Fetch movie details and timezone-correct showtimes.
- Find live vacant seats by row.
- Prepare a validated booking draft for 1-5 seats; React requires `BOOK` before calling Stripe booking APIs.
- Fetch the signed-in user's three newest bookings with `isPaid` shown as true or false.

Movie, show, booking, and user IDs remain internal. Recent booking records are
formatted locally and are never sent back to Groq.

## Setup (PowerShell)

```powershell
cd .\ai-agent
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e .
Copy-Item .env.example .env
```

Configure `.env`:

```dotenv
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
QUICKSHOW_API_URL=http://localhost:3000
DISPLAY_TIMEZONE=Asia/Kolkata
AI_SERVICE_SECRET=replace_with_a_long_random_secret
```

`AI_SERVICE_SECRET` must match the value in `server/.env`.

## Development services

Streamlit playground:

```powershell
streamlit run app.py
```

Private FastAPI service:

```powershell
uvicorn api:app --reload --port 8000
```

Node proxy configuration in `server/.env`:

```dotenv
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_SECRET=the_same_value_used_by_the_python_service
```

The browser calls only the Clerk-protected Node endpoint:

```http
POST http://localhost:3000/api/ai/chat
Authorization: Bearer <Clerk session token>
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Show my latest three bookings and payment status."}
  ]
}
```

Express derives the user ID from Clerk and adds it to the private FastAPI
request. Clients cannot choose which user's booking history is queried.

## Architecture

```text
React widget
  -> Express + Clerk authentication
  -> private FastAPI agent
  -> Groq chooses an allowlisted tool
  -> QuickShow REST APIs -> MongoDB
```

Booking history follows a stricter path: Groq chooses the no-argument tool,
then Express fetches the authenticated user's three newest records and Python
formats them locally without returning private records to Groq.
