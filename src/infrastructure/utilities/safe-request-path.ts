import { Request } from 'express';

export function getSafeRequestPath(request: Request): string {
  const routePath = (request.route as { path?: unknown } | undefined)?.path;

  if (typeof routePath === 'string') {
    return `${request.baseUrl ?? ''}${routePath}`;
  }

  return '/[unmatched]';
}
