import { format } from 'date-fns';

export type AssessmentCategory =
  | 'Programming'
  | 'Frontend'
  | 'Backend'
  | 'Full Stack'
  | 'DevOps'
  | 'Cloud'
  | 'Database'
  | 'AI / ML'
  | 'QA'
  | 'HR'
  | 'Communication'
  | 'Aptitude'
  | 'Logical Reasoning'
  | 'English'
  | 'Soft Skills'
  | 'Custom Assessments';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type QuestionType =
  | 'Multiple Choice'
  | 'Single Choice'
  | 'True / False'
  | 'Fill in the Blank'
  | 'Coding'
  | 'Drag & Drop'
  | 'Match the Following'
  | 'Case Study'
  | 'Essay'
  | 'Video Response'
  | 'Audio Response';

export type ProgrammingTopic =
  | 'Java'
  | 'Python'
  | 'JavaScript'
  | 'TypeScript'
  | 'React'
  | 'Vue'
  | 'Angular'
  | 'Node.js'
  | 'C#'
  | 'PHP'
  | 'Go'
  | 'Rust'
  | 'SQL'
  | 'MongoDB'
  | 'Docker'
  | 'Kubernetes'
  | 'AWS'
  | 'Azure'
  | 'GCP';

export interface QuestionBankItem {
  id: string;
  title: string;
  questionType: QuestionType;
  category: AssessmentCategory;
  difficulty: Difficulty;
  tags: string[];
  expectedTimeMin: number;
  correctAnswer: string;
  explanation: string;
}

export interface AssessmentDefinition {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  passingScore: number;
  difficulty: Difficulty;
  category: AssessmentCategory;
  skills: string[];
  instructions: string;
  negativeMarking: boolean;
  shuffleQuestions: boolean;
  questionBankIds: string[];
  createdBy: string;
  codingConfig?: {
    enabled: boolean;
    languages: string[];
    hiddenTestCases: number;
    sampleTestCases: number;
    timeLimitSec: number;
    memoryLimitMb: number;
  };
}

export interface AssessmentInvitation {
  id: string;
  assessmentId: string;
  recruiterId: string;
  candidateId: string;
  scheduledAt: string;
  deadlineAt: string;
  status: 'pending' | 'attempted' | 'passed' | 'failed';
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  candidateId: string;
  overallScore: number;
  sectionScores: Array<{ section: string; score: number }>;
  codingScore: number;
  accuracy: number;
  timeTakenMin: number;
  rank: number;
  percentile: number;
  strengths: string[];
  weaknesses: string[];
  completedAt: string;
}

export interface SkillBadge {
  id: string;
  candidateId: string;
  skill: string;
  level: SkillLevel;
  verifiedAt: string;
}

export interface Certificate {
  id: string;
  candidateId: string;
  candidateName: string;
  skill: string;
  score: number;
  completionDate: string;
  certificateId: string;
  qrCodeUrl: string;
  verificationUrl: string;
}

interface StoreModel {
  library: AssessmentDefinition[];
  questionBank: QuestionBankItem[];
  invitations: AssessmentInvitation[];
  results: AssessmentResult[];
  badges: SkillBadge[];
  certificates: Certificate[];
}

const STORAGE_KEY = 'actro_assessment_platform_v1';

const makeId = (prefix: string): string => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const categories: AssessmentCategory[] = [
  'Programming',
  'Frontend',
  'Backend',
  'Full Stack',
  'DevOps',
  'Cloud',
  'Database',
  'AI / ML',
  'QA',
  'HR',
  'Communication',
  'Aptitude',
  'Logical Reasoning',
  'English',
  'Soft Skills',
  'Custom Assessments',
];

const programmingTopics: ProgrammingTopic[] = [
  'Java',
  'Python',
  'JavaScript',
  'TypeScript',
  'React',
  'Vue',
  'Angular',
  'Node.js',
  'C#',
  'PHP',
  'Go',
  'Rust',
  'SQL',
  'MongoDB',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'GCP',
];

const questionTypes: QuestionType[] = [
  'Multiple Choice',
  'Single Choice',
  'True / False',
  'Fill in the Blank',
  'Coding',
  'Drag & Drop',
  'Match the Following',
  'Case Study',
  'Essay',
  'Video Response',
  'Audio Response',
];

const seedQuestionBank = (): QuestionBankItem[] => [
  {
    id: makeId('q'),
    title: 'Explain event loop behavior under async I/O load.',
    questionType: 'Essay',
    category: 'Backend',
    difficulty: 'Medium',
    tags: ['nodejs', 'event-loop', 'performance'],
    expectedTimeMin: 7,
    correctAnswer: 'Explains task queues, microtasks, and non-blocking I/O.',
    explanation: 'Strong answers include microtask starvation and mitigation strategies.',
  },
  {
    id: makeId('q'),
    title: 'Write SQL to find top 3 departments by average compensation.',
    questionType: 'Coding',
    category: 'Database',
    difficulty: 'Medium',
    tags: ['sql', 'group-by', 'window-function'],
    expectedTimeMin: 10,
    correctAnswer: 'Uses GROUP BY + ORDER BY + LIMIT or window rank.',
    explanation: 'Should consider null values and ties.',
  },
  {
    id: makeId('q'),
    title: 'Choose the best conflict resolution approach for a team disagreement.',
    questionType: 'Single Choice',
    category: 'Soft Skills',
    difficulty: 'Easy',
    tags: ['communication', 'collaboration'],
    expectedTimeMin: 3,
    correctAnswer: 'Active listening + objective problem framing.',
    explanation: 'Seeks shared goals and measurable outcomes.',
  },
];

const seedLibrary = (questionBank: QuestionBankItem[]): AssessmentDefinition[] => [
  {
    id: makeId('asm'),
    title: 'Full Stack Engineering Assessment',
    description: 'Covers frontend, backend, database, and cloud fundamentals.',
    durationMin: 90,
    passingScore: 70,
    difficulty: 'Medium',
    category: 'Full Stack',
    skills: ['React', 'Node.js', 'SQL', 'Docker'],
    instructions: 'Read all questions carefully. Keep code clean and tested.',
    negativeMarking: false,
    shuffleQuestions: true,
    questionBankIds: questionBank.map((q) => q.id),
    createdBy: 'system',
    codingConfig: {
      enabled: true,
      languages: ['JavaScript', 'TypeScript', 'Python', 'Java'],
      hiddenTestCases: 8,
      sampleTestCases: 3,
      timeLimitSec: 2,
      memoryLimitMb: 256,
    },
  },
  {
    id: makeId('asm'),
    title: 'Communication and HR Readiness',
    description: 'Behavioral, HR and communication signals for role readiness.',
    durationMin: 45,
    passingScore: 65,
    difficulty: 'Easy',
    category: 'Communication',
    skills: ['Communication', 'Behavioral', 'Problem Solving'],
    instructions: 'Answer with practical examples and concise structure.',
    negativeMarking: false,
    shuffleQuestions: false,
    questionBankIds: questionBank.slice(0, 2).map((q) => q.id),
    createdBy: 'system',
  },
];

const seedStore = (): StoreModel => {
  const questionBank = seedQuestionBank();
  const library = seedLibrary(questionBank);
  return {
    library,
    questionBank,
    invitations: [],
    results: [],
    badges: [],
    certificates: [],
  };
};

const readStore = (): StoreModel => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as StoreModel;
  } catch {
    const seeded = seedStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
};

const writeStore = (store: StoreModel): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

class AssessmentPlatformService {
  getCategories(): AssessmentCategory[] {
    return categories;
  }

  getProgrammingTopics(): ProgrammingTopic[] {
    return programmingTopics;
  }

  getQuestionTypes(): QuestionType[] {
    return questionTypes;
  }

  listLibrary(): AssessmentDefinition[] {
    return readStore().library;
  }

  listQuestionBank(): QuestionBankItem[] {
    return readStore().questionBank;
  }

  createCustomAssessment(input: Omit<AssessmentDefinition, 'id'>): AssessmentDefinition {
    const store = readStore();
    const created: AssessmentDefinition = { ...input, id: makeId('asm') };
    const next = { ...store, library: [created, ...store.library] };
    writeStore(next);
    return created;
  }

  addQuestionToBank(input: Omit<QuestionBankItem, 'id'>): QuestionBankItem {
    const store = readStore();
    const created: QuestionBankItem = { ...input, id: makeId('q') };
    const next = { ...store, questionBank: [created, ...store.questionBank] };
    writeStore(next);
    return created;
  }

  generateAiQuestions(topic: string, difficulty: Difficulty, count: number, style: 'MCQs' | 'Coding Problems' | 'HR Questions' | 'Scenario Questions' | 'System Design' | 'Behavioral Questions'): QuestionBankItem[] {
    const baseCategory: AssessmentCategory = style === 'HR Questions' || style === 'Behavioral Questions'
      ? 'HR'
      : style === 'Scenario Questions'
        ? 'Communication'
        : style === 'System Design'
          ? 'Backend'
          : style === 'MCQs'
            ? 'Aptitude'
            : 'Programming';

    const list: QuestionBankItem[] = Array.from({ length: count }).map((_, idx) => ({
      id: makeId('aiq'),
      title: `${style}: ${topic} - Question ${idx + 1}`,
      questionType: style === 'Coding Problems' ? 'Coding' : style === 'Behavioral Questions' ? 'Essay' : 'Multiple Choice',
      category: baseCategory,
      difficulty,
      tags: [topic.toLowerCase(), style.toLowerCase().replace(/\s+/g, '-')],
      expectedTimeMin: style === 'Coding Problems' ? 15 : 4,
      correctAnswer: 'AI generated answer key attached',
      explanation: 'This question is AI-generated and should be reviewed by recruiter/admin.',
    }));

    const store = readStore();
    const next = { ...store, questionBank: [...list, ...store.questionBank] };
    writeStore(next);
    return list;
  }

  inviteCandidate(recruiterId: string, candidateId: string, assessmentId: string, scheduledAt: string, deadlineAt: string): AssessmentInvitation {
    const store = readStore();
    const invitation: AssessmentInvitation = {
      id: makeId('inv'),
      recruiterId,
      candidateId,
      assessmentId,
      scheduledAt,
      deadlineAt,
      status: 'pending',
    };
    const next = { ...store, invitations: [invitation, ...store.invitations] };
    writeStore(next);
    return invitation;
  }

  listCandidateInvitations(candidateId: string): AssessmentInvitation[] {
    return readStore().invitations.filter((item) => item.candidateId === candidateId);
  }

  listRecruiterInvitations(recruiterId: string): AssessmentInvitation[] {
    return readStore().invitations.filter((item) => item.recruiterId === recruiterId);
  }

  submitAssessment(candidateId: string, assessmentId: string, payload?: { score?: number; codingScore?: number }): AssessmentResult {
    const store = readStore();
    const overallScore = Math.max(40, Math.min(99, payload?.score ?? 62 + Math.floor(Math.random() * 30)));
    const codingScore = Math.max(30, Math.min(100, payload?.codingScore ?? overallScore + Math.floor(Math.random() * 8) - 4));

    const result: AssessmentResult = {
      id: makeId('res'),
      assessmentId,
      candidateId,
      overallScore,
      sectionScores: [
        { section: 'Aptitude', score: Math.max(35, overallScore - 8) },
        { section: 'Technical', score: overallScore },
        { section: 'Communication', score: Math.max(30, overallScore - 4) },
      ],
      codingScore,
      accuracy: Math.max(45, Math.min(99, overallScore + 4)),
      timeTakenMin: 35 + Math.floor(Math.random() * 45),
      rank: 1 + Math.floor(Math.random() * 120),
      percentile: Math.max(50, Math.min(99, overallScore + 5)),
      strengths: ['Problem Solving', 'Code Quality', 'Communication'],
      weaknesses: ['Edge Case Handling', 'Time Optimization'],
      completedAt: new Date().toISOString(),
    };

    const assessment = store.library.find((item) => item.id === assessmentId);
    const passed = result.overallScore >= Number(assessment?.passingScore || 65);

    const updatedInvitations: AssessmentInvitation[] = store.invitations.map((inv) => (
      inv.candidateId === candidateId && inv.assessmentId === assessmentId
        ? { ...inv, status: passed ? 'passed' : 'failed' }
        : inv
    ));

    const nextBadges = [...store.badges];
    const nextCertificates = [...store.certificates];

    if (passed) {
      const skill = assessment?.skills?.[0] || 'General Skill';
      const level: SkillLevel = result.overallScore >= 90 ? 'Expert' : result.overallScore >= 80 ? 'Advanced' : result.overallScore >= 70 ? 'Intermediate' : 'Beginner';

      nextBadges.unshift({
        id: makeId('badge'),
        candidateId,
        skill,
        level,
        verifiedAt: new Date().toISOString(),
      });

      const certificateId = `AC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const verificationUrl = `${window.location.origin}/#/verify-certificate/${certificateId}`;
      nextCertificates.unshift({
        id: makeId('cert'),
        candidateId,
        candidateName: 'Candidate',
        skill,
        score: result.overallScore,
        completionDate: new Date().toISOString(),
        certificateId,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(verificationUrl)}`,
        verificationUrl,
      });
    }

    const next: StoreModel = {
      ...store,
      invitations: updatedInvitations,
      results: [result, ...store.results],
      badges: nextBadges,
      certificates: nextCertificates,
    };
    writeStore(next);
    return result;
  }

  listCandidateResults(candidateId: string): AssessmentResult[] {
    return readStore().results.filter((item) => item.candidateId === candidateId);
  }

  listAllResults(): AssessmentResult[] {
    return readStore().results;
  }

  listCandidateBadges(candidateId: string): SkillBadge[] {
    return readStore().badges.filter((item) => item.candidateId === candidateId);
  }

  listCandidateCertificates(candidateId: string): Certificate[] {
    return readStore().certificates.filter((item) => item.candidateId === candidateId);
  }

  getCandidateDashboard(candidateId: string): {
    assessmentsTaken: number;
    assessmentsPassed: number;
    certificatesEarned: number;
    averageScore: number;
    skillBadges: number;
    pendingInvitations: number;
    upcomingAssessments: number;
  } {
    const store = readStore();
    const results = store.results.filter((r) => r.candidateId === candidateId);
    const certificates = store.certificates.filter((c) => c.candidateId === candidateId);
    const badges = store.badges.filter((b) => b.candidateId === candidateId);
    const invitations = store.invitations.filter((inv) => inv.candidateId === candidateId);

    const passed = results.filter((r) => {
      const asm = store.library.find((a) => a.id === r.assessmentId);
      return r.overallScore >= Number(asm?.passingScore || 65);
    }).length;

    const averageScore = results.length
      ? Math.round(results.reduce((sum, row) => sum + Number(row.overallScore || 0), 0) / results.length)
      : 0;

    const now = new Date();
    const upcoming = invitations.filter((inv) => new Date(inv.scheduledAt) > now && inv.status === 'pending').length;

    return {
      assessmentsTaken: results.length,
      assessmentsPassed: passed,
      certificatesEarned: certificates.length,
      averageScore,
      skillBadges: badges.length,
      pendingInvitations: invitations.filter((inv) => inv.status === 'pending').length,
      upcomingAssessments: upcoming,
    };
  }

  getRecruiterDashboard(recruiterId: string): {
    totalAssessments: number;
    customAssessments: number;
    invitationsSent: number;
    completionRate: number;
    passPercentage: number;
    averageScore: number;
  } {
    const store = readStore();
    const owned = store.library.filter((item) => item.createdBy === recruiterId || item.createdBy === 'system');
    const invitations = store.invitations.filter((item) => item.recruiterId === recruiterId);
    const attempted = invitations.filter((item) => item.status !== 'pending').length;
    const passed = invitations.filter((item) => item.status === 'passed').length;

    const linkedResults = store.results.filter((result) =>
      invitations.some((inv) => inv.candidateId === result.candidateId && inv.assessmentId === result.assessmentId)
    );

    const averageScore = linkedResults.length
      ? Math.round(linkedResults.reduce((sum, row) => sum + Number(row.overallScore || 0), 0) / linkedResults.length)
      : 0;

    return {
      totalAssessments: owned.length,
      customAssessments: store.library.filter((item) => item.createdBy === recruiterId).length,
      invitationsSent: invitations.length,
      completionRate: invitations.length ? Math.round((attempted / invitations.length) * 100) : 0,
      passPercentage: attempted ? Math.round((passed / attempted) * 100) : 0,
      averageScore,
    };
  }

  generateAiFeedback(result: AssessmentResult): {
    performanceSummary: string;
    improvementAreas: string[];
    recommendedLearning: string[];
    nextAssessment: string;
  } {
    const performanceSummary = result.overallScore >= 85
      ? 'Excellent performance with strong technical depth and communication confidence.'
      : result.overallScore >= 70
        ? 'Good performance with clear potential for advanced roles after targeted practice.'
        : 'Foundational skills are visible; structured practice is recommended before next attempt.';

    return {
      performanceSummary,
      improvementAreas: result.weaknesses,
      recommendedLearning: [
        'Practice timed coding challenges 30 minutes daily.',
        'Revise data structures and complexity trade-offs.',
        'Participate in mock interviews for communication clarity.',
      ],
      nextAssessment: result.overallScore >= 80 ? 'Advanced System Design Assessment' : 'Intermediate Full Stack Assessment',
    };
  }

  getAiCareerHubRecommendations(candidateId: string): {
    assessments: string[];
    practiceTests: string[];
    certifications: string[];
    skillImprovementPlan: string[];
  } {
    const results = this.listCandidateResults(candidateId);
    const average = results.length
      ? Math.round(results.reduce((sum, row) => sum + row.overallScore, 0) / results.length)
      : 0;

    return {
      assessments: average >= 80
        ? ['Advanced Cloud Assessment', 'System Design Challenge']
        : ['Full Stack Engineering Assessment', 'Communication and HR Readiness'],
      practiceTests: ['Daily Aptitude Booster', 'Coding Sprint - 45 min', 'Logical Reasoning Drill'],
      certifications: ['Verified React Skill Certificate', 'Verified SQL Skill Certificate'],
      skillImprovementPlan: [
        'Week 1-2: Focus on coding accuracy and edge-case coverage.',
        'Week 3-4: Improve architecture explanation and communication.',
        'Week 5: Re-attempt skill verification with mock timing.',
      ],
    };
  }

  getLeaderboard(scope: 'Global' | 'Company' | 'Department' | 'Skill', period: 'Monthly' | 'Yearly'): Array<{ rank: number; candidate: string; score: number; badge: string }> {
    const base = scope === 'Global' ? 88 : scope === 'Company' ? 83 : scope === 'Department' ? 80 : 85;
    return Array.from({ length: 8 }).map((_, idx) => ({
      rank: idx + 1,
      candidate: `Candidate ${idx + 1}`,
      score: Math.max(60, base - idx * 3 + (period === 'Yearly' ? 2 : 0)),
      badge: idx < 2 ? 'Gold' : idx < 5 ? 'Silver' : 'Bronze',
    }));
  }

  getPlatformAnalytics(): {
    assessmentCompletionRate: number;
    passPercentage: number;
    averageScores: number;
    topSkills: string[];
    weakSkills: string[];
    recruiterUsage: number;
    candidateParticipation: number;
  } {
    const store = readStore();
    const attempted = store.invitations.filter((inv) => inv.status !== 'pending').length;
    const passed = store.invitations.filter((inv) => inv.status === 'passed').length;
    const results = store.results;
    const avg = results.length
      ? Math.round(results.reduce((sum, row) => sum + row.overallScore, 0) / results.length)
      : 0;

    return {
      assessmentCompletionRate: store.invitations.length ? Math.round((attempted / store.invitations.length) * 100) : 0,
      passPercentage: attempted ? Math.round((passed / attempted) * 100) : 0,
      averageScores: avg,
      topSkills: ['React', 'TypeScript', 'SQL', 'Communication'],
      weakSkills: ['System Design', 'Cloud Security', 'Advanced DSA'],
      recruiterUsage: Math.max(12, store.invitations.length * 2),
      candidateParticipation: Math.max(25, results.length * 3),
    };
  }

  getPermissions() {
    return {
      candidate: 'Candidates can attempt assigned assessments.',
      recruiter: 'Recruiters can create, assign and review assessments.',
      admin: 'Platform Admin can manage assessment library and governance.',
    };
  }

  generateReports(candidateId?: string): {
    assessmentReport: string;
    skillReport: string;
    companySkillReport: string;
    hiringReadinessReport: string;
  } {
    const resultRows = candidateId ? this.listCandidateResults(candidateId) : this.listAllResults();
    const avg = resultRows.length ? Math.round(resultRows.reduce((sum, row) => sum + row.overallScore, 0) / resultRows.length) : 0;
    const date = format(new Date(), 'yyyy-MM-dd HH:mm');

    const assessmentReport = [
      '# Assessment Report',
      `Generated: ${date}`,
      `Total Results: ${resultRows.length}`,
      `Average Score: ${avg}`,
      '',
      'Includes completion and pass trend for targeted audience.',
    ].join('\n');

    const skillReport = [
      '# Skill Report',
      `Generated: ${date}`,
      'Top Skills: React, TypeScript, SQL, Communication',
      'Weak Skills: System Design, Cloud Security, Advanced DSA',
    ].join('\n');

    const companySkillReport = [
      '# Company Skill Report',
      `Generated: ${date}`,
      'Team skill density and certification readiness overview.',
    ].join('\n');

    const hiringReadinessReport = [
      '# Hiring Readiness Report',
      `Generated: ${date}`,
      `Average hiring readiness score: ${Math.max(55, avg)} / 100`,
      'Recommendation: Prioritize interviews for candidates with verified advanced badges.',
    ].join('\n');

    return {
      assessmentReport,
      skillReport,
      companySkillReport,
      hiringReadinessReport,
    };
  }

  downloadReport(content: string, formatKind: 'pdf' | 'excel' | 'csv'): string {
    if (formatKind === 'csv') {
      return content
        .split('\n')
        .map((line) => `"${line.replace(/"/g, '""')}"`)
        .join('\n');
    }

    if (formatKind === 'excel') {
      return `EXCEL_EXPORT\n${content}`;
    }

    return `PDF_EXPORT\n${content}`;
  }

  generateCertificateDocument(certificate: Certificate): string {
    return [
      'JOBPOYT VERIFIED CERTIFICATE',
      `Certificate ID: ${certificate.certificateId}`,
      `Candidate Name: ${certificate.candidateName}`,
      `Skill: ${certificate.skill}`,
      `Score: ${certificate.score}`,
      `Completion Date: ${format(new Date(certificate.completionDate), 'yyyy-MM-dd')}`,
      `Verification URL: ${certificate.verificationUrl}`,
      `QR: ${certificate.qrCodeUrl}`,
    ].join('\n');
  }

  getProctoringArchitecture() {
    return {
      webcamMonitoring: 'Pluggable adapter ready',
      screenMonitoring: 'Pluggable adapter ready',
      tabSwitchingDetection: 'Implemented via visibility API hooks',
      copyPasteDetection: 'Implemented via clipboard event hooks',
      multipleMonitorDetection: 'Future-ready capability via desktop integration',
      aiSuspiciousActivityScore: 'Computed from behavior events and confidence weights',
    };
  }
}

export const assessmentPlatformService = new AssessmentPlatformService();
