# Armatrix Team Page

A full-stack team directory for [armatrix.in](https://armatrix.in).

**Live Links**
- Frontend: https://armatrix-rho.vercel.app
- Backend: https://armatrix.onrender.com

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS, TypeScript |
| Backend | Python 3.11+, FastAPI, Pydantic v2 |
| Deployment | Vercel (FE) + Render (BE) |

---

## Project Structure

```
armatrix-team/
├── backend/
│   ├── main.py           # FastAPI app with all endpoints
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx          # Redirects → /team
    │   │   ├── globals.css
    │   │   └── team/
    │   │       └── page.tsx      # Server component, fetches data
    │   ├── components/
    │   │   └── TeamPageClient.tsx  # All interactive UI
    │   └── lib/
    │       └── api.ts            # Typed API client
    ├── .env.example
    └── ...config files
```

---

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API will be live at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
cp .env.example .env.local      # already set to localhost:8000
npm install
npm run dev
```

Open `http://localhost:3000` — it redirects to `/team`.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/team` | List all team members |
| GET | `/team/{id}` | Get single member |
| POST | `/team` | Create new member |
| PUT | `/team/{id}` | Update member |
| DELETE | `/team/{id}` | Delete member |

### Team Member Schema

```json
{
  "id": "uuid (auto-generated)",
  "name": "string (required)",
  "role": "string (required)",
  "bio": "string (required)",
  "photo_url": "string (optional)",
  "linkedin": "string (optional)",
  "twitter": "string (optional)",
  "tags": ["string"] 
}
```

---

## Deployment

### Backend → Render

1. Push to GitHub
2. Create new **Web Service** on [render.com](https://render.com)
3. Set:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Copy the public URL

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set root directory to `frontend`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL
4. Deploy

---

## Design Decisions

**Brand alignment** — matched armatrix.in's aesthetic: dark `#0a0a0a` background, white/cream typography (`#f5f5f0`), sparse grid-based layout, monospace accents (DM Mono), and an oversized display heading (Bebas Neue) consistent with the site's bold lettering style.

**Data storage** — in-memory dict seeded at startup. Fast to run anywhere, no DB setup required. A swap to SQLite or Postgres would be a one-file change in `main.py`.

**No auth on mutations** — as specified in the brief. Edit/Delete controls appear on card hover; the Add button is always visible in the nav.

**Server + Client components** — `/team/page.tsx` is a server component that fetches data at request time (no loading flash), then passes it to `TeamPageClient` which handles all interactions client-side.

**Fonts** — Bebas Neue (display headings) + DM Mono (labels, metadata) + DM Sans (body text). Avoids generic defaults while staying legible.

**Grain overlay** — subtle SVG noise texture via `body::before` for depth, matching the film-grain aesthetic common in hardware/deep-tech brands.

---

## What I'd improve with more time

- Persistent storage (SQLite → Postgres) with Alembic migrations
- Auth layer (JWT) to protect write endpoints
- Optimistic UI updates on mutations
- Image upload with S3/Cloudflare R2 instead of URL input
- Stagger animations using Framer Motion for more polish
- `/team/[id]` detail page with expanded bio

---

Built by **Aadit Singal**.