import Groq from "groq-sdk";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MANIFEST_DIR = "./manifests";

const TAKEOFF_PROMPT = `You are an expert construction takeoff estimator with 20 years experience.

Your job is to extract PHYSICAL construction quantities from construction documents.

IMPORTANT RULES:
- Extract ONLY physical work items with real measurable quantities
- Focus on: dimensions, areas, lengths, counts of physical materials and work
- Good examples: "450 SF interior wall painting", "120 LF copper pipe 3/4 inch", "24 EA recessed light fixtures"
- BAD examples: meetings, notifications, insurance, permits, administrative items
- If drawings appear to be image-based with no extractable text, clearly state this
- Look for quantity data in: specifications, scope of work, schedules, addendums
- Common units: SF (square feet), LF (linear feet), EA (each), CY (cubic yards), LS (lump sum)
- If text is available but quantities are unclear, make reasonable estimates and flag them
- If truly no quantity data exists in the text, return what you can and explain in processing_notes

Return ONLY valid JSON. No explanation. No markdown. No backticks. Just raw JSON:

{
  "project_summary": "brief description of the physical construction work",
  "trade": "Painting or Electrical or HVAC or Carpentry or Tile or Flooring or Plumbing etc",
  "line_items": [
    {
      "id": "LI-001",
      "description": "specific physical work item with material and location",
      "quantity": 450.00,
      "unit": "SF",
      "source_reference": "which file and page this came from",
      "assumption": "any assumption made to calculate this quantity",
      "warning": "any uncertainty about this measurement",
      "confidence": "high or medium or low"
    }
  ],
  "assumptions": ["overall assumption 1"],
  "warnings": ["warning 1"],
  "missing_information": ["what drawings or specs would improve accuracy"],
  "processing_notes": "which files had useful text vs image-based PDFs that need vision/OCR tools"
}`;

async function extractTextFromPDF(filePath) {
  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || "";
  } catch (err) {
    return `[Could not extract text from PDF: ${err.message}]`;
  }
}

async function getFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  try {
    if (ext === ".pdf") {
      const text = await extractTextFromPDF(filePath);
      return `=== FILE: ${fileName} ===\n${text}\n`;
    }
    if ([".txt", ".md", ".csv", ".json"].includes(ext)) {
      const text = await fs.readFile(filePath, "utf-8");
      return `=== FILE: ${fileName} ===\n${text}\n`;
    }
    if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      return `=== IMAGE FILE: ${fileName} - image file, text not extractable ===\n`;
    }
    if ([".xlsx", ".xls", ".docx", ".doc"].includes(ext)) {
      return `=== BINARY FILE: ${fileName} - ${ext} format ===\n`;
    }
    return `=== FILE: ${fileName} - unsupported format ${ext} ===\n`;
  } catch (err) {
    return `=== FILE: ${fileName} - read error: ${err.message} ===\n`;
  }
}

async function processProject(manifestPath) {
  const manifest = await fs.readJSON(manifestPath);
  console.log(`\n🔄 Processing: ${manifest.project_name}`);
  console.log(
    `   Set: ${manifest.set} | Input files: ${manifest.input_files.length}`,
  );

  if (manifest.input_files.length === 0) {
    console.log("   ⚠️  No input files — skipping");
    return null;
  }

  // Separate files by priority
  const adminKeywords = [
    "rules",
    "regulations",
    "insurance",
    "wage",
    "amendment",
  ];
  const highPriorityKeywords = [
    "spec",
    "scope",
    "schedule",
    "addendum",
    "detail",
  ];

  const adminFiles = [];
  const highPriorityFiles = [];
  const normalFiles = [];

  for (const file of manifest.input_files) {
    const lower = file.name.toLowerCase();
    if (adminKeywords.some((k) => lower.includes(k))) {
      adminFiles.push(file);
    } else if (highPriorityKeywords.some((k) => lower.includes(k))) {
      highPriorityFiles.push(file);
    } else {
      normalFiles.push(file);
    }
  }

  // Process in priority order: high priority first, then normal, admin last
  const orderedFiles = [...highPriorityFiles, ...normalFiles, ...adminFiles];

  let combinedContent = "";
  let usefulTextFound = false;

  for (const file of orderedFiles) {
    console.log(`   📄 Reading: ${file.name}`);
    const content = await getFileContent(file.path);

    // Check if this file has real text content
    const textLength = content.replace(/\s/g, "").length;
    if (textLength > 100) {
      usefulTextFound = true;
      console.log(`   ✅ Text extracted: ${textLength} chars`);
    } else {
      console.log(`   ⚠️  Image-based PDF — no text extractable`);
    }

    combinedContent += content + "\n";

    // Stop adding content if we are near token limit
    if (combinedContent.length > 13000) {
      console.log(`   📊 Token limit reached — stopping file reading`);
      break;
    }
  }

  if (!usefulTextFound) {
    console.log(
      `   ⚠️  All files are image-based — architecture note will explain vision approach`,
    );
  }

  // Limit content to avoid token limits
  const truncated = combinedContent.slice(0, 14000);

  const fullPrompt = `${TAKEOFF_PROMPT}

=== PROJECT NAME: ${manifest.project_name} ===

${truncated}`;

  let takeoffOutput;
  try {
    console.log("   🤖 Sending to Groq AI...");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are an expert construction takeoff estimator. Always respond with valid JSON only. No markdown, no backticks, no explanation.",
        },
        {
          role: "user",
          content: fullPrompt,
        },
      ],
    });

    const rawText = completion.choices[0]?.message?.content || "";

    // Clean and parse JSON
    const cleaned = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      takeoffOutput = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (err) {
    console.log(`   ⚠️  Issue: ${err.message}`);
    takeoffOutput = {
      error: err.message,
      project_summary: "Processing failed",
      trade: "Unknown",
      line_items: [],
      assumptions: [],
      warnings: [`Processing error: ${err.message}`],
      missing_information: [],
      processing_notes: "Failed to process",
    };
  }

  // Save output
  const outputFolder =
    manifest.set === "sample" ? "./outputs/sample" : "./outputs/challenge";

  await fs.ensureDir(outputFolder);

  const finalOutput = {
    takeoff_id: manifest.takeoff_id,
    project_name: manifest.project_name,
    set: manifest.set,
    processed_at: new Date().toISOString(),
    model_used: "groq/llama-3.3-70b-versatile",
    input_files_processed: manifest.input_files.map((f) => f.name),
    takeoff: takeoffOutput,
  };

  const outputFile = path.join(
    outputFolder,
    `${manifest.takeoff_id}_output.json`,
  );

  await fs.writeJSON(outputFile, finalOutput, { spaces: 2 });
  console.log(`   ✅ Saved: ${outputFile}`);

  // Delay to respect rate limits
  await new Promise((r) => setTimeout(r, 2000));

  return finalOutput;
}

async function processAll() {
  console.log("\n🤖 Starting AI processing with Groq...\n");

  const manifestFiles = await fs.readdir(MANIFEST_DIR);
  const jsonFiles = manifestFiles.filter((f) => f.endsWith(".json"));

  if (jsonFiles.length === 0) {
    console.log("❌ No manifests found. Run npm run ingest first.");
    return;
  }

  console.log(`Found ${jsonFiles.length} manifests to process\n`);

  let success = 0;
  let failed = 0;

  for (const mf of jsonFiles) {
    const manifestPath = path.join(MANIFEST_DIR, mf);
    try {
      const result = await processProject(manifestPath);
      if (result) success++;
      else failed++;
    } catch (err) {
      console.log(`   ❌ Failed: ${mf} — ${err.message}`);
      failed++;
    }
  }

  console.log(
    `\n✅ Processing complete. Success: ${success} | Failed: ${failed}`,
  );
}

processAll();
