// scripts/sync-public-images.mjs
import { mkdir, cp } from "node:fs/promises";
import { resolve } from "node:path";

const mappings = [
  { from: "src/assets/hero",  to: "public/hero"  },
  { from: "src/assets/brand", to: "public/brand" },
  { from: "src/assets/img",   to: "public/img"   },
  // add more folders if you have them
];

async function syncDir(from, to) {
  const absFrom = resolve(from);
  const absTo = resolve(to);
  await mkdir(absTo, { recursive: true });
  await cp(absFrom, absTo, { recursive: true, force: true });
  console.log(`[sync] ${from} → ${to}`);
}

await Promise.all(mappings.map(m => syncDir(m.from, m.to)));
console.log("[sync] done");
