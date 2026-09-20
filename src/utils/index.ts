export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatCurrency = (amount: number, currency = '₹') => {
  return `${currency} ${amount.toLocaleString('en-IN')}`;
};

export const formatJobSalary = (min?: number, max?: number) => {
  if (!min && !max) return 'Not disclosed';
  if (min && max) return `₹${min.toLocaleString()} - ₹${max.toLocaleString()}`;
  if (min) return `₹${min.toLocaleString()}+`;
  return `Up to ₹${max?.toLocaleString()}`;
};

export const getTimeAgo = (date: string | Date) => {
  const now = new Date();
  const time = new Date(date);
  const diff = now.getTime() - time.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDate(date);
};

export const validateEmail = (email: string) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const BLOCKED_RECRUITER_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'rediffmail.com',
]);

export const BLOCKED_PERSONAL_EMAIL_DOMAINS = Array.from(BLOCKED_RECRUITER_EMAIL_DOMAINS);

export const getEmailDomain = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf('@');
  return atIndex > 0 ? normalizedEmail.slice(atIndex + 1) : '';
};

export const extractEmailDomain = getEmailDomain;

export const validateRecruiterEmail = (email: string) => {
  if (!validateEmail(email)) return false;
  const domain = getEmailDomain(email);
  return Boolean(domain) && !BLOCKED_RECRUITER_EMAIL_DOMAINS.has(domain);
};

export const RECRUITER_EMAIL_ERROR = 'Please use your official company email address. Personal email addresses such as Gmail, Outlook, Yahoo, etc. are not allowed.';
export const PERSONAL_EMAIL_ERROR = RECRUITER_EMAIL_ERROR;
export const isBlockedPersonalEmailDomain = (domain: string) => BLOCKED_RECRUITER_EMAIL_DOMAINS.has(domain.trim().toLowerCase());
export const validateWorkEmail = validateRecruiterEmail;

export const validatePassword = (password: string) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

export const validatePhone = (phone: string) => {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(phone.replace(/\s/g, ''));
};

export const validateURL = (url: string) => {
  if (!url) return true;
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
};

export const validateGST = (gst: string) => {
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gst.toUpperCase());
};

export const validateDateOfBirth = (dob: string) => {
  const date = new Date(dob);
  if (isNaN(date.getTime())) return false;
  const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return age >= 16 && age <= 80;
};

export const validateFileSize = (file: File, maxMB: number) => {
  return file.size <= maxMB * 1024 * 1024;
};

export const validateFileType = (file: File, allowedTypes: string[]) => {
  return allowedTypes.includes(file.type);
};

export const getFreshnessDate = (freshness: string): string | null => {
  const daysMap: Record<string, number> = {
    '1d': 1,
    '3d': 3,
    '7d': 7,
    '15d': 15,
    '30d': 30,
  };
  const days = daysMap[freshness];
  if (!days) return null;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const PROFILE_COMPLETION_FIELDS = [
  'fullName',
  'email',
  'phone',
  'gender',
  'dateOfBirth',
  'address',
  'city',
  'state',
  'country',
  'bio',
  'experience',
  'skills',
  'preferredJobTitles',
  'education',
  'resumeUrl',
];

export const calculateProfileCompletion = (profile: Record<string, unknown>): number => {
  let filled = 0;
  PROFILE_COMPLETION_FIELDS.forEach((field) => {
    const value = profile[field];
    if (Array.isArray(value)) {
      if (value.length > 0) filled++;
    } else if (value && String(value).trim()) {
      filled++;
    }
  });
  return Math.round((filled / PROFILE_COMPLETION_FIELDS.length) * 100);
};

export const getProfileCompletionColor = (completion: number) => {
  if (completion === 100) return '#047857';
  if (completion < 60) return '#B91C1C';
  return '#B45309';
};

export const getProfileCompletionGradient = (completion: number) => {
  if (completion === 100) return 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)';
  if (completion < 60) return 'linear-gradient(135deg, #DC2626 0%, #F87171 100%)';
  return 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)';
};

export const truncateText = (text: string, length: number) => {
  return text.length > length ? `${text.substring(0, length)}...` : text;
};

export { truncateAtWord } from './truncateAtWord';

export const generateInitials = (name: string) => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getContrastColor = (hexColor: string) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

export const cn = (...classes: (string | false | undefined | null)[]) => {
  return classes.filter(Boolean).join(' ');
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export { diversifyJobsByCompany, diversifyWithPagination } from './diversifyJobsByCompany';
