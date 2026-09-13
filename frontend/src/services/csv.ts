// Very small, dependency-free CSV/text parser for a one-column list of
// email addresses. Handles both a simple text file (one email per line)
// and a CSV with an "email" header.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailList(fileContent: string): string[] {
  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = lines
    // strip a possible CSV header like "email"
    .filter((line) => line.toLowerCase() !== "email")
    // if the line has commas, take the first column
    .map((line) => line.split(",")[0].trim());

  const valid = candidates.filter((email) => EMAIL_REGEX.test(email));

  // de-duplicate while preserving order
  return Array.from(new Set(valid));
}
