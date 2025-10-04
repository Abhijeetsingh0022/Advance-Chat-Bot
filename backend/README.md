# Advanced Chat Bot — FastAPI Backend

This repository hosts a FastAPI backend for an advanced chat bot. It focuses on:

- secure user authentication (JWT)
- chat session management (single-turn and multi-turn)
- pluggable AI provider integrations (OpenRouter, Gemini, Groq, others)
- persistence: SQLite for local dev, MongoDB or Postgres for production

This document gives a concise quickstart, environment configuration, a short API reference, security guidance, and links to examples.

## Quickstart (5 minutes)

1. Clone the repository and cd into it.
2. Create and activate a Python virtual environment:

   python3 -m venv .venv
   source .venv/bin/activate

3. Install the project requirements:

   pip install -r requirements.txt

4. Copy the environment template and fill in values (do not commit secrets):

   cp .env.example .env

5. Apply database migrations (if using Alembic / SQL schema):

   alembic upgrade head

6. Run the app locally:

   uvicorn app.main:app --reload

Open the interactive API docs at: http://127.0.0.1:8000/docs

## Environment variables (summary)

Create a `.env` file from `.env.example`. Key variables:

- **DATABASE_URL**: SQLAlchemy URL, e.g. `sqlite:///./chatbot.db` (dev) or a Postgres URL (prod)
- **MONGO_URI**: optional MongoDB connection string for storing chat history or analytics
- **SECRET_KEY**: **REQUIRED** - Strong secret key (minimum 32 characters) used for JWT signing and cryptographic operations. Generate with:
  ```bash
  python -c 'import secrets; print(secrets.token_urlsafe(32))'
  ```
  ⚠️ **Security Warning**: The application will refuse to start if SECRET_KEY is not set or is insecure.
- **ALGORITHM**: JWT algorithm (`HS256` - symmetric key signing)
- **ACCESS_TOKEN_EXPIRE_MINUTES**: access token lifetime in minutes

Security-related (strongly recommended to set in production):
- SECURITY__JWT_SECRET: JWT signing secret (long & random)
- SECURITY__JWT_EXPIRES_IN: JWT expiry in seconds
- SECURITY__BCRYPT_ROUNDS: bcrypt work factor for password hashing (e.g., 12)

Email and AI provider keys should be stored securely (do not commit):

- EMAIL__GMAIL_FROM_EMAIL, EMAIL__GMAIL_APP_PASSWORD
- AI_SERVICES__OPEN_ROUTER_API_KEY_1, AI_SERVICES__OPEN_ROUTER_API_KEY_2, AI_SERVICES__GROQ_API_KEY, AI_SERVICES__GEMINI_API_KEY

See `.env.example` for a safe template.

## Authentication & security contract

Inputs:
- JSON HTTP requests to REST endpoints (POST/GET) or WebSocket messages for streaming.

Outputs:
- JSON responses; streaming via WebSocket or SSE where supported.

Errors and status codes:
- 200 OK / 201 Created — success
- 400 Bad Request — validation errors
- 401 Unauthorized — invalid or missing token
- 403 Forbidden — insufficient permissions
- 429 Too Many Requests — rate limiting
- 500 Internal Server Error — unexpected failures

Authentication flow (typical):

1. POST /api/auth/register — create an account with email & password.
2. POST /api/auth/login — exchange credentials for an access token (JWT).
3. Call protected endpoints with header: `Authorization: Bearer <access_token>`.

Token expiry and refresh:
- Access tokens are short lived (configured via `ACCESS_TOKEN_EXPIRE_MINUTES`).
- If refresh tokens are implemented in your app, use them to mint new access tokens.

## Minimal API reference (canonical)

These are the core endpoints you should expect. Check the app's OpenAPI docs for exact schemas.

- POST /api/auth/register — body: { email, password } (with validation: email must be valid, password 8-128 chars)
- POST /api/auth/login — form data: username (email), password (validates email format)
- GET /api/users/me — returns current user profile (protected)
- POST /api/chat — { message, session_id? } → returns a reply
- POST /api/chat/stream — streaming reply (SSE) or WebSocket endpoint for chunked responses
- GET /api/history — list conversation sessions for the user

Notes:
- `session_id` can be omitted for new conversations. When provided, the server uses it to maintain context.
- Streaming endpoints may require different clients (curl with -N for SSE, or WebSocket clients).

## Developer tips

- Local dev: use SQLite and a small mocked AI provider to avoid using real API quota.
- Tests: mock AI provider HTTP calls in unit tests to keep them deterministic.
- Logging: redact secrets and API keys from logs before shipping to production.

## Security best practices

- Never commit `.env` with production secrets. Use a secrets manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault).
- Use HTTPS in production and enable appropriate TLS ciphers.
- Use strong, random values for `SECRET_KEY` and `SECURITY__JWT_SECRET` and rotate them regularly.
- Harden CORS and rate-limit client requests to protect provider quota and costs.

## Deployment notes

- For production scale, prefer a managed Postgres (or Mongo) instance instead of SQLite.
- Use a process manager (Gunicorn + Uvicorn workers) or containerize and deploy behind a load balancer.
- For streaming WebSockets, ensure sticky sessions or run a shared pub/sub layer (Redis) to coordinate messages.

## Extending providers

Create provider adapters that:

- accept a normalized input (message + context)
- call the provider API (with retries and timeouts)
- normalize responses to the app's chat response schema

Respect provider rate limits and expose per-user quotas.

## Troubleshooting

- Server won't start: check `.env` and required variables.
- 401 responses: confirm the JWT secret and algorithm match client expectations.
- Database errors: confirm `DATABASE_URL` and run migrations.

## Where to look next

- Live API docs: `/docs` (OpenAPI) — single source-of-truth for request/response shapes.
- Examples: `docs/API_EXAMPLES.md` — curl and Postman snippets.

---

If you'd like, I can also:

- generate a minimal runnable FastAPI app matching this documentation (routes + auth + in-memory store), or
- provide a Postman collection JSON and a small Python example script that demonstrates authenticating and chatting.

Tell me which you'd prefer and I will create it and run a quick smoke test.

## Run the example backend

1. Create and activate a virtual environment and install requirements:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Start the server:

```bash
uvicorn app.main:app --reload
```

3. Run tests:

```bash
pytest -q
```

This scaffold is intentionally minimal and focuses on security-ready patterns: hashed passwords, JWT access tokens, dependency-based user resolution, and a pluggable provider layer.

## API Examples

Practical examples to exercise the common endpoints. Replace `http://127.0.0.1:8000` with your deployment URL and substitute real tokens/values where noted.

Prerequisites:
- The app is running locally (e.g. `uvicorn app.main:app --reload`).
- You have a working Python environment for the optional Python example.

### 1) Register (create user)

Request (curl):

curl -sS -X POST "http://127.0.0.1:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SuperSecret123!"}'

Successful response (201 or 200):

{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2025-01-01T12:00:00Z"
}

Errors to expect:
- 400 Bad Request — invalid email or password too short/long
- 422 Unprocessable Entity — validation errors from Pydantic### 2) Login — get an access token

Request (curl):

curl -sS -X POST "http://127.0.0.1:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=SuperSecret123!"

Response (200):

{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 1800
}

Errors to expect:
- 400 Bad Request — invalid email format
- 401 Unauthorized — incorrect credentials### 3) Single-turn chat (JSON)

Request (authenticated):

curl -sS -X POST "http://127.0.0.1:8000/api/chat" \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer <ACCESS_TOKEN>" \
   -d '{"message":"Hello, how are you?","session_id":null}'

Response (example):

{
   "message_id": "uuid-or-int",
   "reply": "Hi — I'm an AI assistant. How can I help you today?",
   "model": "openai/gpt-4-like",
   "usage": {"tokens": 45},
   "created_at": "2025-01-01T12:01:00Z"
}

Notes:
- `session_id` = null starts a new conversation; supply an existing `session_id` to continue context.
- Large replies may be streamed via SSE or WebSocket.

### 4) Streaming responses

WebSocket (if implemented):

- Connect to: `ws://127.0.0.1:8000/api/chat/ws?token=<ACCESS_TOKEN>` or use an Authorization header if preferred.
- Send a JSON payload like: `{"message":"Tell me a short story about a curious fox","session_id":null}`.
- Server will send chunked messages followed by a final completion.

SSE (Server-Sent Events):

curl -N -sS -H "Accept: text/event-stream" \
   -H "Authorization: Bearer <ACCESS_TOKEN>" \
   -X POST "http://127.0.0.1:8000/api/chat/stream" \
   -H "Content-Type: application/json" \
   -d '{"message":"Stream me a poem about autumn","session_id":null}'

Note: Use `-N` to disable curl buffering and see events as they arrive.

### 5) Conversation history (pagination)

Request:

curl -sS -X GET "http://127.0.0.1:8000/api/history?page=1&per_page=20" \
   -H "Authorization: Bearer <ACCESS_TOKEN>"

Response (example):

{
   "items": [
      {"session_id":"abc","last_message":"...","updated_at":"2025-01-01T12:02:00Z"}
   ],
   "page": 1,
   "per_page": 20,
   "total": 5
}

### 6) Get current authenticated user

curl -sS -X GET "http://127.0.0.1:8000/api/users/me" \
   -H "Authorization: Bearer <ACCESS_TOKEN>"

Response:

{
   "id": 1,
   "email": "user@example.com",
   "is_active": true
}

### 7) Error shapes

Standard error response body:

{
   "detail": "Error message here"
}

Status codes to handle:
- 401 Unauthorized — missing/invalid token
- 403 Forbidden — insufficient permissions
- 429 Too Many Requests — rate limiting
- 500 Internal Server Error — provider or server failure

### 8) Postman quick setup

1. Create a new collection named `ChatBot API`.
2. Add environment variables: `base_url` (e.g., `http://127.0.0.1:8000`) and `access_token`.
3. Create `Register` request: POST `{{base_url}}/api/auth/register` with JSON body.
4. Create `Login` request and add test script to save token:

pm.test('save token', function() {
   var json = pm.response.json();
   pm.environment.set('access_token', json.access_token);
});

5. For protected requests, add header: `Authorization: Bearer {{access_token}}`.

### 9) Minimal Python example (requests)

This small script demonstrates register → login → chat. It assumes `requests` is installed.

```python
import requests

BASE = 'http://127.0.0.1:8000'

def register(email, password):
      r = requests.post(f'{BASE}/api/auth/register', json={'email': email, 'password': password})
      r.raise_for_status()
      return r.json()

def login(email, password):
      r = requests.post(f'{BASE}/api/auth/login', json={'email': email, 'password': password})
      r.raise_for_status()
      return r.json()['access_token']

def chat(token, message, session_id=None):
      headers = {'Authorization': f'Bearer {token}'}
      r = requests.post(f'{BASE}/api/chat', json={'message': message, 'session_id': session_id}, headers=headers)
      r.raise_for_status()
      return r.json()

if __name__ == '__main__':
      email = 'user@example.com'
      password = 'SuperSecret123!'
      register(email, password)
      token = login(email, password)
      resp = chat(token, 'Hello, how are you?')
      print(resp)
```

### Tips for testing AI provider integration

- Use a mock provider or recorded fixtures during tests to avoid billing and variability.
- Add retries with exponential backoff for transient provider errors (429/5xx).
- Limit request size and guard against abusive user inputs.

---

If you'd like, I can generate a Postman collection JSON or create a minimal runnable FastAPI app (with these routes stubbed) and run a quick smoke test. Which would you prefer?
