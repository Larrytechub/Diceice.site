import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const output = join(root, "dist");
const assetPattern = /\.(?:js|css|svg|txt)$/i;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
const assets = entries
  .filter((entry) => entry.isFile() && assetPattern.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (!assets.includes("smartcharts.js") || !assets.includes("smartcharts.css")) {
  throw new Error("Required SmartCharts assets are missing from the repository root.");
}

const manifest = { version: 1, source: "repository root", files: [] };

for (const name of assets) {
  const source = join(root, name);
  const destination = join(output, name);
  const contents = await readFile(source);
  await copyFile(source, destination);
  const fileInfo = await stat(source);
  manifest.files.push({
    path: name,
    bytes: fileInfo.size,
    sha256: createHash("sha256").update(contents).digest("hex")
  });
}

await writeFile(join(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("Built " + assets.length + " assets into dist/ and wrote dist/manifest.json");
