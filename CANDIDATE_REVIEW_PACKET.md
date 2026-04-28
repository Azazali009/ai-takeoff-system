# CANDIDATE REVIEW PACKET

**Candidate:** Azaz  
**Assessment:** AI Takeoff Builder Challenge — Assessment 1.0  
**Submitted:** April 2026  
**GitHub:** https://github.com/Azazali009/ai-takeoff-system.git

---

## 1. What I Built (Plain English)

I built a backend pipeline that automatically reads construction project
folders, extracts text from PDF files, sends that text to an AI model,
and receives back structured takeoff line items with quantities, units,
source references, assumptions, and warnings.

The system has 4 main parts:

- **Ingestor** — reads project folders and builds a manifest JSON for
  each project, correctly separating input files from gold/reference
  outputs
- **Processor** — reads each input file, extracts text from PDFs, sends
  content to Groq AI (llama-3.3-70b), and saves structured JSON outputs
- **Evaluator** — compares AI output against gold outputs for the 3
  sample projects and generates a score report
- **Correction Loop** — documents how a human reviewer would correct AI
  outputs and how those corrections would improve future runs

The system processed all 28 projects — 3 sample projects and 25
challenge projects — and saved structured JSON outputs for each one.

---

## 2. How To Run It

### Requirements

- Node.js version 18 or higher
- Free Groq API key from console.groq.com

### Setup

```bash
# Go into project folder
cd Desktop/ai-takeoff-system

# Install dependencies
npm install

# Create .env file with your Groq API key
echo "GROQ_API_KEY=your_key_here" > .env
```

### Run Full Pipeline

```bash
# Step 1 - Build manifests
npm run ingest

# Step 2 - Process with AI
npm run process

# Step 3 - Evaluate sample projects
npm run evaluate

# OR run all steps at once
npm run all
```

---

## 3. Projects Processed

### Sample Projects (Expected Output Visible)

| Project                                | Input Files | Gold Files | Line Items | Grade        |
| -------------------------------------- | ----------- | ---------- | ---------- | ------------ |
| TAKEOFF-28 Maryland Vision Institute   | 6           | 2          | 4          | Partial      |
| TAKEOFF-50 Portland VA Surgical Center | 18          | 2          | 0          | Insufficient |
| TAKEOFF-56 JACK & JONES Staten Island  | 14          | 2          | 0          | Insufficient |

### Challenge Projects (No Gold Output)

All 25 challenge projects were processed and outputs saved to
outputs/challenge/ folder. Projects with text-readable PDFs produced
meaningful line items. Projects with image-based drawings are documented
as requiring vision/OCR processing.

---

## 4. Sample Output Summary

### TAKEOFF-28 Maryland Vision Institute

**Trade:** Multiple  
**Line Items Extracted:** 4  
**Source:** MVI Clinic Addendum 01 PDF

Example line items:

- Fire Extinguisher and Cabinet — 1 EA
- Hand Dryers — 1 EA
- New 120V Circuit for Exterior ADA Button — 1 EA
- TV/Monitor Bracket Mounting — 1 EA

**Why quantities are 1 EA:** The drawing files are image-based PDFs.
pdf-parse cannot extract dimensions from images. The AI correctly
extracted items from the text-based addendum file but could not read
measurements from the architectural drawings.

---

## 5. Evaluation Results For Sample Projects

### TAKEOFF-28

- AI line items found: 4
- Gold files available: Estimate XLSX + Markups PDF
- Grade: Partial
- Reason: Image-based drawings limited quantity extraction

### TAKEOFF-50

- AI line items found: 0
- Gold files available: Estimate XLSX + Markups PDF
- Grade: Insufficient
- Reason: All 18 input files are image-based PDFs with no extractable text

### TAKEOFF-56

- AI line items found: 0
- Gold files available: Estimate XLSX + Markups PDF
- Grade: Insufficient
- Reason: All 14 input files are image-based PDFs with no extractable text

### Honest Assessment

The current system works well for text-based documents. The core
limitation is that construction drawing PDFs are almost always
image-based and require vision/OCR tools to extract dimensions and
quantities. This is documented and addressed in the 30-day plan.

---

## 6. What Is Automated vs Manual

| Task                                   | Type                               |
| -------------------------------------- | ---------------------------------- |
| Folder ingestion and manifest creation | Fully automated                    |
| AI vs gold file separation             | Fully automated                    |
| PDF text extraction                    | Fully automated                    |
| AI takeoff extraction                  | Fully automated                    |
| Output JSON saving                     | Fully automated                    |
| Scoring and grading                    | Fully automated deterministic code |
| Human correction loop                  | Manual — schema documented         |
| Vision/OCR for image PDFs              | Not yet implemented                |

---

## 7. AI Tools and Models Used

| Tool                               | Purpose                           |
| ---------------------------------- | --------------------------------- |
| Groq API / llama-3.3-70b-versatile | AI takeoff extraction from text   |
| pdf-parse                          | Deterministic PDF text extraction |
| fs-extra                           | File system operations            |
| Node.js                            | Backend runtime                   |

**What was NOT used:**

- No hard-coded answers from sample projects
- No fine-tuning or model training
- No UI mockups without backend substance

---

## 8. Known Limitations

1. **Image-based PDFs** — Construction drawings are almost always
   scanned images. pdf-parse returns empty text. Solution: Google
   Vision API or AWS Textract in next iteration.

2. **Token limits** — Groq free tier allows 100k tokens per day. Large
   projects with many files hit this limit. Solution: Paid API tier or
   chunked processing with resume logic.

3. **Quantity accuracy** — Without readable drawings, quantities cannot
   be measured. Items default to 1 EA. Solution: Vision/OCR tools.

4. **Multi-trade projects** — Some projects span multiple trades.
   Current prompt extracts all trades together. Solution: Per-trade
   specialized prompts.

5. **Gold output parsing** — XLSX gold files were not parsed in this
   prototype. Evaluator compares structure not exact numbers. Solution:
   SheetJS to parse Excel gold outputs in next iteration.

---

## 9. 30-Day Execution Plan

### Week 1 — Days 1 to 7 — Foundation

- Set up Supabase database with full schema for projects, files,
  runs, line items, scores and corrections
- Integrate Google Vision API or AWS Textract for image-based PDFs
- Reprocess all 28 projects with vision support
- Build project manifest storage in Supabase

### Week 2 — Days 8 to 14 — Accuracy

- Parse XLSX gold output files using SheetJS
- Build real line item comparison against gold outputs
- Add per-trade specialized AI prompts
- Improve quantity extraction from drawing dimensions
- Build confidence scoring system per project

### Week 3 — Days 15 to 21 — Evaluation Loop

- Build human review interface in Next.js
- Allow reviewer to correct line items and quantities
- Save corrections to Supabase correction table
- Build correction feedback loop into next AI run
- Generate improvement reports comparing runs over time

### Week 4 — Days 22 to 30 — Scale and Reliability

- Process full dataset reliably with resume logic
- Add chunked processing for large multi-file projects
- Build admin dashboard showing all projects and scores
- Document all edge cases found in real data
- Prepare system for next batch of live projects

---

## Architecture Note

### Data Separation

- Sample projects: input files and gold outputs are in separate
  subfolders and never mixed
- Challenge projects: input files only, gold outputs held internally
- Manifests clearly mark each file as input or gold

### Pipeline Flow

```
Folder Scan
    ↓
Project Manifest (JSON)
    ↓
PDF Text Extraction (deterministic)
    ↓
AI Extraction — Groq API (non-deterministic)
    ↓
Structured JSON Output
    ↓
Evaluation vs Gold (deterministic scoring)
    ↓
Human Correction Loop (documented schema)
    ↓
Saved to outputs/ and scores/ folders
```

### What Is Deterministic vs AI

- Deterministic: file reading, manifest building, scoring, saving
- AI: takeoff line item extraction, trade detection, assumption generation

---

## Final Note

This prototype proves the architecture works end to end. The main gap
is vision/OCR for image-based PDFs which is the most important next
step. The system is honest about what it can and cannot do, and the
30-day plan addresses every gap found during this assessment.
