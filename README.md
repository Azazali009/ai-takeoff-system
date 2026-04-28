# AI Takeoff Builder — Assessment Submission

## What This System Does
This is a backend prototype that ingests construction project files, extracts structured takeoff line items using AI, evaluates AI output against human reference outputs, and documents a human correction loop.

## Tech Stack
- Node.js (ES Modules)
- Groq API — llama-3.3-70b-versatile (free tier)
- pdf-parse — text extraction from PDFs
- fs-extra — file system handling

## Setup Instructions

### Step 1 — Install Node.js
Download from nodejs.org (version 18 or higher)

### Step 2 — Go into the project folder
```bash
cd Desktop/ai-takeoff-system
```

### Step 3 — Install dependencies
```bash
npm install
```

### Step 4 — Add API key
Create a .env file in the root folder with this content:
```
GROQ_API_KEY=your_groq_api_key_here
```
Get a free key from console.groq.com — no credit card needed.

### Step 5 — Add dataset
Place project folders in:
- data/01_sample_projects/ — sample projects with expected outputs
- data/02_challenge_projects/ — challenge projects input files only

### Step 6 — Run the full pipeline
```bash
# Step 1: Build project manifests
npm run ingest

# Step 2: Process projects through AI
npm run process

# Step 3: Evaluate sample project outputs
npm run evaluate

# OR run everything at once
npm run all
```

## Project Structure
```
ai-takeoff-system/
├── data/
│   ├── 01_sample_projects/      # 3 sample projects with gold outputs
│   ├── 02_challenge_projects/   # 25 challenge projects inputs only
│   └── 03_output_template/      # expected output shape
├── src/
│   ├── ingestor.js              # reads folders, builds manifests
│   ├── processor.js             # sends files to Groq AI
│   ├── evaluator.js             # scores AI vs gold outputs
│   └── runAll.js                # runs full pipeline
├── outputs/
│   ├── sample/                  # 3 processed sample outputs
│   └── challenge/               # 25 processed challenge outputs
├── manifests/                   # project manifest JSONs
├── scores/                      # evaluation score reports
├── README.md
├── CANDIDATE_REVIEW_PACKET.md
└── .env
```

## What Tools Were Used
- Groq API / llama-3.3-70b-versatile — AI line item extraction
- pdf-parse — deterministic PDF text extraction
- All scoring and file handling — deterministic code, no AI

## What Is Automated vs Manual
| Task | Type |
|---|---|
| Folder ingestion and manifest creation | Automated |
| PDF text extraction | Automated |
| AI takeoff extraction | Automated (Groq API) |
| Output saving | Automated |
| Scoring vs gold outputs | Automated (deterministic) |
| Human correction loop | Manual (documented in schema) |

## Known Limitations
1. Image-based PDFs cannot be read by pdf-parse — vision/OCR needed
2. Groq free tier has daily token limit of 100k tokens per day
3. Quantities default to EA when drawings are not text-readable
4. Multi-trade projects need per-trade extraction logic

## What I Would Improve With Another Week
1. Add Google Vision API or AWS Textract for image-based PDFs
2. Add per-trade specialized prompts for better accuracy
3. Build Supabase database to store all runs, corrections and scores
4. Add human review interface in Next.js
5. Build rerun logic that skips already-processed projects
6. Add confidence scoring per project not just per line item
