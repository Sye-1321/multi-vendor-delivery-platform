import { environmentValidationSchema } from './environment-validation';

describe('ACCOUNT_ACTION_BASE_URL validation', () => {
  const schema = environmentValidationSchema.extract('ACCOUNT_ACTION_BASE_URL');

  it.each(['', 'http://localhost:5173', 'https://client.example/account'])(
    'accepts %j',
    (value) => {
      expect(schema.validate(value).error).toBeUndefined();
    },
  );

  it.each([
    'https://client.example/account?source=email',
    'https://client.example/account#section',
  ])('rejects %j', (value) => {
    expect(schema.validate(value).error).toBeDefined();
  });
});
