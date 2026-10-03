import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { MenuItem } from './menu-item';
import { MenuItemService } from './menu-item.service';

describe('MenuItemService tenant scope', () => {
  it('rejects a selection when any requested item is outside the restaurant', async () => {
    const restaurantId = new Types.ObjectId();
    const localItemId = new Types.ObjectId();
    const foreignItemId = new Types.ObjectId();
    const menuItemRepository = {
      getMenuItemsByIds: jest
        .fn()
        .mockResolvedValue(Result.ok([{ id: localItemId } as MenuItem])),
    };
    const service = new MenuItemService(
      {} as never,
      menuItemRepository as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.getMenuItemsByIds(restaurantId, [localItemId, foreignItemId]),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
  });
});
