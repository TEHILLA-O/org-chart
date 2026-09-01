import { describe, expect, it } from 'vitest';
import { parseProfileInput } from './profile-link';

describe('parseProfileInput', () => {
  it('parses GitHub URLs and bare usernames', () => {
    expect(parseProfileInput('https://github.com/octocat')).toMatchObject({
      provider: 'GITHUB',
      username: 'octocat',
      photoHint: 'https://github.com/octocat.png',
    });
    expect(parseProfileInput('@octocat').username).toBe('octocat');
  });

  it('parses LinkedIn URLs without fetching', () => {
    const parsed = parseProfileInput('https://www.linkedin.com/in/amelia-shah/');
    expect(parsed.provider).toBe('LINKEDIN');
    expect(parsed.username).toBe('amelia-shah');
    expect(parsed.photoHint).toBeNull();
  });

  it('treats emails as Gravatar', () => {
    expect(parseProfileInput('Amelia@Northstar.example')).toMatchObject({
      provider: 'GRAVATAR',
      username: 'amelia@northstar.example',
    });
  });

  it('accepts direct image URLs', () => {
    expect(parseProfileInput('https://example.com/photo.png')).toMatchObject({
      provider: 'IMAGE_URL',
      photoHint: 'https://example.com/photo.png',
    });
  });
});
