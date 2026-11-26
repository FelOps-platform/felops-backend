import { readFileSync } from "node:fs";

let command = "";
try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}");
  command = String(
    input?.toolCall?.args?.CommandLine ?? input?.toolCall?.args?.command ?? "",
  );
} catch {
  // hooks fail open on malformed or empty stdin
}

const checks = [
  [/\bdatabase:migrate\b/i, "Database migrations require explicit authorization."],
  [/\bdrizzle-kit\s+(?:migrate|push)\b/i, "Drizzle migrations require explicit authorization."],
  [/\bsupabase\b/i, "Supabase commands require explicit authorization."],
  [/\bgit\s+reset\s+--hard\b/i, "Hard resets are destructive and require explicit authorization."],
  [/\bgit\s+clean\b/i, "Git clean is destructive and requires explicit authorization."],
  [
    /\bgit\s+(?:restore|checkout)\b[^\n]*\s(?:\.|--\s+\.)(?:\s|$)/i,
    "Discarding workspace changes requires explicit authorization.",
  ],
  [/\bgit\s+push\b/i, "Git pushes require explicit authorization."],
  [/\bgit\s+merge\b/i, "Git merges require explicit authorization."],
  [/\bgh\s+pr\s+merge\b/i, "PR merges require explicit authorization."],
  [/\bgh\s+workflow\s+run\b/i, "Triggering CI or deployment workflows requires explicit authorization."],
  [/\bnpm\s+publish\b/i, "Publishing requires explicit authorization."],
  [/\brm\s+-[rf]{1,2}\b/i, "Recursive deletion requires explicit authorization."],
  [/\bRemove-Item\b[^\n]*-Recurse\b/i, "Recursive deletion requires explicit authorization."],
  [/\bsudo\b/i, "Elevated privileges require explicit authorization."],
  [/\bdocker\s+push\b/i, "Publishing container images requires explicit authorization."],
  [
    /\b(?:terraform\s+(?:apply|destroy)|kubectl\s+(?:apply|delete))\b/i,
    "Infrastructure changes require explicit authorization.",
  ],
];

const finding = checks.find(([pattern]) => pattern.test(command));

process.stdout.write(
  JSON.stringify(
    finding
      ? { decision: "ask", reason: finding[1] }
      : { decision: "allow" },
  ),
);
