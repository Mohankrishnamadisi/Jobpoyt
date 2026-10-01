export type ParsedJobExperience =
  | { any: true }
  | { any: false; min: number; max: number };

const NUMBER = '(\\d+(?:\\.\\d+)?)';
const RANGE_PATTERN = new RegExp(`${NUMBER}\\s*-\\s*${NUMBER}`);
const PLUS_PATTERN = new RegExp(`${NUMBER}\\s*(?:\\+|(?:years?\\s*)?(?:and above|or more|above|plus))`);
const NUMBER_PATTERN = new RegExp(NUMBER, 'g');

const WILDCARD_PATTERNS = [
  /\bany\s*experience\b/,
  /\bno\s*experience\s*required\b/,
  /\bexperience\s*not\s*required\b/,
  /\bnot\s*specified\b/,
];

export const parseJobExperience = (value: unknown): ParsedJobExperience | null => {
  if (value === null || value === undefined) return null;

  const text = String(value)
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+to\s+/g, ' - ')
    .replace(/\bfreshers?\b/g, '0')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;
  if (WILDCARD_PATTERNS.some((pattern) => pattern.test(text))) return { any: true };

  const unit = /\bmonths?\b/.test(text) && !/\byears?\b/.test(text) ? 1 / 12 : 1;

  const rangeMatch = text.match(RANGE_PATTERN);
  if (rangeMatch) {
    const first = Number(rangeMatch[1]) * unit;
    const second = Number(rangeMatch[2]) * unit;
    return { any: false, min: Math.min(first, second), max: Math.max(first, second) };
  }

  const plusMatch = text.match(PLUS_PATTERN);
  if (plusMatch) {
    return { any: false, min: Number(plusMatch[1]) * unit, max: Infinity };
  }

  const numbers = text.match(NUMBER_PATTERN);
  if (numbers?.length === 1) {
    const single = Number(numbers[0]) * unit;
    return { any: false, min: single, max: single };
  }

  return null;
};

export type RequestedExperience = { min: number; max: number };

export const parseRequestedExperience = (value: unknown): RequestedExperience | null => {
  const parsed = parseJobExperience(value);
  if (!parsed || parsed.any) return null;
  return { min: parsed.min, max: parsed.max };
};

// Single value N: job range must include N. Range request: job range must fit inside it.
export const matchesJobExperience = (jobExperience: unknown, requested: number | RequestedExperience): boolean => {
  const parsed = parseJobExperience(jobExperience);
  if (!parsed) return false;
  if (parsed.any) return true;
  const { min, max } = typeof requested === 'number' ? { min: requested, max: requested } : requested;
  if (min === max) return parsed.min <= min && min <= parsed.max;
  return min <= parsed.min && parsed.max <= max;
};

export const selectMatchingExperienceValues = (values: string[], requested: number | RequestedExperience): string[] =>
  values.filter((value) => matchesJobExperience(value, requested));

// Keyset scan so a server-side row cap (e.g. 100 rows/request) cannot truncate the result.
export const collectDistinctExperienceValues = async (
  fetchSortedPage: (afterValue: string | null) => Promise<string[]>,
): Promise<string[]> => {
  const values = new Set<string>();
  let cursor: string | null = null;

  for (;;) {
    const page = await fetchSortedPage(cursor);
    if (page.length === 0) return [...values];
    page.forEach((value) => values.add(value));
    const last = page[page.length - 1];
    if (last === cursor) return [...values];
    cursor = last;
  }
};
