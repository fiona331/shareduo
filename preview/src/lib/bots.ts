// ---------------------------------------------------------------------------
// Bot detection for the preview view counter
// ---------------------------------------------------------------------------
//
// Link unfurlers (Slack, Discord, Twitter/X, Telegram, iMessage) hit every
// URL pasted into a chat — without filtering them we'd inflate counts by
// 5–50× depending on where the link is shared. AI crawlers (GPTBot,
// ClaudeBot, PerplexityBot, CCBot, etc.) are the new high-volume offenders
// and also add nothing but noise to a "how many humans saw my share" metric.
//
// Intent: catch ~95% of high-volume automation cheaply. Not a security
// boundary. Anything counting on this to keep bad actors out is misusing it.

const BOT_NAMES = [
  // Link unfurlers
  "slackbot",
  "twitterbot",
  "facebookexternalhit",
  "discordbot",
  "whatsapp",
  "linkedinbot",
  "pinterest",
  "redditbot",
  "telegrambot",
  "skypeuripreview",
  "metainspector",
  // Classic search engines
  "googlebot",
  "bingbot",
  "duckduckbot",
  "applebot",
  "yandexbot",
  "baiduspider",
  // AI crawlers
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "perplexitybot",
  "perplexity-user",
  "google-extended",
  "ccbot",
  "bytespider",
  "amazonbot",
  "meta-externalagent",
  "meta-externalfetcher",
  // Headless browsers / scripted clients
  "headlesschrome", // not just "headless" — false positives on product names
  "puppeteer",
  "playwright",
  "phantomjs",
  "cypress",
];

// One combined regex — case-insensitive. Includes a catch-all for the
// suffixes most crawlers self-identify with.
const BOT_RE = new RegExp(
  `(${BOT_NAMES.join("|")})|\\b(bot|crawler|spider)\\b`,
  "i"
);

/**
 * Returns true if the given User-Agent looks like an automated client that
 * shouldn't count toward the view counter.
 *
 * Null / empty UA → true (conservative: count only requests that identify
 * themselves as a browser).
 */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_RE.test(userAgent);
}
