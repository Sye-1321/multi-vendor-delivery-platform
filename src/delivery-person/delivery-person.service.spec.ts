import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { Context } from 'src/infrastructure/context/context';
import { DeliveryPersonService } from './delivery-person.service';
import {
  DeleteFileLocally,
  SaveFileLocally,
} from 'src/application/saveFileLocally';

jest.mock('src/application/saveFileLocally', () => ({
  SaveFileLocally: jest.fn(() =>
    Promise.resolve('delivery-person-profiles/new.png'),
  ),
  DeleteFileLocally: jest.fn(() => Promise.resolve()),
}));

const saveFile = jest.mocked(SaveFileLocally);
const deleteFile = jest.mocked(DeleteFileLocally);

beforeEach(() => {
  saveFile.mockReset().mockResolvedValue('delivery-person-profiles/new.png');
  deleteFile.mockReset().mockResolvedValue();
});

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

describe('DeliveryPersonService media lifecycle', () => {
  const id = new Types.ObjectId();
  const oldImage = 'delivery-person-profiles/old.png';
  const existing = { id, restaurantId: null, profileImage: oldImage };

  function build(repository: Record<string, jest.Mock>) {
    return new DeliveryPersonService(
      { getContext: () => new Context('admin@example.com') } as never,
      repository as never,
      {} as never,
      { toPersistence: (entity) => entity } as never,
    );
  }

  it('cleans a provisional profile image when create persistence fails', async () => {
    const repository = {
      findByPhoneNumber: jest
        .fn()
        .mockResolvedValue(Result.fail('missing', 404)),
      createDeliveryPerson: jest
        .fn()
        .mockResolvedValue(Result.fail('failed', 500)),
    };

    await expect(
      build(repository).createSystemWideDeliveryPerson(
        {
          name: 'Courier',
          phoneNumber: '251911111111',
          savedAddress: { city: 'Addis', subCity: 'Bole' },
        },
        {} as Express.Multer.File,
      ),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(deleteFile).toHaveBeenCalledWith('delivery-person-profiles/new.png');
  });

  it('cleans a failed profile replacement and retains the old image', async () => {
    const repository = {
      getDeliveryPersonById: jest.fn().mockResolvedValue(Result.ok(existing)),
      updateProfile: jest.fn().mockResolvedValue(Result.fail('failed', 500)),
    };

    const result = await build(repository).updateSystemWideDeliveryPerson(
      id,
      {},
      {} as Express.Multer.File,
    );

    expect(result.isSuccess).toBe(false);
    expect(deleteFile).toHaveBeenCalledWith('delivery-person-profiles/new.png');
    expect(deleteFile).not.toHaveBeenCalledWith(oldImage);
  });

  it('deletes the old image after a narrow successful profile update', async () => {
    const unexpected = new Error('reload unavailable');
    const repository = {
      getDeliveryPersonById: jest
        .fn()
        .mockResolvedValueOnce(Result.ok(existing))
        .mockRejectedValueOnce(unexpected),
      updateProfile: jest.fn().mockResolvedValue(Result.ok(existing)),
    };

    await expect(
      build(repository).updateSystemWideDeliveryPerson(
        id,
        { name: 'Updated' },
        {} as Express.Multer.File,
      ),
    ).rejects.toBe(unexpected);

    expect(deleteFile).toHaveBeenCalledWith(oldImage);
    expect(deleteFile).not.toHaveBeenCalledWith(
      'delivery-person-profiles/new.png',
    );
    expect(repository.updateProfile).toHaveBeenCalledWith(id, {
      auditModifiedBy: 'admin@example.com',
      auditModifiedDateTime: expect.any(String),
      name: 'Updated',
      profileImage: 'delivery-person-profiles/new.png',
    });
  });
});
