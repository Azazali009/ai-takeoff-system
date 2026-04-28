import { execSync } from "child_process";

console.log("🚀 Running full pipeline...\n");

console.log("STEP 1: Ingesting projects...");
execSync("node src/ingestor.js", { stdio: "inherit" });

console.log("\nSTEP 2: Processing with AI...");
execSync("node src/processor.js", { stdio: "inherit" });

console.log("\nSTEP 3: Evaluating sample projects...");
execSync("node src/evaluator.js", { stdio: "inherit" });

console.log("\n🎉 Full pipeline complete!");
