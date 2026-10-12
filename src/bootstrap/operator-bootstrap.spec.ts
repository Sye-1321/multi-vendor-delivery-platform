import { Role } from 'src/application/constants/constants';
import {
  OperatorBootstrapError,
  validateOperatorInputs,
} from './operator-bootstrap';

describe('operator bootstrap validation', () => {
  it('rejects a weak password for a missing role without echoing it', () => {
    const weakPassword = 'visible-weak-value';

    expect(() =>
      validateOperatorInputs([Role.SYSTEM_ADMINISTRATOR], {
        BOOTSTRAP_SYSTEM_ADMIN_NAME: 'System Operator',
        BOOTSTRAP_SYSTEM_ADMIN_EMAIL: 'system@example.com',
        BOOTSTRAP_SYSTEM_ADMIN_PHONE: '251911111111',
        BOOTSTRAP_SYSTEM_ADMIN_PASSWORD: weakPassword,
      }),
    ).toThrow(OperatorBootstrapError);
    expect(() =>
      validateOperatorInputs([Role.SYSTEM_ADMINISTRATOR], {
        BOOTSTRAP_SYSTEM_ADMIN_NAME: 'System Operator',
        BOOTSTRAP_SYSTEM_ADMIN_EMAIL: 'system@example.com',
        BOOTSTRAP_SYSTEM_ADMIN_PHONE: '251911111111',
        BOOTSTRAP_SYSTEM_ADMIN_PASSWORD: weakPassword,
      }),
    ).not.toThrow(weakPassword);
  });
});
