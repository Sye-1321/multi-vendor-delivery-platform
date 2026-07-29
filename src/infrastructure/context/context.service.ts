import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Context } from '../context/context';
import { IContextService } from './context-service.interface';
import { AuthenticatedPrincipal } from './context';

@Injectable()
export class ContextService implements IContextService {
  private readonly storage = new AsyncLocalStorage<Context>();

  run(context: Context, callback: () => void): void {
    this.storage.run(context, callback);
  }

  setPrincipal(principal: AuthenticatedPrincipal, authToken?: string): void {
    this.getContext().setPrincipal(principal, authToken);
  }

  getContext(): Context {
    const context = this.storage.getStore();

    if (!context) {
      throw new Error('Request context is not available');
    }

    return context;
  }
}
