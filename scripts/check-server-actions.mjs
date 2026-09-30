#!/usr/bin/env node
/**
 * Every export of a 'use server' module becomes a publicly callable
 * endpoint. This guard fails the build if such a module exports anything
 * other than an async function (types are erased and allowed), and flags
 * server actions that never call a viewer/permission check.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(name)) files.push(full);
  }
})(root);

let problems = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (!/^\s*['"]use server['"]/.test(src)) continue;
  const rel = path.relative(process.cwd(), file);
  for (const m of src.matchAll(/^export\s+(?!async\s+function\b)(?!type\b)(?!interface\b)(.*)$/gm)) {
    console.error(`✗ ${rel}: non-async-function export → "${m[0].slice(0, 80)}"`);
    problems++;
  }
  for (const m of src.matchAll(/^export async function (\w+)[\s\S]*?(?=^export |\Z)/gm)) {
    const body = m[0];
    if (!/requireViewerOrThrow|readSession|getRequestMeta|destroyCurrentSession|editableTask\(/.test(body)) {
      console.error(`✗ ${rel}: action ${m[1]} has no authentication check`);
      problems++;
    }
  }
}
if (problems) {
  console.error(`\n${problems} server-action problem(s).`);
  process.exit(1);
}
console.log(`✓ server actions OK (${files.filter((f) => /^\s*['"]use server['"]/.test(readFileSync(f, 'utf8'))).length} modules checked)`);
