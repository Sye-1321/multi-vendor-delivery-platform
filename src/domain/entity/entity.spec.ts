import { Types } from 'mongoose';
import { Entity } from './entity';

class TestEntity extends Entity<Record<string, never>> {}

describe('Entity equality', () => {
  it('compares identifier values rather than object references', () => {
    const id = new Types.ObjectId();

    expect(
      new TestEntity(id).equals(new TestEntity(new Types.ObjectId(id))),
    ).toBe(true);
    expect(
      new TestEntity(id).equals(new TestEntity(new Types.ObjectId())),
    ).toBe(false);
  });
});
