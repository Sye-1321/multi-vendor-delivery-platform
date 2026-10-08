import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { MenuItemMapper } from 'src/menu-item/menu-item.mapper';
import { MenuItemRepository } from './menu-item.repository';
import { MenuItemDataModel, MenuItemSchema } from './schemas/menu-item.schema';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('MenuItemRepository (MongoDB)', () => {
  let connection: Connection;
  let model: Model<MenuItemDataModel>;
  let repository: MenuItemRepository;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `menu_item_repository_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    model = connection.model(MenuItemDataModel.name, MenuItemSchema);
    await model.syncIndexes();
    repository = new MenuItemRepository(
      model as never,
      connection,
      new MenuItemMapper(new AuditMapper()),
    );
  });

  afterEach(async () => model.deleteMany({}));

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  it('rejects a negative update and preserves the persisted price', async () => {
    const restaurantId = new Types.ObjectId();
    const itemId = new Types.ObjectId();
    await model.create({
      _id: itemId,
      restaurantId,
      name: 'Valid item',
      image: 'item.png',
      price: 10.99,
      availability: true,
      auditCreatedBy: 'seed@example.com',
      auditCreatedDateTime: new Date().toISOString(),
    });

    await expect(
      repository.updateMenuItemById(restaurantId, itemId, {
        price: -1,
      } as Partial<MenuItemDataModel>),
    ).rejects.toMatchObject({ name: 'ValidationError' });

    expect((await model.findById(itemId).lean())?.price).toBe(10.99);
  });
});
