import { describe, expect, it } from 'vitest';
import { suggestSkillsFromSources } from './extract';

describe('suggestSkillsFromSources', () => {
  it('picks languages from GitHub and title keywords', () => {
    const found = suggestSkillsFromSources({
      title: 'Head of Engineering',
      githubLanguages: ['TypeScript', 'Python'],
      bio: 'I also work in React.',
    });
    expect(found.map((item) => item.name)).toEqual(
      expect.arrayContaining(['TypeScript', 'Python', 'Engineering leadership', 'React']),
    );
  });

  it('treats pasted LinkedIn copy as a source without fetching', () => {
    const found = suggestSkillsFromSources({
      linkedInText: 'Finance leader and former controller.',
    });
    expect(found.some((item) => item.name === 'Finance' && item.source === 'LINKEDIN')).toBe(true);
  });
});
