// Small structured logger. Not a full logging library on purpose -
// this project stays simple and beginner-friendly.
type LogFields = Record<string, unknown>;

function log(level: "info" | "warn" | "error", message: string, fields?: LogFields) {
  const line = {
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  };
  const output = JSON.stringify(line);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export const logger = {
  info: (message: string, fields?: LogFields) => log("info", message, fields),
  warn: (message: string, fields?: LogFields) => log("warn", message, fields),
  error: (message: string, fields?: LogFields) => log("error", message, fields),
};
