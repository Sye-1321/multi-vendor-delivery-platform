import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { Audit } from 'src/domain/audit/audit';
import { AuditMapper } from 'src/audit/audit.mapper';
import { Context } from 'src/infrastructure/context/context';
import { MenuItem } from './menu-item';
import { MenuItemMapper } from './menu-item.mapper';
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

describe('MenuItemService update audit', () => {
  it('persists the business update and the next immutable audit value', async () => {
    const restaurantId = new Types.ObjectId();
    const itemId = new Types.ObjectId();
    const creationTime = '2025-01-01T00:00:00.000Z';
    const menuItem = MenuItem.create(
      {
        restaurantId,
        name: 'Original item',
        image: 'item.png',
        price: 10,
        availability: true,
        audit: Audit.create({
          auditCreatedBy: 'creator@example.com',
          auditCreatedDateTime: creationTime,
        }).getValue(),
      },
      itemId,
    ).getValue();
    const repository = {
      getMenuItemById: jest.fn().mockResolvedValue(Result.ok(menuItem)),
      updateMenuItemById: jest.fn().mockResolvedValue(Result.ok(menuItem)),
    };
    const service = new MenuItemService(
      { getContext: () => new Context('editor@example.com') } as never,
      repository as never,
      {
        getRestaurantByRAdmin: () => Promise.resolve({ id: restaurantId }),
      } as never,
      new MenuItemMapper(new AuditMapper()),
    );

    await service.updateMenuItem(itemId, { price: 12.5 });

    const model = repository.updateMenuItemById.mock.calls[0][2];
    expect(model.price).toBe(12.5);
    expect(model.auditCreatedBy).toBe('creator@example.com');
    expect(model.auditCreatedDateTime).toBe(creationTime);
    expect(model.auditModifiedBy).toBe('editor@example.com');
    expect(model.auditModifiedDateTime).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(model.auditModifiedDateTime))).toBe(false);
  });
});
