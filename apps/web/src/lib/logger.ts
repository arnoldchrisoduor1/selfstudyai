export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogArea = "api" | "ui";

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function minLevel(): LogLevel {
  if (process.env.NODE_ENV === "production") return "warn";
  return "debug";
}

function emit(level: LogLevel, area: LogArea, message: string, fields?: Record<string, unknown>) {
  if (levelRank[level] < levelRank[minLevel()]) return;
  const payload = { area: `[${area}]`, message, ...fields };
  if (level === "error") {
    // Logger is the only console writer.
    // eslint-disable-next-line no-console
    console.error(payload);
    return;
  }
  if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(payload);
    return;
  }
  // eslint-disable-next-line no-console
  console.info(payload);
}

export const logger = {
  debug: (area: LogArea, message: string, fields?: Record<string, unknown>) =>
    emit("debug", area, message, fields),
  info: (area: LogArea, message: string, fields?: Record<string, unknown>) =>
    emit("info", area, message, fields),
  warn: (area: LogArea, message: string, fields?: Record<string, unknown>) =>
    emit("warn", area, message, fields),
  error: (area: LogArea, message: string, fields?: Record<string, unknown>) =>
    emit("error", area, message, fields),
};
