export type SkillSourceHint = 'GITHUB' | 'LINKEDIN' | 'BIO' | 'TITLE' | 'DIRECTORY';

export interface SkillSuggestion {
  name: string;
  source: SkillSourceHint;
  evidence: string;
}

const CATALOGUE: Array<{ name: string; pattern: RegExp; source?: SkillSourceHint }> = [
  { name: 'TypeScript', pattern: /\btypescript\b|\bts\b/i },
  { name: 'JavaScript', pattern: /\bjavascript\b|\bjs\b/i },
  { name: 'Python', pattern: /\bpython\b/i },
  { name: 'Go', pattern: /\bgolang\b|\b go\b/i },
  { name: 'Java', pattern: /\bjava\b/i },
  { name: 'React', pattern: /\breact\b/i },
  { name: 'Next.js', pattern: /\bnext\.?js\b/i },
  { name: 'SQL', pattern: /\bsql\b|\bpostgres\b|\bpostgresql\b/i },
  { name: 'People operations', pattern: /\bpeople ops\b|\bhrbp\b|\bhuman resources\b|\bpeople partner\b/i },
  { name: 'Finance', pattern: /\bfinance\b|\bcfo\b|\bcontroller\b|\baccountant\b/i },
  { name: 'Legal', pattern: /\blegal\b|\bgc\b|\bcounsel\b/i },
  { name: 'Product', pattern: /\bproduct manager\b|\bproduct lead\b|\bcpo\b/i },
  { name: 'Engineering leadership', pattern: /\bengineering manager\b|\bcto\b|\bvp engineering\b|\bhead of engineering\b/i },
  { name: 'Data', pattern: /\bdata scientist\b|\banalytics\b|\bmachine learning\b|\bml\b/i },
  { name: 'Design', pattern: /\bdesigner\b|\bux\b|\bui\b|\bfigma\b/i },
  { name: 'Sales', pattern: /\bsales\b|\baccount executive\b|\brevenue\b/i },
  { name: 'Marketing', pattern: /\bmarketing\b|\bbrand\b|\bgrowth\b/i },
  { name: 'Operations', pattern: /\boperations\b|\bcoo\b|\bcog\b/i },
  { name: 'Microsoft 365', pattern: /\bmicrosoft 365\b|\boffice 365\b|\bsharepoint\b|\bteams\b/i },
  { name: 'Leadership', pattern: /\bceo\b|\bmanaging director\b|\bgeneral manager\b/i },
];

function pushUnique(out: SkillSuggestion[], item: SkillSuggestion) {
  if (out.some((existing) => existing.name.toLowerCase() === item.name.toLowerCase())) return;
  out.push(item);
}

export function suggestSkillsFromText(
  text: string,
  source: SkillSourceHint,
  evidencePrefix = '',
): SkillSuggestion[] {
  const haystack = text.trim();
  if (!haystack) return [];
  const found: SkillSuggestion[] = [];
  for (const entry of CATALOGUE) {
    if (entry.pattern.test(haystack)) {
      pushUnique(found, {
        name: entry.name,
        source,
        evidence: evidencePrefix || haystack.slice(0, 140),
      });
    }
  }
  return found;
}

export function suggestSkillsFromSources(input: {
  title?: string | null;
  bio?: string | null;
  githubLanguages?: string[];
  githubBio?: string | null;
  linkedInText?: string | null;
  directorySkills?: string[];
}): SkillSuggestion[] {
  const out: SkillSuggestion[] = [];
  for (const language of input.githubLanguages ?? []) {
    const name = language.trim();
    if (name) pushUnique(out, { name, source: 'GITHUB', evidence: `GitHub language: ${name}` });
  }
  for (const item of suggestSkillsFromText(input.githubBio ?? '', 'GITHUB', 'GitHub bio')) {
    pushUnique(out, item);
  }
  for (const item of suggestSkillsFromText(input.linkedInText ?? '', 'LINKEDIN', 'LinkedIn text')) {
    pushUnique(out, item);
  }
  for (const item of suggestSkillsFromText(input.bio ?? '', 'BIO', 'Profile bio')) {
    pushUnique(out, item);
  }
  for (const item of suggestSkillsFromText(input.title ?? '', 'TITLE', `Title: ${input.title}`)) {
    pushUnique(out, item);
  }
  for (const skill of input.directorySkills ?? []) {
    const name = skill.trim();
    if (name) pushUnique(out, { name, source: 'DIRECTORY', evidence: 'Directory source' });
  }
  return out;
}

export function slugifySkill(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
