/** 純函式工具：可同時安全地用於 Server 與 Client。 */

export function makeVerificationId(date = new Date()): string {
  const year = date.getFullYear();
  const n = Math.floor(1000 + Math.random() * 9000);
  return `NX-${year}-${n}`;
}

export function makeId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 倒數秒數 → "08:30" */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** 模擬時鐘：14:00 起算，經過 elapsed 秒 → "14:02" */
export function formatSimTime(elapsedSeconds: number): string {
  const base = 14 * 60 * 60;
  const t = base + Math.max(0, Math.floor(elapsedSeconds));
  const hh = Math.floor(t / 3600) % 24;
  const mm = Math.floor((t % 3600) / 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
