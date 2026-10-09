# Care RAG Platform

Next.js frontend for the local PDF RAG + patient care notes system. Talks to a FastAPI service (in the sibling `../ollama` repo) which wraps the Python RAG pipeline (PyMuPDF/pdfplumber extraction, Ollama embeddings/chat/vision, ChromaDB).

## Stack
- Next.js (App Router) + Tailwind
- Prisma + SQLite (`prisma/schema.prisma`) — Users, Patients, Notes, Documents, PresetQuestions
- NextAuth.js (Credentials provider, JWT sessions, role-gated middleware: `ADMIN` / `NURSE`)
- react-pdf (pdfjs) for the citation-highlight PDF viewer

## Local setup

```bash
npm install
npx prisma migrate dev   # creates dev.db
npm run seed              # creates an admin user (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars, defaults admin@example.com / changeme123)
npm run dev
```

The FastAPI service must also be running (see `../ollama/api/main.py`):
```bash
cd ../ollama && source .venv/bin/activate
uvicorn api.main:app --host 127.0.0.1 --port 8000
```

`.env` variables: `DATABASE_URL`, `AUTH_SECRET`, `FASTAPI_BASE_URL`, `NOTE_UPLOADS_DIR`.

## Roles
- **Admin**: uploads/manages documents, manages preset questions, adds patients, creates nurse accounts, and can use Ask + view any patient profile.
- **Nurse**: views patients, writes care notes (text and/or photo), and runs trend analysis on a patient's note history.

No public registration route exists — the admin provisions every account.

## Remote access via Tailscale

Nurses reach this app from their own devices over a private [Tailscale](https://tailscale.com) mesh network — never over the public internet. Setup (done once, on this Mac, which runs the app):

1. **Install & sign in**:
   ```bash
   brew install --cask tailscale
   ```
   Open the Tailscale app, sign in (this opens a browser auth flow — pick whichever identity provider you want your tailnet tied to). Then run:
   ```bash
   tailscale up
   tailscale ip -4   # note this address, or use MagicDNS name shown in the admin console
   ```
2. **Authorize each nurse's device**: install the Tailscale app on their phone/laptop, sign in, then approve the device from https://login.tailscale.com/admin/machines. A device is unreachable until explicitly approved here — this is the actual access-control boundary, not a login page.
3. **Only Next.js needs to be tailnet-reachable.** It proxies to FastAPI over `localhost:8000` on the same machine, so FastAPI itself never needs to be exposed.
4. **Get a real HTTPS cert** for the tailnet hostname (needed for secure-context browser APIs like camera access when nurses attach note photos):
   ```bash
   tailscale cert <your-magicdns-name>.ts.net
   tailscale serve https / http://localhost:3000
   ```
   Nurses then hit `https://<your-magicdns-name>.ts.net` instead of a bare IP:port.
5. **Production start** (instead of `npm run dev`):
   ```bash
   npm run build
   npm run start   # binds 0.0.0.0:3000 by default
   ```
6. **Checklist**: confirm your home router has no port-forwarding rule for 3000/8000 — reachability should come only from the tailnet, never the public internet.

This is a technical safeguard (private network + auth), not a HIPAA compliance certification — no BAA, no formal audit logging, no compliance sign-off.


cloudflared tunnel --url http://localhost:3000 > /tmp/cloudflared.log 2>&1 &

pkill -f "cloudflared tunnel"
# ollamaweb
