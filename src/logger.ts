import fs from "fs";
import path from "path";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function getNowParts() {
  const now = new Date();

  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());

  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return { year, month, day, hours, minutes, seconds };
}

function getTimestamp(): string {
  const { year, month, day, hours, minutes, seconds } = getNowParts();
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getDateKey(): string {
  const { year, month, day } = getNowParts();
  return `${year}-${month}-${day}`;
}

function ensureLogsDir(): string {
  const logsDir = path.resolve(process.cwd(), "logs");

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  return logsDir;
}

function buildLogFilePath(): string {
  const { year, month, day, hours, minutes, seconds } = getNowParts();
  const logsDir = ensureLogsDir();

  const fileName = `shield-lite-${year}-${month}-${day}_${hours}-${minutes}-${seconds}.log`;
  return path.join(logsDir, fileName);
}

let currentLogFilePath: string | null = null;
let currentLogDateKey: string | null = null;

// Ensures active log file and rotates it when date changes.
function ensureCurrentLogFile(): string {
  const nowDateKey = getDateKey();

  if (!currentLogFilePath || !currentLogDateKey) {
    currentLogFilePath = buildLogFilePath();
    currentLogDateKey = nowDateKey;
    return currentLogFilePath;
  }

  if (currentLogDateKey !== nowDateKey) {
    currentLogFilePath = buildLogFilePath();
    currentLogDateKey = nowDateKey;
  }

  return currentLogFilePath;
}

function formatLine(scope: string, message: string): string {
  return `[${getTimestamp()}] [${scope}] ${message}`;
}

function appendLineToFile(line: string): void {
  const filePath = ensureCurrentLogFile();
  fs.appendFileSync(filePath, line + "\n", "utf8");
}

function writeLine(line: string): void {
  console.log(line);
  appendLineToFile(line);
}

function writeErrorLine(line: string): void {
  console.error(line);
  appendLineToFile(line);
}

export function log(scope: string, message: string): void {
  writeLine(formatLine(scope, message));
}

export function logError(scope: string, message: string): void {
  writeErrorLine(formatLine(scope, message));
}

export function getCurrentLogFilePath(): string {
  return ensureCurrentLogFile();
}
