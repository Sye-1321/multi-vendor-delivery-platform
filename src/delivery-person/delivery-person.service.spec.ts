import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { Context } from 'src/infrastructure/context/context';
import { DeliveryPersonService } from './delivery-person.service';

describe('DeliveryPersonService update error semantics', () => {
  it('preserves a duplicate-phone conflict', async () => {
    const id = new Types.ObjectId();
    const repository = {
      getDeliveryPersonById: jest.fn().mockResolvedValue(
        Result.ok({
          id,
          restaurantId: null,
        }),
      ),
      findByPhoneNumber: jest.fn().mockResolvedValue(
        Result.ok({
          id: new Types.ObjectId(),
        }),
      ),
      updateProfile: jest.fn(),
    };
    const service = new DeliveryPersonService(
      { getContext: () => new Context('admin@example.com') } as never,
      repository as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.updateSystemWideDeliveryPerson(id, {
        phoneNumber: '251911111111',
      }),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });
});
