# AI-based Smart Citizen Service Management System

A full-stack prototype for government offices: citizens generate a queue
token from home (after uploading required documents and confirming a
predicted waiting time), track their position live, and get notified as
their turn approaches. Staff manage counters and the queue; admins manage
services, documents, counters, and analytics.

This is **not** an appointment-booking system — tokens join the *current*
live queue, there is no officer pre-verification of documents, and no
"best time to visit" recommendation.

## Architecture

```
citizen-service-system/
├── database/        MySQL schema + demo seed data
├── backend/         Node.js + Express + Socket.IO REST/real-time API
├── ai-service/       Python Flask + scikit-learn waiting-time predictor
└── frontend/         React + Vite + Tailwind (citizen / staff / admin UI)
```

The backend talks to MySQL directly and to the AI service over HTTP
(`POST /predict`). If the AI service is ever unreachable, the backend
falls back to a simple queue-math heuristic so the app keeps working.

---

## 1. Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+ and pip
- **MySQL** 8.0+ (or MariaDB 10.6+) running locally

---

## 2. Set up the database

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

This creates the `citizen_service_system` database with 6 sample
services, their required documents, 4 counters, sample completed tokens
(for AI historical averages), and 3 demo accounts.

**Demo logins (password for all: `Password123`)**
| Role | Email |
|---|---|
| Admin | admin@citizenservice.gov |
| Counter Staff | staff1@citizenservice.gov / staff2@citizenservice.gov |
| Citizen | asha@example.com / vikram@example.com / priya@example.com |

---

## 3. Run the AI prediction service (Python)

```bash
cd ai-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

On first run it trains a Random Forest Regressor on synthetic sample
data (a few seconds) and saves it to `waiting_time_model.joblib`, then
serves on **http://localhost:6000**. Check it's alive:

```bash
curl http://localhost:6000/health
```

To retrain later (e.g. after wiring it to real `service_history` data —
see the docstring in `train.py`): `python train.py`, or call
`POST /retrain` while the service is running.

---

## 4. Run the backend (Node.js)

```bash
cd backend
cp .env.example .env
# edit .env: set DB_PASSWORD to your MySQL password, and JWT_SECRET to any long random string
npm install
npm run dev        # or: npm start
```

Runs on **http://localhost:5000**. Check it's alive:

```bash
curl http://localhost:5000/api/health
```

The backend also runs a background job every 30 seconds that
auto-expires any "Called" token whose grace period
(`TOKEN_GRACE_PERIOD_MINUTES` in `.env`, default 5) has elapsed.

---

## 5. Run the frontend (React)

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. Log in with any of the
demo accounts above.

---

## 6. Trying the full flow

1. **Log in as a citizen** (asha@example.com) → *Services* → pick a
   service (e.g. Income Certificate).
2. Upload every document marked with `*` (any small PDF/JPG/PNG works —
   it's a prototype, so content isn't inspected).
3. Once all mandatory documents are uploaded, click **Check estimated
   waiting time** → review the prediction → **Generate Token** (or
   **Cancel** to back out — no token is created either way until you
   confirm).
4. You'll land on the **Token page**, which updates live via WebSocket
   as the queue moves.
5. **Open a second browser (or incognito window)**, log in as staff
   (staff1@citizenservice.gov), go to the **Counter Dashboard**, and
   click **Call Next Token** → **Start Service** → **Complete Service**.
   Watch the citizen's Token page update in real time, and check the
   in-app notification toast that appears as their turn approaches.
6. **Log in as admin** (admin@citizenservice.gov) to see live analytics,
   manage services/documents, and manage counters.

---

## Notes on the AI layer

Per the project requirements, no paid/third-party AI API is used for
prediction — only a locally trained `RandomForestRegressor`
(scikit-learn) served by the Flask microservice in `ai-service/`. It's
trained on realistic synthetic data (`ai-service/data/sample_data.py`)
that mirrors the real relationship between queue length, historical
service duration, active counters, and wait time. The model and
training data generator are cleanly separated (`model.py`, `train.py`)
so swapping in a model trained on real accumulated `service_history`
rows later requires no changes to the API contract.

## Security notes for going to production

This prototype implements password hashing (bcrypt), JWT auth,
role-based route protection, per-citizen document/token access control,
and file-type/size-validated uploads. Before real deployment you'd also
want: HTTPS everywhere, uploaded files served through an authenticated
proxy instead of the static `/uploads` route, refresh-token rotation,
rate limiting on auth endpoints, and a virus scan step on uploads.
