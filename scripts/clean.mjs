/**
 * 清理可重建的快取資料夾（不會動到 src / node_modules / 任何原始檔）。
 *
 *   node scripts/clean.mjs          → 刪除 .next（Next 建置與 Turbopack 快取）
 *   node scripts/clean.mjs --all    → 另外嘗試刪除上層的 .pnpm-store（pnpm 套件快取）
 *
 * 請先停止 dev server 再執行，否則 Windows 會鎖住 .next 內的檔案。
 */
import { existsSync, rmSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(projectRoot, "..");

const targets = [{ label: ".next", dir: path.join(projectRoot, ".next") }];
if (process.argv.includes("--all")) {
  targets.push({ label: "../.pnpm-store", dir: path.join(workspaceRoot, ".pnpm-store") });
}

function sizeOf(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    try {
      total += entry.isDirectory() ? sizeOf(full) : statSync(full).size;
    } catch {
      /* 被鎖住的檔案略過 */
    }
  }
  return total;
}

const dryRun = process.argv.includes("--dry-run");

for (const { label, dir } of targets) {
  if (!existsSync(dir)) {
    console.log(`skip  ${label}（不存在）`);
    continue;
  }
  const before = (sizeOf(dir) / 1024 / 1024).toFixed(1);
  if (dryRun) {
    console.log(`would clean ${label}（${before} MB）→ ${dir}`);
    continue;
  }
  try {
    rmSync(dir, { recursive: true, force: true });
    console.log(`clean ${label}（釋放 ${before} MB）`);
  } catch (error) {
    console.error(`fail  ${label}（${error.message}）— dev server 可能仍在執行，請先停止它`);
    process.exitCode = 1;
  }
}
console.log("完成。下次 dev / build 時會自動重建快取。");
