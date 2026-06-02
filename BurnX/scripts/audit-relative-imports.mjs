#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["app", "src"].map((d) => path.join(ROOT, d));

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const INDEX_FILES = ["index.ts", "index.tsx", "index.js", "index.jsx"];

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"](\.\.?\/[^'"]+)['"]|(?:import|export)\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function resolveImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;

  for (const ext of EXTENSIONS) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }

  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const idx of INDEX_FILES) {
      const p = path.join(base, idx);
      if (fs.existsSync(p)) return p;
    }
  }

  for (const idx of INDEX_FILES) {
    const p = path.join(base, idx);
    if (fs.existsSync(p)) return p;
  }

  return null;
}

function extractRelativeImports(content) {
  const specs = new Set();
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(content)) !== null) {
    const spec = m[1] || m[2];
    if (spec) specs.add(spec);
  }
  const sideRe = /import\s+['"](\.\.?\/[^'"]+)['"]/g;
  while ((m = sideRe.exec(content)) !== null) {
    specs.add(m[1]);
  }
  return [...specs];
}

const files = SCAN_DIRS.flatMap((d) => walk(d));
const broken = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const spec of extractRelativeImports(content)) {
    if (!resolveImport(file, spec)) {
      broken.push({ file: path.relative(ROOT, file), import: spec });
    }
  }
}

broken.sort((a, b) => a.file.localeCompare(b.file) || a.import.localeCompare(b.import));

console.log(`Scanned ${files.length} files under app/ and src/`);
console.log(`Unresolved relative imports: ${broken.length}`);
if (broken.length) {
  console.log("");
  for (const { file, import: imp } of broken) {
    console.log(`${file}  ->  "${imp}"`);
  }
  process.exit(1);
}
process.exit(0);
