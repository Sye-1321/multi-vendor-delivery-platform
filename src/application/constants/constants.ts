export const APIResponseMessage = {
  serverError: 'Critical server error occured, please try again later',
  emailHeaderError: 'user email is required',
  correlationIdHeaderError: 'correlationId is required',
  invalidEmailHeaderError: 'Invalid user email address',
  invalidCorrelationId: 'Invalid correlationId',
  emailHeader: 'x-user-email',
  correlationIdHeader: 'x-correlation-id',
  authorizationHeader: 'authorization',
  roleHeader: 'x-user-role',
  invalidToken: 'Invalid authentication token.',
  emailVerificationError: 'Error sending verification email',
  passwordResetError: 'Error sending password reset email',
  completeYourRegistrationError: 'Error sending finish registration email',
  emailChangeError: 'Error sending email change request email',
};

export const saltRounds = 10;

export const tokenExpiresIn = 3600000;

export enum Role {
  SYSTEM_ADMINISTRATOR = 'SYSTEM_ADMINISTRATOR',
  DELIVERY_COMPANY_ADMINISTRATOR = 'DELIVERY_COMPANY_ADMINISTRATOR',
  RESTAURANT_ADMINISTRATOR = 'RESTAURANT_ADMINISTRATOR',
  BUSINESS_ADMINISTRATOR = 'BUSINESS_ADMINISTRATOR',
  END_USER = 'END_USER',
}

export const RoleOrder: Record<Role, number> = {
  [Role.END_USER]: 1,
  [Role.BUSINESS_ADMINISTRATOR]: 2,
  [Role.RESTAURANT_ADMINISTRATOR]: 3,
  [Role.DELIVERY_COMPANY_ADMINISTRATOR]: 4,
  [Role.SYSTEM_ADMINISTRATOR]: 5,
};

export const ROLE_KEY = 'role';

export const EmailSubjects = {
  emailVerification: 'Email Verification Request',
  passwordReset: 'Password Reset Request',
  emailChange: 'Email Change Request',
  completeRegistration: 'Complete Your Registration',
};

export const BASE_URL = 'http://localhost:5173/almost-there';

export const URLPaths = {
  verifyEmail: '/verify-email',
  passwordResetConfirm: '/password-reset-confirm',
  verifyNewEmail: '/verify-new-email',
};
