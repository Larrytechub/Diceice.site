import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const output = join(root, "dist");
const assetPattern = /\.(?:js|css|svg|txt)$/i;
const derivConfig = await readFile(join(root, "src/deriv-config.js"), "utf8");
const appIdMatch = derivConfig.match(/export const DERIV_APP_ID = "([^"]+)";/);
if (!appIdMatch) throw new Error("DERIV_APP_ID is missing from src/deriv-config.js.");
const derivAppId = appIdMatch[1];

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
  const original = await readFile(source);
  const contents = name === "index.html"
    ? Buffer.from(original.toString("utf8").replace(
        "wss://ws.derivws.com/websockets/v3?app_id=3396",
        `wss://ws.derivws.com/websockets/v3?app_id=${derivAppId}`
      ))
    : original;
  await writeFile(destination, contents);
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
