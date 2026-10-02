import { GenericDocumentRepository } from './generic-document.repository';

describe('GenericDocumentRepository.findOneAndUpdate', () => {
  it('preserves every condition when the filter contains _id', async () => {
    const document = { _id: 'user-id', refreshTokenHash: 'current-digest' };
    const model = {
      findOneAndUpdate: jest.fn(
        (filter: Record<string, string>, update: Record<string, string>) => {
          const matches = Object.entries(filter).every(
            ([key, value]) => document[key as keyof typeof document] === value,
          );
          return Promise.resolve(matches ? { ...document, ...update } : null);
        },
      ),
    };
    const repository = new (class extends GenericDocumentRepository<
      typeof document,
      never
    > {})(model as never, {} as never, {
      toDomain: (value: typeof document) => value,
    });

    const result = await repository.findOneAndUpdate(
      { _id: 'user-id', refreshTokenHash: 'stale-digest' } as never,
      { refreshTokenHash: 'replacement-digest' } as never,
    );

    expect(result.isSuccess).toBe(false);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'user-id', refreshTokenHash: 'stale-digest' },
      { refreshTokenHash: 'replacement-digest' },
      { new: true },
    );
  });
});
