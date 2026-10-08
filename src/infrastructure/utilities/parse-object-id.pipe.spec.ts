import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

describe('ParseObjectIdPipe', () => {
  const pipe = new ParseObjectIdPipe();

  it.each(['507f1f77bcf86cd799439011', '507F1F77BCF86CD799439011'])(
    'converts a canonical ObjectId string (%s)',
    (value) => {
      const parsed = pipe.transform(value);

      expect(parsed).toBeInstanceOf(Types.ObjectId);
      expect(parsed.toString()).toBe(value.toLowerCase());
    },
  );

  it.each([
    'not-an-id',
    '507f1f77bcf86cd79943901',
    '507f1f77bcf86cd7994390110',
    '507f1f77bcf86cd79943901g',
  ])('rejects a non-canonical ObjectId string (%s)', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
