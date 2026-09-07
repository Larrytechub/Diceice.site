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
if (!entries.some((entry) => entry.isFile() && entry.name === "index.html")) {
  throw new Error("index.html is required for the Vercel landing page.");
}

const files = [...assets, "index.html"];
const manifest = { version: 1, source: "repository root", files: [] };

for (const name of files) {
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
await copyFile(join(root, "src/deriv-config.js"), join(output, "deriv-config.js"));
console.log("Built " + files.length + " files into dist/ and wrote dist/manifest.json");
