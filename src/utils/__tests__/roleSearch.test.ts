import test from 'node:test';
import assert from 'node:assert/strict';

import { detectRoleFamily, matchesRoleSearchIntent } from '../roleSearch.ts';

const softwareEngineerReactJob = {
  title: 'Software Engineer',
  company_name: 'Acme',
  description: 'Build modern web experiences for customers using React and TypeScript.',
  skills: ['React', 'JavaScript', 'HTML', 'CSS'],
};

test('matches react keyword for a React-capable software engineer role', () => {
  assert.equal(matchesRoleSearchIntent(softwareEngineerReactJob, 'react'), true);
  assert.equal(matchesRoleSearchIntent(softwareEngineerReactJob, 'react developer'), true);
  assert.equal(matchesRoleSearchIntent(softwareEngineerReactJob, 'react js developer'), true);
  assert.equal(matchesRoleSearchIntent(softwareEngineerReactJob, 'frontend developer'), true);
});

test('does not match unrelated languages for a React job', () => {
  assert.equal(matchesRoleSearchIntent(softwareEngineerReactJob, 'python developer'), false);
  assert.equal(matchesRoleSearchIntent(softwareEngineerReactJob, 'java developer'), false);
  assert.equal(matchesRoleSearchIntent(softwareEngineerReactJob, '.net developer'), false);
});

test('matches node.js and java role intents when relevant', () => {
  const nodeJob = {
    title: 'Backend Engineer',
    company_name: 'NodeWorks',
    description: 'Build APIs with Node.js and Express in a product engineering team.',
    skills: ['Node.js', 'Express', 'TypeScript'],
  };

  assert.equal(matchesRoleSearchIntent(nodeJob, 'node developer'), true);
  assert.equal(matchesRoleSearchIntent(nodeJob, 'node.js developer'), true);
  assert.equal(matchesRoleSearchIntent(nodeJob, 'backend engineer'), true);
});

test('treats all listed frontend-ui aliases as one role family', () => {
  const frontendJob = {
    title: 'Software Engineer',
    company_name: 'Acme',
    description: 'Build web interfaces and user experiences using React, JavaScript, TypeScript, HTML, and CSS.',
    skills: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
  };

  assert.equal(detectRoleFamily('frontend developer'), 'frontend_ui');
  assert.equal(detectRoleFamily('ui developer'), 'frontend_ui');
  assert.equal(detectRoleFamily('react developer'), 'frontend_ui');
  assert.equal(detectRoleFamily('angular developer'), 'frontend_ui');
  assert.equal(detectRoleFamily('vue.js developer'), 'frontend_ui');
  assert.equal(detectRoleFamily('javascript developer'), 'frontend_ui');
  assert.equal(detectRoleFamily('typescript developer'), 'frontend_ui');
  assert.equal(detectRoleFamily('html/css developer'), 'frontend_ui');
  assert.equal(detectRoleFamily('web developer'), 'frontend_ui');
  assert.equal(detectRoleFamily('next.js developer'), 'frontend_ui');
  assert.equal(detectRoleFamily('angular'), 'frontend_ui');
  assert.equal(detectRoleFamily('vue'), 'frontend_ui');

  assert.equal(matchesRoleSearchIntent(frontendJob, 'frontend developer'), true);
  assert.equal(matchesRoleSearchIntent(frontendJob, 'ui developer'), true);
  assert.equal(matchesRoleSearchIntent(frontendJob, 'react developer'), true);
  assert.equal(matchesRoleSearchIntent(frontendJob, 'javascript developer'), true);
  assert.equal(matchesRoleSearchIntent(frontendJob, 'angular'), true);
  assert.equal(matchesRoleSearchIntent(frontendJob, 'vue'), true);

  assert.equal(matchesRoleSearchIntent(frontendJob, 'java developer'), false);
  assert.equal(matchesRoleSearchIntent(frontendJob, 'python developer'), false);
  assert.equal(matchesRoleSearchIntent(frontendJob, '.net developer'), false);
  assert.equal(matchesRoleSearchIntent(frontendJob, 'aws developer'), false);
});
