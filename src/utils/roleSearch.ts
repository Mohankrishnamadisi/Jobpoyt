type JobLike = {
  title?: unknown;
  company_name?: unknown;
  description?: unknown;
  summary?: unknown;
  skills?: unknown;
  responsibilities?: unknown;
  normalized_title?: unknown;
  searchable_titles?: unknown;
  search_aliases?: unknown;
  role_family?: unknown;
  primary_role?: unknown;
};

const ROLE_FAMILIES: Record<string, { aliases: string[]; signals: string[]; negative?: string[] }> = {
  react: {
    aliases: ['react', 'reactjs', 'react js', 'react.js', 'react developer', 'react engineer'],
    signals: ['react', 'reactjs', 'react js', 'react.js', 'javascript', 'typescript', 'frontend', 'ui', 'html', 'css'],
  },
  dotnet: {
    aliases: ['.net', 'dotnet', 'dot net', 'asp.net', 'asp.net core', 'c#', 'csharp', '.net developer', 'dotnet developer'],
    signals: ['.net', 'dotnet', 'dot net', 'asp.net', 'asp.net core', 'csharp', 'c#', 'microsoft', 'azure'],
  },
  vue: {
    aliases: ['vue', 'vuejs', 'vue js', 'vue.js', 'nuxt', 'vue developer'],
    signals: ['vue', 'vuejs', 'vue js', 'vue.js', 'nuxt', 'frontend'],
  },
  javascript: {
    aliases: ['javascript', 'java script', 'js', 'ecmascript', 'javascript developer'],
    signals: ['javascript', 'java script', 'js', 'ecmascript', 'frontend', 'react', 'typescript'],
  },
  java: {
    aliases: ['java', 'java developer', 'spring', 'spring boot', 'springboot'],
    signals: ['java', 'spring', 'spring boot', 'springboot', 'hibernate', 'backend'],
  },
  fullstack: {
    aliases: ['full stack developer', 'full-stack developer', 'fullstack developer', 'full stack', 'fullstack'],
    signals: ['full stack', 'fullstack', 'frontend', 'backend', 'react', 'node', 'node.js', 'javascript', 'typescript', 'api'],
  },
  python: {
    aliases: ['python', 'python developer', 'django', 'flask', 'fastapi'],
    signals: ['python', 'django', 'flask', 'fastapi', 'backend'],
  },
  node: {
    aliases: ['node', 'node.js', 'nodejs', 'node js', 'express', 'nestjs', 'node developer'],
    signals: ['node', 'node.js', 'nodejs', 'express', 'nestjs', 'backend', 'api'],
  },
  angular: {
    aliases: ['angular', 'angularjs', 'angular js', 'angular developer'],
    signals: ['angular', 'angularjs', 'angular js', 'frontend'],
  },
  typescript: {
    aliases: ['typescript', 'type script', 'typescript developer'],
    signals: ['typescript', 'type script', 'react', 'javascript', 'frontend', 'node'],
  },
  aws: {
    aliases: ['aws', 'amazon web services', 'aws developer'],
    signals: ['aws', 'amazon web services', 'lambda', 's3', 'ec2', 'serverless', 'cloud'],
  },
  mern: {
    aliases: ['mern', 'mern stack', 'mern developer', 'mern stack developer'],
    signals: ['mern', 'mongo', 'mongodb', 'express', 'react', 'node'],
  },
  sql: {
    aliases: ['sql', 'sql developer', 'sql server', 'mysql', 'postgresql', 'oracle sql', 'database developer'],
    signals: ['sql', 'sql server', 'mysql', 'postgresql', 'oracle', 'database', 'plsql'],
  },
};

const normalizeRoleText = (value: unknown): string => {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[#.]/g, ' ')
    .replace(/[\-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const containsPhrase = (text: string, phrase: string): boolean => {
  if (!phrase.trim()) return false;
  const pattern = new RegExp(`(^|\\b)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|$)`, 'i');
  return pattern.test(text);
};

const containsAny = (text: string, terms: string[]): boolean => {
  return terms.some((term) => containsPhrase(text, normalizeRoleText(term)));
};

const getJobText = (job: JobLike): string => {
  const fields = [
    job.title,
    job.company_name,
    job.description,
    job.summary,
    Array.isArray(job.skills) ? job.skills.join(' ') : job.skills,
    Array.isArray(job.responsibilities) ? job.responsibilities.join(' ') : job.responsibilities,
    job.normalized_title,
    Array.isArray(job.searchable_titles) ? job.searchable_titles.join(' ') : job.searchable_titles,
    Array.isArray(job.search_aliases) ? job.search_aliases.join(' ') : job.search_aliases,
    job.primary_role,
    job.role_family,
  ];

  return fields.map((field) => normalizeRoleText(field)).filter(Boolean).join(' ');
};

export const buildKeywordSearchVariants = (keywordInput: string): string[] => {
  const raw = String(keywordInput ?? '').trim();
  if (!raw) return [];

  const normalized = normalizeRoleText(raw);
  if (!normalized) return [];

  const variants = new Set<string>([normalized]);

  if (normalized.includes('react') || normalized.includes('reactjs') || normalized.includes('react js')) {
    variants.add('react');
    variants.add('reactjs');
    variants.add('react.js');
  }

  if (normalized.includes('dotnet') || normalized.includes('net') || normalized.includes('csharp') || normalized.includes('asp')) {
    variants.add('dotnet');
    variants.add('.net');
    variants.add('c#');
    variants.add('asp.net');
  }

  if (normalized.includes('node') || normalized.includes('nodejs') || normalized.includes('node js')) {
    variants.add('node');
    variants.add('node.js');
    variants.add('nodejs');
  }

  if (normalized.includes('full stack') || normalized.includes('fullstack')) {
    variants.add('full stack');
    variants.add('fullstack');
  }

  if (normalized.includes('front end') || normalized.includes('frontend')) {
    variants.add('frontend');
    variants.add('front end');
  }

  if (normalized.includes('javascript')) {
    variants.add('javascript');
    variants.add('js');
  }

  if (normalized.includes('typescript')) {
    variants.add('typescript');
  }

  if (normalized.includes('sql')) {
    variants.add('sql');
    variants.add('postgresql');
    variants.add('mysql');
  }

  if (normalized.includes('aws')) {
    variants.add('aws');
  }

  return [...variants].filter((term) => term && term !== 'developer');
};

export const detectRoleFamily = (keywordInput: string): string | null => {
  const normalized = normalizeRoleText(keywordInput);
  if (!normalized) return null;

  for (const [family, config] of Object.entries(ROLE_FAMILIES)) {
    const aliases = config.aliases.map(normalizeRoleText);
    const matched = aliases.some((alias) => {
      if (!alias) return false;
      return normalized === alias || normalized.includes(alias) || alias.includes(normalized);
    });

    if (matched) return family;
  }

  return null;
};

export const scoreRoleSearchMatch = (job: JobLike, keywordInput: string): number => {
  const normalizedKeyword = normalizeRoleText(keywordInput);
  if (!normalizedKeyword) return 1;

  const jobText = getJobText(job);
  const variants = buildKeywordSearchVariants(normalizedKeyword);
  const roleFamily = detectRoleFamily(normalizedKeyword);

  let score = 0;

  const titleText = normalizeRoleText(job.title);
  const primaryText = normalizeRoleText(job.primary_role || job.role_family || job.normalized_title);
  const skillText = normalizeRoleText(Array.isArray(job.skills) ? job.skills.join(' ') : job.skills);

  if (variants.some((variant) => containsPhrase(titleText, variant))) score += 45;
  if (variants.some((variant) => containsPhrase(primaryText, variant))) score += 35;
  if (roleFamily) score += 20;
  if (variants.some((variant) => containsPhrase(skillText, variant))) score += 30;
  if (variants.some((variant) => containsPhrase(jobText, variant))) score += 15;

  const negationTerms = ['python', 'java', '.net', 'aws', 'sql', 'angular', 'vue', 'django', 'flask'];
  const hasNegativeMismatch = negationTerms.some((term) => normalizedKeyword.includes(term) && containsPhrase(jobText, term));
  if (hasNegativeMismatch) score -= 40;

  return Math.max(0, score);
};

export const matchesRoleSearchIntent = (job: JobLike, keywordInput: string): boolean => {
  const normalizedKeyword = normalizeRoleText(keywordInput);
  if (!normalizedKeyword) return true;

  const jobText = getJobText(job);
  const roleFamily = detectRoleFamily(normalizedKeyword);

  if (!roleFamily) {
    const roleTokens = normalizedKeyword.split(' ').filter((token) => token && token !== 'developer');
    if (roleTokens.length === 0) return true;
    return roleTokens.some((token) => containsPhrase(jobText, token));
  }

  const config = ROLE_FAMILIES[roleFamily];
  const hasPositiveSignal = containsAny(jobText, config.signals);
  const hasNegativeSignal = config.negative ? containsAny(jobText, config.negative) : false;

  if (hasPositiveSignal && !hasNegativeSignal) {
    return true;
  }

  const queryTokens = normalizedKeyword.split(' ').filter((token) => token && token !== 'developer');
  return queryTokens.some((token) => containsPhrase(jobText, token));
};
