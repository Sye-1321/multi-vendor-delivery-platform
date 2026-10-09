import { Audit } from './audit';

describe('Audit', () => {
  it('creates an immutable next audit value for an update', () => {
    const originalAudit = Audit.create({
      auditCreatedBy: 'creator@example.com',
      auditCreatedDateTime: '2025-01-01T00:00:00.000Z',
      auditDeletedBy: 'deleter@example.com',
      auditDeletedDateTime: '2025-02-01T00:00:00.000Z',
    }).getValue();

    const result = Audit.updateContext('editor@example.com', {
      audit: originalAudit,
    });

    expect(result).toBeInstanceOf(Audit);
    expect(result).not.toBe(originalAudit);
    expect(result.auditCreatedBy).toBe('creator@example.com');
    expect(result.auditCreatedDateTime).toBe('2025-01-01T00:00:00.000Z');
    expect(result.auditDeletedBy).toBe('deleter@example.com');
    expect(result.auditDeletedDateTime).toBe('2025-02-01T00:00:00.000Z');
    expect(result.auditModifiedBy).toBe('editor@example.com');
    expect(result.auditModifiedDateTime).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(result.auditModifiedDateTime!))).toBe(false);
    expect(originalAudit.auditModifiedBy).toBeUndefined();
    expect(originalAudit.auditModifiedDateTime).toBeUndefined();
  });
});
