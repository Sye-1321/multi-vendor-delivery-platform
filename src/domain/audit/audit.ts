import { Result } from '../result/result';
import { ValueObjects } from '../value-objects/value-object';
import { Context } from './../../infrastructure/context/context';
import { IAudit } from './../../infrastructure/database/mongoDB/base-document.interface';

export class Audit extends ValueObjects<IAudit> {
  get auditCreatedDateTime(): string {
    return this.props.auditCreatedDateTime;
  }

  get auditCreatedBy(): string {
    return this.props.auditCreatedBy;
  }

  get auditModifiedBy(): string | undefined {
    return this.props.auditModifiedBy;
  }

  get auditModifiedDateTime(): string | undefined {
    return this.props.auditModifiedDateTime;
  }

  get auditDeletedBy(): string | undefined {
    return this.props.auditDeletedBy;
  }

  get auditDeletedDateTime(): string | undefined {
    return this.props.auditDeletedDateTime;
  }

  static create(props: IAudit): Result<Audit> {
    return Result.ok(new Audit(props));
  }

  static createInsertContext(context: Context): Audit {
    const audit: IAudit = {
      auditCreatedDateTime: new Date().toISOString(),
      auditCreatedBy: context.email,
    };
    return Audit.create(audit).getValue();
  }

  static updateContext(email: string, entity: { audit: Audit }): Audit {
    return Audit.create({
      auditCreatedDateTime: entity.audit.auditCreatedDateTime,
      auditCreatedBy: entity.audit.auditCreatedBy,
      auditModifiedBy: email,
      auditModifiedDateTime: new Date().toISOString(),
      auditDeletedBy: entity.audit.auditDeletedBy,
      auditDeletedDateTime: entity.audit.auditDeletedDateTime,
    }).getValue();
  }
}
