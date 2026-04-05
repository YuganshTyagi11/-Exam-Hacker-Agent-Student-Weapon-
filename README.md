# Exam Hacker Agent (Student Weapon)

A lightweight, browser-only web app that helps students turn syllabus files and past papers into:

- **Important topics** (frequency-weighted)
- **Likely exam questions** (extracted + generated)
- **A practical study plan** based on exam date and daily hours

The app runs entirely in the browser using vanilla HTML/CSS/JS and PDF.js from CDN.

## Features

- Upload **multiple** syllabus files (`.pdf`, `.txt`, `.md`)
- Upload **multiple** past paper files (`.pdf`, `.txt`, `.md`)
- Automatic keyword/topic scoring
- Likely-question extraction from past papers
- Fallback question generation templates
- Exam-date-aware study plan generation
- No backend required

## Tech Stack

- `index.html` – UI structure
- `styles.css` – styling and responsive layout
- `app.js` – parsing, analysis, and rendering logic
- `pdf.js` – PDF text extraction via CDN import

## Local Development

Because this project uses module scripts and browser APIs, serve it with a local HTTP server (don’t open via `file://`).

### Option 1: Python

```bash
python3 -m http.server 8080
```

Open: `http://localhost:8080`

### Option 2: Node (serve)

```bash
npx serve .
```

## Usage

1. Open the app in your browser.
2. Upload at least one **syllabus** file.
3. Upload at least one **past paper** file.
4. (Optional) Select exam date and adjust hours/day.
5. Click **Generate Strategy**.

## Deploy on Render (Static Site)

This is a static front-end app, so deploy it as a **Static Site** on Render.

### 1) Push this repo to GitHub

If not already done:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2) Create a new Static Site on Render

1. Go to [https://render.com](https://render.com) and sign in.
2. Click **New +** → **Static Site**.
3. Connect your GitHub account/repository.
4. Select this repository.

### 3) Configure build settings

Use these settings:

- **Name:** `exam-hacker-agent` (or any name)
- **Branch:** `main`
- **Build Command:** *(leave empty)*
- **Publish Directory:** `.`

Then click **Create Static Site**.

### 4) Verify deployment

After build finishes, Render will provide a URL like:

`https://your-site-name.onrender.com`

Open it and test file upload + strategy generation.

## Optional: `render.yaml` (Blueprint)

If you prefer infra-as-code, you can add this file at repo root:

```yaml
services:
  - type: web
    name: exam-hacker-agent
    env: static
    staticPublishPath: .
    buildCommand: ""
```

Then create from **Blueprint** in Render.

## Notes / Limitations

- PDF extraction quality depends on selectable text in PDFs.
- Scoring is heuristic-based (not AI/LLM-backed).
- Very large PDFs may process slowly in browser on low-end devices.

## License

You can add any license you prefer (e.g., MIT).
