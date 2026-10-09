# Deploying the Care RAG Platform on a Mac mini (auto-start on boot)

This sets up three services to run on boot, headless, with no one logged in:

1. **Ollama** — local LLM/embeddings server (port 11434)
2. **FastAPI backend** (`../ollama` repo) — RAG pipeline (port 8000)
3. **Next.js app** (this repo) — the web UI (port 3000)

All three are managed by `launchd` (macOS's boot/service manager) as **LaunchDaemons**, which start at boot before any user logs in — unlike LaunchAgents, which only start after login. Run everything as the real local user (not root) so file ownership on the two project folders stays normal.

Replace `APPLEUSER` below with the actual short username (`whoami`), and adjust paths if the repos live somewhere other than `/Users/APPLEUSER/Documents`.

---

## 1. One-time machine setup

```bash
# Prevent the Mac mini from sleeping (it must stay up to serve nurses)
sudo pmset -a sleep 0 disksleep 0 displaysleep 10

# Xcode command line tools (needed to build native deps like better-sqlite3)
xcode-select --install

# Homebrew, if not already installed
command -v brew >/dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js and Python
brew install node python@3.12

# Ollama
brew install ollama
```

Copy (or `git clone`) both project folders onto this Mac:
- `/Users/APPLEUSER/Documents/ollama` (FastAPI + RAG pipeline)
- `/Users/APPLEUSER/Documents/ollama-web` (Next.js app)

---

## 2. Ollama: install models and run as a service

`brew services` already manages Ollama via `launchd` for you — no custom plist needed.

```bash
brew services start ollama

# Pull the models this app uses
ollama pull qwen2.5:7b-instruct
ollama pull qwen2.5vl:7b
ollama pull nomic-embed-text
```

Verify: `curl http://localhost:11434/api/tags`

`brew services start ollama` already registers itself to run at every boot. Confirm with `brew services info ollama` (should show `loaded: true`, `running: true`).

---

## 3. FastAPI backend setup

```bash
cd /Users/APPLEUSER/Documents/ollama
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
```

No `.env` file is required by this service — it only talks to Ollama on `localhost:11434`.

---

## 4. Next.js app setup

```bash
cd /Users/APPLEUSER/Documents/ollama-web
npm install
```

Create `.env` (if not already present) with:

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<generate with: openssl rand -base64 32>"
FASTAPI_BASE_URL="http://127.0.0.1:8000"
NOTE_UPLOADS_DIR="./uploads/notes"
OASIS_UPLOADS_DIR="./public/uploads/oasis"
```

```bash
npx prisma migrate deploy        # creates/updates dev.db
npm run seed                     # creates the first admin user
npm run build                    # production build
```

Note the admin credentials printed by `npm run seed` (or the `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` env vars you set before running it).

---

## 5. Create the launchd service for FastAPI

Create `/Library/LaunchDaemons/com.carerag.fastapi.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.carerag.fastapi</string>
  <key>UserName</key><string>APPLEUSER</string>
  <key>WorkingDirectory</key><string>/Users/APPLEUSER/Documents/ollama</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/APPLEUSER/Documents/ollama/.venv/bin/uvicorn</string>
    <string>api.main:app</string>
    <string>--host</string><string>127.0.0.1</string>
    <string>--port</string><string>8000</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/Users/APPLEUSER/Library/Logs/carerag-fastapi.log</string>
  <key>StandardErrorPath</key><string>/Users/APPLEUSER/Library/Logs/carerag-fastapi.log</string>
</dict>
</plist>
```

## 6. Create the launchd service for Next.js

Create `/Library/LaunchDaemons/com.carerag.nextjs.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.carerag.nextjs</string>
  <key>UserName</key><string>APPLEUSER</string>
  <key>WorkingDirectory</key><string>/Users/APPLEUSER/Documents/ollama-web</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/npm</string>
    <string>run</string>
    <string>start</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/Users/APPLEUSER/Library/Logs/carerag-nextjs.log</string>
  <key>StandardErrorPath</key><string>/Users/APPLEUSER/Library/Logs/carerag-nextjs.log</string>
</dict>
</plist>
```

`npm run start` binds `0.0.0.0:3000` by default (per this app's README), which is what lets `tailscale serve` proxy to it.

Find your actual `npm` path first with `which npm` — on Apple Silicon Homebrew it's `/opt/homebrew/bin/npm`, on Intel Homebrew it's `/usr/local/bin/npm`. Adjust the plist if different.

Both plists depend on FastAPI and Ollama being reachable; `KeepAlive: true` means launchd restarts the process if it crashes, so a slow Ollama startup at boot just causes a few early retries rather than a permanent failure.

---

## 7. Load the services

```bash
sudo launchctl bootstrap system /Library/LaunchDaemons/com.carerag.fastapi.plist
sudo launchctl bootstrap system /Library/LaunchDaemons/com.carerag.nextjs.plist

# Verify they're running
sudo launchctl list | grep carerag
curl http://localhost:8000/health
curl -I http://localhost:3000/login
```

These will now start automatically on every boot — no login required.

---

## 8. Tailscale (remote access for nurses)

Already documented in this repo's `README.md` under "Remote access via Tailscale" — follow that section once the services above are confirmed running locally. In short: `tailscale up`, approve devices, `tailscale cert` + `tailscale serve https / http://localhost:3000`.

---

## Managing the services afterward

```bash
# Restart after a code change (rebuild first for Next.js)
cd /Users/APPLEUSER/Documents/ollama-web && npm run build
sudo launchctl kickstart -k system/com.carerag.nextjs
sudo launchctl kickstart -k system/com.carerag.fastapi

# Stop / unload
sudo launchctl bootout system/com.carerag.nextjs
sudo launchctl bootout system/com.carerag.fastapi

# Tail logs
tail -f ~/Library/Logs/carerag-fastapi.log
tail -f ~/Library/Logs/carerag-nextjs.log
```

## Deploying updates later

```bash
cd /Users/APPLEUSER/Documents/ollama && git pull   # or re-copy files
cd /Users/APPLEUSER/Documents/ollama-web && git pull
npm install
npx prisma migrate deploy
npm run build
sudo launchctl kickstart -k system/com.carerag.fastapi
sudo launchctl kickstart -k system/com.carerag.nextjs
```
