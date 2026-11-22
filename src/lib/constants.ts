export const INTERESTS_LIST = [
  'Music',
  'Movies',
  'Gaming',
  'Sports',
  'Travel',
  'Photography',
  'Art',
  'Reading',
  'Cooking',
  'Fitness',
  'Technology',
  'Science',
  'Fashion',
  'Nature',
  'Anime',
  'Pets',
  'Dance',
  'Writing',
  'Comedy',
  'Spirituality',
] as const;

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ru', label: 'Russian' },
  { value: 'it', label: 'Italian' },
  { value: 'tr', label: 'Turkish' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
] as const;

export const AGE_RANGES = [
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55+', label: '55+' },
] as const;

// Connection request limits
export const REQUEST_COOLDOWN_HOURS = 24;
export const REQUEST_EXPIRY_HOURS = 48;

// Profile limits
export const DISPLAY_NAME_COOLDOWN_DAYS = 7;
export const MAX_BIO_LENGTH = 500;
export const MAX_INTRO_LENGTH = 140;

// Group limits
export const MAX_GROUP_MEMBERS = 200;

// Nearby feature
export const NEARBY_RADIUS_OPTIONS = [100, 500, 1000] as const;
