import { CartItemSchema } from './cart-item.schema';

describe('CartItemSchema', () => {
  it('does not create a version field named false', () => {
    expect(CartItemSchema.get('versionKey')).toBe(false);
    expect(CartItemSchema.path('false')).toBeUndefined();
  });

  it('stores the deletion actor as text', () => {
    expect(CartItemSchema.path('auditDeletedBy')?.instance).toBe('String');
  });
});
