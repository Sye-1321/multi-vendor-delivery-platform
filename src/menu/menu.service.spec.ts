import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { Context } from 'src/infrastructure/context/context';
import { Audit } from 'src/domain/audit/audit';
import { AuditMapper } from 'src/audit/audit.mapper';
import { MenuItem } from 'src/menu-item/menu-item';
import { MenuItemMapper } from 'src/menu-item/menu-item.mapper';
import { MenuMapper } from './menu.mapper';
import { Menu } from './menu';
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

describe('MenuService update contract', () => {
  const restaurantId = new Types.ObjectId();
  const menuId = new Types.ObjectId();
  const creationTime = '2025-01-01T00:00:00.000Z';

  function createItem(id = new Types.ObjectId()) {
    return MenuItem.create(
      {
        restaurantId,
        name: 'Existing item',
        image: 'item.png',
        price: 10,
        availability: true,
        audit: Audit.create({
          auditCreatedBy: 'creator@example.com',
          auditCreatedDateTime: creationTime,
        }).getValue(),
      },
      id,
    ).getValue();
  }

  function setup(existingItems: MenuItem[]) {
    const menu = Menu.create(
      {
        restaurantId,
        name: 'Lunch',
        image: 'menu.png',
        menuItems: existingItems,
        audit: Audit.create({
          auditCreatedBy: 'creator@example.com',
          auditCreatedDateTime: creationTime,
        }).getValue(),
      },
      menuId,
    ).getValue();
    const repository = {
      getMenuById: jest.fn().mockResolvedValue(Result.ok(menu)),
      updateMenuById: jest.fn().mockResolvedValue(Result.ok(menu)),
    };
    const menuItemService = { getMenuItemsByIds: jest.fn() };
    const mapper = new MenuMapper(
      new AuditMapper(),
      new MenuItemMapper(new AuditMapper()),
    );
    const service = new MenuService(
      { getContext: () => new Context('admin@example.com') } as never,
      repository as never,
      menuItemService as never,
      {
        getRestaurantByRAdmin: () => Promise.resolve({ id: restaurantId }),
      } as never,
      mapper,
    );
    return { service, repository, menuItemService };
  }

  it('clears menu items for an explicit empty selection and persists audit metadata', async () => {
    const { service, repository, menuItemService } = setup([createItem()]);

    await service.updateMenu({ menuItemsIds: [] }, menuId);

    expect(menuItemService.getMenuItemsByIds).not.toHaveBeenCalled();
    const model = repository.updateMenuById.mock.calls[0][2];
    expect(model.menuItems).toEqual([]);
    expect(model.auditCreatedBy).toBe('creator@example.com');
    expect(model.auditCreatedDateTime).toBe(creationTime);
    expect(model.auditModifiedBy).toBe('admin@example.com');
    expect(model.auditModifiedDateTime).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(model.auditModifiedDateTime))).toBe(false);
  });

  it('preserves existing menu items when menuItemsIds is omitted', async () => {
    const existingItem = createItem();
    const { service, repository, menuItemService } = setup([existingItem]);

    await service.updateMenu({ name: 'Updated name' }, menuId);

    expect(menuItemService.getMenuItemsByIds).not.toHaveBeenCalled();
    const model = repository.updateMenuById.mock.calls[0][2];
    expect(model.name).toBe('Updated name');
    expect(model.menuItems).toHaveLength(1);
    expect(model.menuItems[0]._id).toEqual(existingItem.id);
  });

  it('loads and persists a non-empty menu item selection', async () => {
    const selectedItem = createItem();
    const { service, repository, menuItemService } = setup([]);
    menuItemService.getMenuItemsByIds.mockResolvedValue([selectedItem]);

    await service.updateMenu({ menuItemsIds: [selectedItem.id] }, menuId);

    expect(menuItemService.getMenuItemsByIds).toHaveBeenCalledWith(
      restaurantId,
      [selectedItem.id],
    );
    const model = repository.updateMenuById.mock.calls[0][2];
    expect(model.menuItems).toHaveLength(1);
    expect(model.menuItems[0]._id).toEqual(selectedItem.id);
  });
});
