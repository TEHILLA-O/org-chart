import { describe, expect, it } from 'vitest';
import { type Actor } from '../permissions/policy';
import { isFieldVisible, redactRecord } from './visibility';

const editor: Actor = { userId: 'u', organisationId: 'o', role: 'EDITOR' };
const admin: Actor = { userId: 'u', organisationId: 'o', role: 'ADMIN' };

describe('field privacy', () => {
  it('keeps internal fields on authenticated responses', () => {
    expect(isFieldVisible('email', { actor: editor })).toBe(true);
    expect(isFieldVisible('displayName', { actor: editor })).toBe(true);
  });

  it('strips admin-only fields for editors', () => {
    expect(
      isFieldVisible({ key: 'salary', visibility: 'ADMIN_ONLY' }, { actor: editor }),
    ).toBe(false);
    expect(
      isFieldVisible({ key: 'salary', visibility: 'ADMIN_ONLY' }, { actor: admin }),
    ).toBe(true);
  });

  it('never leaks private fields through share links even if allow-listed', () => {
    expect(
      isFieldVisible(
        { key: 'salary', visibility: 'ADMIN_ONLY', isPrivate: true },
        { actor: null, isShareLink: true, allowedFields: ['salary', 'displayName'] },
      ),
    ).toBe(false);
  });

  it('redacts records at the serialisation boundary', () => {
    const redacted = redactRecord(
      { displayName: 'Amelia Shah', email: 'amelia@northstar.example', phone: '1' },
      { actor: null, isShareLink: true, allowedFields: ['displayName'] },
    );
    expect(redacted.displayName).toBe('Amelia Shah');
    expect(redacted.email).toBeUndefined();
    expect(redacted.phone).toBeUndefined();
  });

  it('keeps holiday balances on authenticated responses and strips them from share links', () => {
    const record = {
      displayName: 'Amelia Shah',
      holidayRemainingDays: 18,
      costCentre: 'CC-200 Finance',
    };
    expect(redactRecord(record, { actor: editor }).holidayRemainingDays).toBe(18);
    expect(
      redactRecord(record, { actor: null, isShareLink: true, allowedFields: ['displayName'] })
        .holidayRemainingDays,
    ).toBeUndefined();
  });
});
