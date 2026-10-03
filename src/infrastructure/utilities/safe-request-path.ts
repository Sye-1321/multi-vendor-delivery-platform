import { Request } from 'express';

const historicalSensitiveRoutePrefixes = [
  '/auth/email-verification',
  '/users/new-email-verification',
  '/auth/password-reset/confirm',
  '/auth/registration-completion',
];

export function getSafeRequestPath(request: Request): string {
  const routePath = (request.route as { path?: unknown } | undefined)?.path;
  if (typeof routePath === 'string') {
    return `${request.baseUrl ?? ''}${routePath}`;
  }

  const pathname = request.originalUrl.split('?', 1)[0];
  for (const prefix of historicalSensitiveRoutePrefixes) {
    const prefixIndex = pathname.indexOf(prefix);
    const credentialStart = prefixIndex + prefix.length;
    if (
      prefixIndex >= 0 &&
      pathname.charAt(credentialStart) === '/' &&
      pathname.length > credentialStart + 1
    ) {
      return `${pathname.slice(0, credentialStart)}/[REDACTED]`;
    }
  }

  return pathname;
}
