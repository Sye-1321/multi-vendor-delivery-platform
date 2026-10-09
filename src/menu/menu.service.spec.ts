import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { Context } from 'src/infrastructure/context/context';
import { MenuService } from './menu.service';

jest.mock('src/application/saveFileLocally', () => ({
  SaveFileLocally: jest.fn(() => Promise.resolve('menu-covers/image.png')),
}));

describe('MenuService error semantics', () => {
  const restaurantId = new Types.ObjectId();
  const image = { originalname: 'image.png' } as Express.Multer.File;

  function buildService(repository: Record<string, jest.Mock>) {
    return new MenuService(
      { getContext: () => new Context('admin@example.com') } as never,
      repository as never,
      {} as never,
      {
        getRestaurantByRAdmin: () => Promise.resolve({ id: restaurantId }),
      } as never,
      { toPersistence: (menu) => menu } as never,
    );
  }

  it('rejects an existing tenant-scoped menu name with 409', async () => {
    const repository = {
      findMenuByName: jest.fn().mockResolvedValue(Result.ok({})),
      createMenu: jest.fn(),
    };
    const service = buildService(repository);

    await expect(
      service.createMenu({ name: 'Lunch' }, image),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    expect(repository.createMenu).not.toHaveBeenCalled();
  });

  it('rejects a missing menu update with 404', async () => {
    const repository = {
      getMenuById: jest
        .fn()
        .mockResolvedValue(Result.fail('Missing', HttpStatus.NOT_FOUND)),
    };
    const service = buildService(repository);

    await expect(
      service.updateMenu({}, new Types.ObjectId()),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it('propagates an unexpected create error unchanged', async () => {
    const unexpected = new Error('storage failed');
    const repository = {
      findMenuByName: jest
        .fn()
        .mockResolvedValue(Result.fail('Missing', HttpStatus.NOT_FOUND)),
      createMenu: jest.fn().mockRejectedValue(unexpected),
    };
    const service = buildService(repository);

    await expect(service.createMenu({ name: 'Lunch' }, image)).rejects.toBe(
      unexpected,
    );
  });
});
