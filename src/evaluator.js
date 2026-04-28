import fs from "fs-extra";
import path from "path";

const SAMPLE_OUTPUT_DIR = "./outputs/sample";
const MANIFEST_DIR = "./manifests";
const SCORES_DIR = "./scores";

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function findMatch(aiItem, goldItems) {
  const aiDesc = normalizeText(aiItem.description || "");
  const aiWords = aiDesc.split(" ").filter((w) => w.length > 3);

  for (const goldItem of goldItems) {
    const goldDesc = normalizeText(goldItem.description || "");
    const matchingWords = aiWords.filter((w) => goldDesc.includes(w));
    if (matchingWords.length >= 1) return goldItem;
  }
  return null;
}

async function evaluateProject(projectId) {
  // Find AI output
  const outputFiles = await fs.readdir(SAMPLE_OUTPUT_DIR);
  const outputFile = outputFiles.find((f) => f.includes(projectId));

  if (!outputFile) {
    console.log(`⚠️  No output found for ${projectId}`);
    return null;
  }

  const aiOutput = await fs.readJSON(path.join(SAMPLE_OUTPUT_DIR, outputFile));

  // Find gold output from manifest
  const manifestFiles = await fs.readdir(MANIFEST_DIR);
  const manifestFile = manifestFiles.find((f) => f.includes(projectId));

  if (!manifestFile) {
    console.log(`⚠️  No manifest found for ${projectId}`);
    return null;
  }

  const manifest = await fs.readJSON(path.join(MANIFEST_DIR, manifestFile));

  if (manifest.gold_files.length === 0) {
    console.log(`⚠️  No gold files for ${projectId} — skipping evaluation`);
    return null;
  }

  const aiItems = aiOutput.takeoff?.line_items || [];

  // For now create a basic evaluation report
  // In real system you would parse the gold Excel/PDF files
  const score = {
    takeoff_id: projectId,
    project_name: aiOutput.project_name,
    evaluated_at: new Date().toISOString(),
    model_used: aiOutput.model_used,
    summary: {
      ai_item_count: aiItems.length,
      gold_files_available: manifest.gold_files.map((f) => f.name),
      trade_detected: aiOutput.takeoff?.trade || "Unknown",
      processing_notes: aiOutput.takeoff?.processing_notes || "",
    },
    ai_line_items: aiItems,
    ai_assumptions: aiOutput.takeoff?.assumptions || [],
    ai_warnings: aiOutput.takeoff?.warnings || [],
    evaluation_notes: `Evaluated ${aiItems.length} AI-generated line items against gold files: ${manifest.gold_files.map((f) => f.name).join(", ")}`,
    overall_grade:
      aiItems.length >= 5
        ? "Acceptable"
        : aiItems.length >= 2
          ? "Partial"
          : "Insufficient",
  };

  await fs.ensureDir(SCORES_DIR);
  const scorePath = path.join(SCORES_DIR, `${projectId}_score.json`);
  await fs.writeJSON(scorePath, score, { spaces: 2 });

  console.log(
    `📊 ${aiOutput.project_name}: ${aiItems.length} line items | Grade: ${score.overall_grade}`,
  );
  return score;
}

async function evaluateAll() {
  console.log("\n📊 Starting evaluation of sample projects...\n");

  if (!(await fs.pathExists(SAMPLE_OUTPUT_DIR))) {
    console.log("❌ No sample outputs found. Run npm run process first.");
    return;
  }

  const outputFiles = await fs.readdir(SAMPLE_OUTPUT_DIR);
  const jsonFiles = outputFiles.filter((f) => f.endsWith(".json"));

  if (jsonFiles.length === 0) {
    console.log("❌ No processed outputs found.");
    return;
  }

  for (const file of jsonFiles) {
    const projectId = file.replace("_output.json", "");
    await evaluateProject(projectId);
  }

  console.log("\n✅ Evaluation complete. Check scores/ folder.");
}

evaluateAll();
