export const CODE_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx', label: 'JSX' },
  { value: 'tsx', label: 'TSX' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'sql', label: 'SQL' },
  { value: 'nodejs', label: 'Node.js' },
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
] as const;

export type LearningCodeLanguage = (typeof CODE_LANGUAGES)[number]['value'];

export interface LearningCodeSnippet {
  code: string;
  language: LearningCodeLanguage;
}

const isCodeLanguage = (value: string): value is LearningCodeLanguage =>
  CODE_LANGUAGES.some((language) => language.value === value);

const parseDocument = (content: string) =>
  new DOMParser().parseFromString(content || '', 'text/html');

export const readLearningCodeSnippet = (content: string): LearningCodeSnippet => {
  const documentNode = parseDocument(content);
  const block = documentNode.querySelector('pre[data-learning-code="true"]');
  const language = block?.getAttribute('data-language') || 'javascript';

  return {
    code: block?.textContent || '',
    language: isCodeLanguage(language) ? language : 'javascript',
  };
};

export const hasLearningCodeSnippet = (content: string) =>
  parseDocument(content).querySelector('pre[data-learning-code="true"]') !== null;

export const writeLearningCodeSnippet = (
  content: string,
  snippet: LearningCodeSnippet,
) => {
  const documentNode = parseDocument(content);
  const existing = documentNode.querySelector('pre[data-learning-code="true"]');

  if (!snippet.code) {
    existing?.remove();
    return documentNode.body.innerHTML;
  }

  const block = documentNode.createElement('pre');
  block.setAttribute('data-learning-code', 'true');
  block.setAttribute('data-language', snippet.language);
  const codeNode = documentNode.createElement('code');
  codeNode.textContent = snippet.code;
  block.appendChild(codeNode);

  if (existing) existing.replaceWith(block);
  else documentNode.body.appendChild(block);

  return documentNode.body.innerHTML;
};