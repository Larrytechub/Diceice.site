import { access, readdir } from "node:fs/promises";

const required = ["smartcharts.js", "smartcharts.css"];
for (const file of required) {
  await access(file);
}

const entries = await readdir(".", { withFileTypes: true });
const localeBundles = entries.filter(
  (entry) => entry.isFile() && /\.smartcharts\.js$/i.test(entry.name) && entry.name !== "smartcharts.js"
);

if (localeBundles.length === 0) {
  throw new Error("No locale or supporting SmartCharts bundles were found.");
}

console.log("Asset check passed: " + localeBundles.length + " supporting SmartCharts bundles found.");
