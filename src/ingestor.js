import fs from "fs-extra";
import path from "path";

const SAMPLE_DIR = "./data/01_sample_projects";
const CHALLENGE_DIR = "./data/02_challenge_projects";
const MANIFEST_DIR = "./manifests";

async function getFilesFromFolder(folderPath) {
  const files = [];
  if (!(await fs.pathExists(folderPath))) return files;

  const items = await fs.readdir(folderPath);
  for (const item of items) {
    const fullPath = path.join(folderPath, item);
    const stat = await fs.stat(fullPath);
    if (!stat.isDirectory()) {
      files.push({ name: item, path: fullPath });
    }
  }
  return files;
}

async function buildManifest(projectPath, setType) {
  const projectName = path.basename(projectPath);

  // Look specifically inside Project Files/ and Expected Manual Output/
  const projectFilesPath = path.join(projectPath, "Project Files");
  const expectedOutputPath = path.join(projectPath, "Expected Manual Output");

  let inputFiles = [];
  let goldFiles = [];

  // Get input files from Project Files subfolder
  if (await fs.pathExists(projectFilesPath)) {
    inputFiles = await getFilesFromFolder(projectFilesPath);
  } else {
    // Fallback: if no Project Files subfolder, read root level
    const allFiles = await getFilesFromFolder(projectPath);
    inputFiles = allFiles.filter((f) => {
      const lower = f.name.toLowerCase();
      return (
        !lower.includes("expected") &&
        !lower.includes("output") &&
        !lower.includes("manual") &&
        !lower.includes("estimate") &&
        !lower.includes("markup")
      );
    });
  }

  // Get gold files from Expected Manual Output subfolder
  if (setType === "sample" && (await fs.pathExists(expectedOutputPath))) {
    goldFiles = await getFilesFromFolder(expectedOutputPath);
  }

  const manifest = {
    takeoff_id: projectName,
    project_name: projectName,
    set: setType,
    input_files: inputFiles,
    gold_files: goldFiles,
    expected_output_visible: setType === "sample",
    status: "pending",
    created_at: new Date().toISOString(),
  };

  await fs.ensureDir(MANIFEST_DIR);
  const savePath = path.join(MANIFEST_DIR, `${projectName}.json`);
  await fs.writeJSON(savePath, manifest, { spaces: 2 });

  console.log(`  ✅ ${projectName}`);
  console.log(
    `     Input files: ${inputFiles.length} | Gold files: ${goldFiles.length}`,
  );
  if (inputFiles.length > 0) {
    inputFiles.forEach((f) => console.log(`     📄 ${f.name}`));
  }
  if (goldFiles.length > 0) {
    goldFiles.forEach((f) => console.log(`     🥇 ${f.name}`));
  }

  return manifest;
}

async function ingestAll() {
  console.log("\n📦 Starting ingestion...\n");

  // Clear old manifests first
  await fs.emptyDir(MANIFEST_DIR);
  console.log("🗑️  Cleared old manifests\n");

  let total = 0;

  // Sample projects
  console.log("--- Sample Projects ---");
  if (await fs.pathExists(SAMPLE_DIR)) {
    const items = await fs.readdir(SAMPLE_DIR);
    for (const item of items) {
      const fullPath = path.join(SAMPLE_DIR, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await buildManifest(fullPath, "sample");
        total++;
      }
    }
  }

  // Challenge projects
  console.log("\n--- Challenge Projects ---");
  if (await fs.pathExists(CHALLENGE_DIR)) {
    const items = await fs.readdir(CHALLENGE_DIR);
    for (const item of items) {
      const fullPath = path.join(CHALLENGE_DIR, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await buildManifest(fullPath, "challenge");
        total++;
      }
    }
  } else {
    console.log("  ⏳ Challenge folder empty — still downloading");
  }

  console.log(`\n✅ Ingestion complete. Total manifests: ${total}`);
}

ingestAll();
