# Installing & Publishing AETHER

AETHER is a **local-first AI Principal Engineer Workstation & PWA**. There's no account system
and no cloud database — every install runs on the person's own machine (`127.0.0.1`), using
their own Gemini key, and storing chat history locally on disk under `data/conversations/`
(excluded from git). Nothing about you or them gets sent anywhere except the Gemini API
call itself.

---

## Part 1 — Install it on your own machine (do this first)

1. `npm install`
2. `cp .env.example .env` and add your `GOOGLE_API_KEY` (free at
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
3. `npm run build && npm start` (production mode — the install prompt below
   only shows up on a production build, not `npm run dev`)
4. Open `http://localhost:3000` in Chrome or Edge.
5. Look for an **install icon in the address bar** (desktop) — or on
   **mobile**, open the browser menu and tap **"Add to Home Screen"** /
   **"Install app."**
6. It now opens in its own window/icon, like a real app — no browser chrome,
   no address bar. Works on Windows, Mac, Linux, Android, and iOS (Safari
   supports "Add to Home Screen" too, though the install *prompt* is a
   Chrome/Edge-specific UI).

That's it — that's genuinely "installed." Nothing left to do for personal use.

---

## Part 2 — Publishing so other people can install it

You have two real options. They trade off differently — read both before
picking.

### Option A — Publish the source code (recommended, matches "no server")

Other people clone the repo, install it, and run it **on their own machine**
with **their own** free Gemini key. This is the truest version of what you
asked for: no server you have to run or pay for, ever.

**Steps:**
1. Create a GitHub account if you don't have one, and a new repository (e.g.
   `aether-agent`).
2. In this project folder: `git init`, `git add .`, `git commit -m "AETHER v1"`.
3. `git remote add origin https://github.com/<your-username>/aether-agent.git`
4. `git push -u origin main`
5. Make sure `.env` is **not** committed — check `.gitignore` already excludes
   it (it does).
6. Anyone who wants it now runs Part 1's steps against your repo instead of a
   zip file: `git clone`, `npm install`, add their own key, `npm run build && npm start`.
7. Optional polish: add a short GIF/screenshot to the README so people know
   what they're installing before they clone it.

**What this costs you:** nothing. No hosting bill, no server to maintain,
no uptime to worry about at 2am.

**What it asks of the other person:** they need Node.js installed and a free
Gemini key — a five-minute setup, not an app-store download. Worth saying so
plainly if you're publicizing it (e.g. a LinkedIn post, a portfolio page).

### Option B — Host a live demo people can just open in a browser

This is closer to "big chat AI" in *feel* (visit a URL, no setup) — but it
does mean a server exists somewhere, running continuously, and someone (you)
is responsible for it. Worth being clear-eyed about before choosing this.

**Steps (Vercel, free tier, easiest path for a Next.js app):**
1. Push the repo to GitHub (Option A, steps 1-4).
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, "Import
   Project," select the repo.
3. In the project's Environment Variables settings, add `GOOGLE_API_KEY` —
   this becomes **your** key, shared by everyone who visits the deployed URL.
4. Deploy. You get a public `https://your-project.vercel.app` URL.

**The real tradeoff to understand:** every visitor's requests use *your*
Gemini quota. The free tier (10 req/min, ~1,500 req/day on Flash models) is
shared across **everyone** who opens the link, not per-visitor. A handful of
active users will exhaust it fast, and everyone gets 429 errors — including
you. This is solvable (per-user API keys entered client-side, or a waitlist,
or eventually a paid tier), but it's genuinely more work than Option A and
reintroduces exactly the "server I have to think about" problem you were
trying to avoid. Start with Option A; revisit this only if you specifically
want a zero-setup public demo link for a portfolio/resume, and are fine
capping how many people can use it at once.

---

## Which one should you actually do?

For a CV/portfolio project: **do both, in this order.** Option A first (it's
free, it's the "real" architecture, and a GitHub repo with good commits and a
clear README is itself the portfolio artifact recruiters look at). Option B
second, *only* if you want a clickable demo link to put in your CV — treat it
as a limited-capacity showcase, not the primary way people are meant to use
AETHER.
