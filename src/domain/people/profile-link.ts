export type ProfileProvider = 'GITHUB' | 'LINKEDIN' | 'GRAVATAR' | 'IMAGE_URL' | 'MANUAL';

export interface ParsedProfile {
  provider: ProfileProvider;
  username: string | null;
  profileUrl: string | null;
  photoHint: string | null;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i;

export function parseProfileInput(raw: string): ParsedProfile {
  const value = raw.trim();
  if (!value) {
    throw new Error('Enter a username, email, or profile URL.');
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return {
      provider: 'GRAVATAR',
      username: value.toLowerCase(),
      profileUrl: `mailto:${value.toLowerCase()}`,
      photoHint: null,
    };
  }

  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error('That does not look like a valid URL.');
    }
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);

    if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
      const inIndex = segments.findIndex((part) => part === 'in' || part === 'pub');
      const username = inIndex >= 0 ? (segments[inIndex + 1] ?? null) : (segments[0] ?? null);
      return {
        provider: 'LINKEDIN',
        username: username ? decodeURIComponent(username).replace(/\/$/, '') : null,
        profileUrl: url.toString(),
        photoHint: null,
      };
    }

    if (host === 'github.com' || host === 'avatars.githubusercontent.com') {
      const username = host === 'github.com' ? (segments[0] ?? null) : null;
      return {
        provider: 'GITHUB',
        username,
        profileUrl: username ? `https://github.com/${username}` : url.toString(),
        photoHint: username ? `https://github.com/${username}.png` : url.toString(),
      };
    }

    if (host.includes('gravatar.com')) {
      return {
        provider: 'GRAVATAR',
        username: segments[segments.length - 1] ?? null,
        profileUrl: url.toString(),
        photoHint: url.toString(),
      };
    }

    if (IMAGE_EXT.test(url.pathname) || host.includes('avatars')) {
      return {
        provider: 'IMAGE_URL',
        username: null,
        profileUrl: url.toString(),
        photoHint: url.toString(),
      };
    }

    return {
      provider: 'IMAGE_URL',
      username: null,
      profileUrl: url.toString(),
      photoHint: url.toString(),
    };
  }

  const username = value.replace(/^@/, '').replace(/\s+/g, '');
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(username)) {
    throw new Error('Use a GitHub-style username, an email, or a full profile URL.');
  }

  return {
    provider: 'GITHUB',
    username,
    profileUrl: `https://github.com/${username}`,
    photoHint: `https://github.com/${username}.png`,
  };
}
