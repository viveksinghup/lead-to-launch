/**
 * Multi-pattern email and contact extraction utility
 * Extracts standard emails, obfuscated emails (user [at] gmail [dot] com),
 * mailto links, and clean contact handles.
 */

const STANDARD_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const OBFUSCATED_PATTERNS = [
  /([a-zA-Z0-9._%+-]+)\s*(?:\[at\]|\(at\)|\[AT\]|\(AT\)|\s+at\s+)\s*([a-zA-Z0-9.-]+)\s*(?:\[dot\]|\(dot\)|\s+dot\s+|\.)\s*([a-zA-Z]{2,})/gi,
  /mailto:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
];

const JUNK_DOMAINS = [
  "example.com",
  "domain.com",
  "email.com",
  "yourdomain.com",
  "yourcompany.com",
  "company.com",
  "sentry.io",
  "github.com",
  "reddit.com",
  "img.shields.io",
];

export function extractEmailsFromText(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();

  // 1. Standard email regex
  const standardMatches = text.match(STANDARD_EMAIL_REGEX);
  if (standardMatches) {
    for (const email of standardMatches) {
      const clean = email.trim().toLowerCase().replace(/[.,;:)]$/, "");
      const domain = clean.split("@")[1];
      if (domain && !JUNK_DOMAINS.includes(domain) && !clean.endsWith(".png") && !clean.endsWith(".jpg")) {
        found.add(clean);
      }
    }
  }

  // 2. Obfuscated pattern: name [at] domain [dot] com
  for (const pattern of OBFUSCATED_PATTERNS) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[2] && match[3]) {
        const reconstructed = `${match[1]}@${match[2]}.${match[3]}`.toLowerCase();
        const domain = `${match[2]}.${match[3]}`.toLowerCase();
        if (!JUNK_DOMAINS.includes(domain)) {
          found.add(reconstructed);
        }
      } else if (match[1] && match[1].includes("@")) {
        found.add(match[1].toLowerCase());
      }
    }
  }

  return Array.from(found);
}

export function extractPrimaryEmail(text: string): string | undefined {
  const emails = extractEmailsFromText(text);
  return emails.length > 0 ? emails[0] : undefined;
}
