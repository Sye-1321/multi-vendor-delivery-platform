import { Role } from 'src/application/constants/constants';
import { ContextService } from './context.service';
import { Context } from './context';

describe('ContextService', () => {
  it('isolates context between concurrent requests', async () => {
    const contextService = new ContextService();
    const firstContext = new Context('first@example.com', 'first-request');
    const secondContext = new Context('second@example.com', 'second-request');

    const readContextAfter = (
      context: Context,
      delay: number,
    ): Promise<Context> =>
      new Promise((resolve) => {
        contextService.run(context, () => {
          setTimeout(() => resolve(contextService.getContext()), delay);
        });
      });

    const [firstResult, secondResult] = await Promise.all([
      readContextAfter(firstContext, 10),
      readContextAfter(secondContext, 0),
    ]);

    expect(firstResult).toBe(firstContext);
    expect(secondResult).toBe(secondContext);
  });

  it('attaches the authenticated principal to the active request', () => {
    const contextService = new ContextService();
    const context = new Context('guest@example.com', 'request-id');

    contextService.run(context, () => {
      contextService.setPrincipal(
        {
          userId: 'user-id',
          email: 'member@example.com',
          role: Role.END_USER,
        },
        'access-token',
      );

      expect(contextService.getContext()).toMatchObject({
        userId: 'user-id',
        email: 'member@example.com',
        role: Role.END_USER,
        authToken: 'access-token',
      });
    });
  });
});
