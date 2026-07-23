# 🤖 Sawyer WhatsApp Bot

A high-performance, lightweight, clean WhatsApp bot using the Baileys library. Built specifically for easy, sleep-free deployment on **Render** or **Koyeb**.

---

## ✨ Features

- **`.menu`** — Clean text menu displaying current bot state and command lists.
- **`.ping`** — Displays real-time speed in milliseconds (`⚡ Response time: *34ms*`).
- **`.sticker`** (or `.s`) — Converts images or video to WebP stickers.
- **`.vv`** — Forwards the view-once/last-sent media to the owner's DM.
- **`.antidelete <on/off>`** — Toggles deletion tracking. When enabled, deleted messages (including text, sender details, group metadata, and timestamp) are sent to the owner.
- **`.mode <public/private>`** — Swaps bot accessibility mode (persists across restarts).
- **`.setsudo` / `.delsudo` / `.getsudo`** — Allows managing additional numbers that can execute bot commands.

---

## 🚀 Quick Setup (Local)

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your details (especially `OWNER_NUMBER`).
3. **Start the bot:**
   ```bash
   npm start
   ```
4. **Link WhatsApp:**
   Scan the printed QR code in your terminal.

---

## 🖥️ Cloud Deployment

### Uptime Keep-Alive
The bot has a built-in keep-alive self-ping that sends a request to itself every 5 minutes to prevent Render or Koyeb containers from sleeping.

### Render Configuration
1. Create a new **Web Service** pointing to your GitHub repo.
2. Select the **Singapore** region (lowest latency for India).
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add all Environment Variables from your `.env` (including your pre-authenticated `SESSION_ID`).

### Koyeb Configuration
1. Create a new **Service** from your GitHub repo.
2. Set Runtime to **NodeJS**.
3. Build Command: `npm install`
4. Run Command: `npm start`
5. Set the port to `3000`.
6. Add all Environment Variables.

---

## ⚙️ Environment Variables

- `PREFIX` — Bot command prefix (default `.`).
- `OWNER_NUMBER` — Your WhatsApp number with country code (e.g. `919888280858`, no `+`).
- `OWNER_NAME` — Your display name (e.g. `Syam`).
- `BOT_NAME` — Bot display name.
- `MODE` — Default bot mode (`public` or `private`).
- `SESSION_ID` — Pre-authenticated session ID (highly recommended for cloud deploy).
- `SESSION_DIR` — Custom path for session credentials (uses `/tmp/sawyer-session` on cloud).
