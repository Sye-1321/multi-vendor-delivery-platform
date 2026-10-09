import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { Audit } from 'src/domain/audit/audit';
import { AuditMapper } from 'src/audit/audit.mapper';
import { Context } from 'src/infrastructure/context/context';
import { MenuItem } from './menu-item';
import { MenuItemMapper } from './menu-item.mapper';
import { MenuItemService } from './menu-item.service';
import {
  DeleteFileLocally,
  SaveFileLocally,
} from 'src/application/saveFileLocally';

jest.mock('src/application/saveFileLocally', () => ({
  SaveFileLocally: jest.fn(() => Promise.resolve('menu-item-covers/new.png')),
  DeleteFileLocally: jest.fn(() => Promise.resolve()),
}));

const saveFile = jest.mocked(SaveFileLocally);
const deleteFile = jest.mocked(DeleteFileLocally);

beforeEach(() => {
  saveFile.mockReset().mockResolvedValue('menu-item-covers/new.png');
  deleteFile.mockReset().mockResolvedValue();
});

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

describe('MenuItemService media lifecycle', () => {
  const restaurantId = new Types.ObjectId();
  const itemId = new Types.ObjectId();
  const oldImage = 'menu-item-covers/old.png';

  function item() {
    return MenuItem.create(
      {
        restaurantId,
        name: 'Item',
        image: oldImage,
        price: 10,
        availability: true,
        audit: Audit.create({
          auditCreatedBy: 'creator@example.com',
          auditCreatedDateTime: '2025-01-01T00:00:00.000Z',
        }).getValue(),
      },
      itemId,
    ).getValue();
  }

  function build(repository: Record<string, jest.Mock>) {
    return new MenuItemService(
      { getContext: () => new Context('editor@example.com') } as never,
      repository as never,
      {
        getRestaurantByRAdmin: () => Promise.resolve({ id: restaurantId }),
      } as never,
      new MenuItemMapper(new AuditMapper()),
    );
  }

  it('cleans a provisional image when create persistence fails', async () => {
    const repository = {
      findMenuItemByName: jest
        .fn()
        .mockResolvedValue(Result.fail('missing', 404)),
      createMenuItem: jest.fn().mockResolvedValue(Result.fail('failed', 500)),
    };

    await expect(
      build(repository).createMenuItem(
        { name: 'Item', price: 10, availability: true } as never,
        {} as Express.Multer.File,
      ),
    ).rejects.toMatchObject({ status: 500 });
    expect(deleteFile).toHaveBeenCalledWith('menu-item-covers/new.png');
  });

  it('cleans a failed replacement and retains the old image', async () => {
    const repository = {
      getMenuItemById: jest.fn().mockResolvedValue(Result.ok(item())),
      updateMenuItemById: jest
        .fn()
        .mockResolvedValue(Result.fail('failed', 500)),
    };

    await expect(
      build(repository).updateMenuItem(itemId, {}, {} as Express.Multer.File),
    ).rejects.toMatchObject({ status: 500 });
    expect(deleteFile).toHaveBeenCalledWith('menu-item-covers/new.png');
    expect(deleteFile).not.toHaveBeenCalledWith(oldImage);
  });

  it('deletes the old image after a successful replacement', async () => {
    const existing = item();
    const repository = {
      getMenuItemById: jest.fn().mockResolvedValue(Result.ok(existing)),
      updateMenuItemById: jest.fn().mockResolvedValue(Result.ok(existing)),
    };

    await build(repository).updateMenuItem(
      itemId,
      {},
      {} as Express.Multer.File,
    );

    expect(deleteFile).toHaveBeenCalledWith(oldImage);
    expect(deleteFile).not.toHaveBeenCalledWith('menu-item-covers/new.png');
    const model = repository.updateMenuItemById.mock.calls[0][2];
    expect(model.auditCreatedBy).toBe('creator@example.com');
    expect(model.auditModifiedBy).toBe('editor@example.com');
  });

  it('deletes the owned image only after deletion succeeds', async () => {
    const repository = {
      getMenuItemById: jest.fn().mockResolvedValue(Result.ok(item())),
      deleteMenuItem: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };

    await build(repository).deleteMenuItem(itemId);
    expect(deleteFile).toHaveBeenCalledWith(oldImage);
  });

  it('retains the image when deletion fails', async () => {
    const repository = {
      getMenuItemById: jest.fn().mockResolvedValue(Result.ok(item())),
      deleteMenuItem: jest.fn().mockResolvedValue(Result.fail('failed', 500)),
    };

    await expect(
      build(repository).deleteMenuItem(itemId),
    ).rejects.toMatchObject({
      status: 500,
    });
    expect(deleteFile).not.toHaveBeenCalled();
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
