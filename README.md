# 🚌 Smart Transport System v3
**Thy Covenant Montessori School — S.Y. 2025–2026**

Real-time jeepney passenger monitoring with live animated jeepneys on an interactive Leaflet map.

---

## ✨ What's New in v3

- **3 animated jeepneys** — all moving simultaneously on the map at different positions
- **Smooth rotation** — jeepney icon rotates to face the correct direction of travel
- **Geolocation API** — click "📍 My Location" to see your position on the map (free, browser-native)
- **Leaflet + OpenStreetMap** — 100% free, no API key needed
- **No server required** — pure static site, works anywhere
- **Vercel-ready** — deploy in under 1 minute

---

## 🚀 Deploy to Vercel (Free)

### Option A — Vercel CLI (fastest)

```bash
# 1. Install Vercel CLI (one-time)
npm install -g vercel

# 2. In this folder:
vercel

# 3. Follow the prompts — accept defaults
# Your site will be live at https://your-project.vercel.app
```

### Option B — Vercel Dashboard (no CLI)

1. Go to [vercel.com](https://vercel.com) → Sign up / Log in (free)
2. Click **"Add New Project"**
3. Drag and drop this entire folder into the upload area, OR connect your GitHub repo
4. Click **Deploy** — done! ✅

> No build step needed. Vercel auto-detects this as a static site.

---

## 📁 Project Structure

```
smart-transport-v3/
├── vercel.json        ← Routing config (dashboard page)
├── index.html         ← Landing page with mini map preview
├── dashboard.html     ← Main dashboard
├── style.css          ← All styles
├── jeep-common.js     ← Route data, animation engine, jeepney SVG
├── dashboard.js       ← Dashboard logic + geolocation
└── script.js          ← Landing page mini-map
```

---

## 🗺️ Route

**Market! Market! Terminal → C5 Road → Gate 3 → AFPOVAI Phase 1 → 7/11 Stop**  
(Taguig City, Metro Manila)

---

## 🛠️ Tech Stack

| Technology | Purpose | Cost |
|---|---|---|
| Leaflet.js | Interactive map | Free |
| OpenStreetMap | Map tiles | Free |
| Browser Geolocation API | User GPS | Free |
| Vercel | Hosting | Free |
| Vanilla JS/HTML/CSS | Everything else | Free |

**Total cost: ₱0** 🎉

---

## 📊 Capacity System

| Status | Passengers | Color |
|---|---|---|
| ✅ AVAILABLE | 0–14 | 🟢 Green |
| ⚠️ ALMOST FULL | 15–19 | 🟡 Yellow |
| 🚨 FULL | 20 | 🔴 Red |

---

*Thy Covenant Montessori School · Senior High School Department · Research Project S.Y. 2025–2026*
