import { AuthenticatedPrincipal, Context } from './context';

export interface IContextService {
  run(context: Context, callback: () => void): void;
  setPrincipal(principal: AuthenticatedPrincipal, authToken?: string): void;
  getContext(): Context;
}
