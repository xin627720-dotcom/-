const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const DATE_TIME_LOCAL_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/;

export function formatBeijingDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  return new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString().slice(0, 16);
}

export function parseBeijingDateTimeLocalValue(value: string | null | undefined): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;

  const match = DATE_TIME_LOCAL_PATTERN.exec(text);
  if (!match) return null;

  const [, datePart, timePart, secondsPart = "00"] = match;
  const timestamp = Date.parse(`${datePart}T${timePart}:${secondsPart}+08:00`);
  if (!Number.isFinite(timestamp)) return null;

  return new Date(timestamp).toISOString();
}
