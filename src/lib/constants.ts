/**
 * Allowed values for string columns (SQLite has no enums) and
 * onboarding choices. Single source of truth for the whole app.
 */

export const TOPICS = [
  { slug: "technology", label: "Technology", emoji: "💻" },
  { slug: "ai", label: "AI", emoji: "🤖" },
  { slug: "business", label: "Business", emoji: "📈" },
  { slug: "finance", label: "Finance", emoji: "💰" },
  { slug: "health", label: "Health", emoji: "🩺" },
  { slug: "science", label: "Science", emoji: "🔬" },
  { slug: "sports", label: "Sports", emoji: "🏆" },
  { slug: "entertainment", label: "Entertainment", emoji: "🎬" },
  { slug: "politics", label: "Politics", emoji: "🏛️" },
  { slug: "travel", label: "Travel", emoji: "✈️" },
  { slug: "education", label: "Education", emoji: "🎓" },
  { slug: "culture", label: "Culture", emoji: "🎨" },
] as const;

export type TopicSlug = (typeof TOPICS)[number]["slug"];

export const CONTENT_TYPES = [
  { slug: "articles", label: "Articles", description: "In-depth written stories" },
  { slug: "videos", label: "Videos", description: "Watchable explainers and features" },
  { slug: "podcasts", label: "Podcasts", description: "Audio for your commute" },
  { slug: "newsletters", label: "Newsletters", description: "Curated reads in your inbox" },
] as const;

export const EMAIL_FREQUENCIES = [
  { value: "daily", label: "Daily", description: "A short brief every morning" },
  { value: "weekly", label: "Weekly", description: "The best of the week, every Friday" },
  { value: "monthly", label: "Monthly", description: "A monthly roundup" },
  { value: "none", label: "Never", description: "No scheduled emails" },
] as const;

export const ROLES = [
  "superadmin",
  "admin",
  "editor",
  "author",
  "moderator",
  "premium",
  "user",
] as const;

export type Role = (typeof ROLES)[number];

export const PROFILE_VISIBILITY = ["public", "private"] as const;

export const REACTIONS = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "funny", emoji: "😄", label: "Funny" },
  { type: "celebrate", emoji: "🎉", label: "Celebrate" },
] as const;

export type ReactionType = (typeof REACTIONS)[number]["type"];

/** Comments containing these are held for moderation (expand as needed). */
export const BLOCKED_WORDS = [
  "idiot",
  "stupid",
  "moron",
  "scam",
  "spam",
  "casino",
  "viagra",
];

export const REPORT_REASONS = [
  "Spam or misleading",
  "Harassment or hate",
  "Off-topic",
  "Misinformation",
  "Copyright violation",
  "Other",
] as const;

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
] as const;
