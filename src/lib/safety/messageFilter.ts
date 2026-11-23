/**
 * Automated server-side content filter for Anon Connect.
 * Applies bad-word filtering and blocks links/phone numbers/emails
 * for connections in their first 24 hours.
 */

export interface FilterResult {
  allowed: boolean;
  reason?: 'inappropriate_language' | 'early_connection_restriction';
  friendlyMessage?: string;
}

// Common profanities, slurs, hate speech, and harassment patterns
const BAD_WORDS: string[] = [
  'nigger', 'nigga', 'faggot', 'fag', 'kike', 'chink', 'spic', 'wetback',
  'retard', 'bitch', 'cunt', 'whore', 'slut', 'kill yourself', 'kys',
  'rape', 'pedophile', 'pedo', 'cp', 'childporn', 'cp link',
];

// Regexes to catch evasion like f.a.g, n-i-g-g-a, etc.
const BAD_PATTERNS: RegExp[] = [
  /\bn+[i!1|]+g+[e3a4r]+s?\b/i,
  /\bf+[a4@]+g+[o0]+t+s?\b/i,
  /\bk+[i!1]+k+[e3]+\b/i,
  /\bc+[u*]+n+t+s?\b/i,
  /\bk+y+s+\b/i,
  /\bkill\s+your\s*self\b/i,
];

// Patterns for external links, phone numbers, and emails
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|gov|io|co|me|xyz|app|dev|link|info|biz|ru|cn|in|uk|de|ca|au|ly|gg)\b(?:\/[^\s]*)?/i;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b(?:\+?\d{1,3}[-.\s]?)?\d{10}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/;

/**
 * Normalizes string by mapping leetspeak characters to standard letters
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[+]/g, 't')
    .replace(/[._\-]/g, '');
}

/**
 * Validates message content against safety rules.
 *
 * @param content The text content of the message.
 * @param connectionCreatedAt Optional ISO timestamp of when the chat or membership was created.
 *                            If less than 24 hours ago, links, phone numbers and emails are blocked.
 */
export function filterMessageContent(
  content: string,
  connectionCreatedAt?: string | null
): FilterResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return { allowed: false, friendlyMessage: 'Message content cannot be empty.' };
  }

  const normalized = normalizeText(trimmed);

  // 1. Check for severe bad words / hate speech
  for (const word of BAD_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(normalized) || regex.test(trimmed)) {
      return {
        allowed: false,
        reason: 'inappropriate_language',
        friendlyMessage:
          "Your message wasn't sent because it contains language that violates our Community Guidelines. Please keep conversations respectful.",
      };
    }
  }

  for (const pattern of BAD_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'inappropriate_language',
        friendlyMessage:
          "Your message wasn't sent because it contains language that violates our Community Guidelines. Please keep conversations respectful.",
      };
    }
  }

  // 2. Check 24-hour restriction for new connections
  if (connectionCreatedAt) {
    const createdTime = new Date(connectionCreatedAt).getTime();
    const now = Date.now();
    const isUnder24Hours = (now - createdTime) < 24 * 60 * 60 * 1000;

    if (isUnder24Hours) {
      const hasLink = URL_PATTERN.test(trimmed);
      const hasEmail = EMAIL_PATTERN.test(trimmed);
      const hasPhone = PHONE_PATTERN.test(trimmed);

      if (hasLink || hasEmail || hasPhone) {
        return {
          allowed: false,
          reason: 'early_connection_restriction',
          friendlyMessage:
            'For your safety, sharing links, phone numbers, or email addresses is restricted during the first 24 hours of a new connection.',
        };
      }
    }
  }

  return { allowed: true };
}
