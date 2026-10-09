import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { Role } from 'src/application/constants/constants';
import { CompanyMapper } from 'src/company/company.mapper';
import { Context } from 'src/infrastructure/context/context';
import { MenuItemMapper } from 'src/menu-item/menu-item.mapper';
import { MenuMapper } from 'src/menu/menu.mapper';
import { RestaurantReviewMapper } from 'src/restaurant-review/restaurant-review.mapper';
import { RestaurantReviewService } from 'src/restaurant-review/restaurant-review.service';
import { RestaurantMapper } from 'src/restaurant/restaurant.mapper';
import { SystemReviewMapper } from 'src/system-review/system-review.mapper';
import { SystemReviewService } from 'src/system-review/system-review.service';
import { UserStatus } from 'src/user/constants/constants';
import { User } from 'src/user/user';
import { UserMapper } from 'src/user/user.mapper';
import { RestaurantReviewRepository } from './restaurant-review.repository';
import { RestaurantRepository } from './restaurant.repository';
import {
  RestaurantReviewDataModel,
  RestaurantReviewSchema,
} from './schemas/restaurant-review.schema';
import {
  RestaurantDataModel,
  RestaurantSchema,
} from './schemas/restaurant.schema';
import {
  SystemReviewDataModel,
  SystemReviewSchema,
} from './schemas/system-review.schema';
import { UserDataModel, UserSchema } from './schemas/user.schema';
import { SystemReviewRepository } from './system-review.repository';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('Review integrity (MongoDB)', () => {
  let connection: Connection;
  let userModel: Model<UserDataModel>;
  let restaurantModel: Model<RestaurantDataModel>;
  let systemReviewModel: Model<SystemReviewDataModel>;
  let restaurantReviewModel: Model<RestaurantReviewDataModel>;
  let author: User;
  let systemReviewRepository: SystemReviewRepository;
  let restaurantReviewRepository: RestaurantReviewRepository;
  let restaurantRepository: RestaurantRepository;
  let systemReviewService: SystemReviewService;
  let restaurantReviewService: RestaurantReviewService;

  const context = new Context('review-integrity@example.com');
  const reviewProps = { rating: 5, reviewText: 'R'.repeat(160) };

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `review_integrity_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    userModel = connection.model(UserDataModel.name, UserSchema);
    restaurantModel = connection.model(
      RestaurantDataModel.name,
      RestaurantSchema,
    );
    systemReviewModel = connection.model(
      SystemReviewDataModel.name,
      SystemReviewSchema,
    );
    restaurantReviewModel = connection.model(
      RestaurantReviewDataModel.name,
      RestaurantReviewSchema,
    );

    await Promise.all([
      systemReviewModel.syncIndexes(),
      restaurantReviewModel.syncIndexes(),
      restaurantModel.syncIndexes(),
    ]);

    const auditMapper = new AuditMapper();
    const userMapper = new UserMapper(auditMapper);
    const systemReviewMapper = new SystemReviewMapper(auditMapper, userMapper);
    const restaurantReviewMapper = new RestaurantReviewMapper(
      auditMapper,
      userMapper,
    );
    const companyMapper = new CompanyMapper(auditMapper, userMapper);
    const restaurantMapper = new RestaurantMapper(
      auditMapper,
      restaurantReviewMapper,
      new MenuMapper(auditMapper, new MenuItemMapper(auditMapper)),
      userMapper,
      companyMapper,
    );

    systemReviewRepository = new SystemReviewRepository(
      systemReviewModel as never,
      connection,
      systemReviewMapper,
    );
    restaurantReviewRepository = new RestaurantReviewRepository(
      restaurantReviewModel as never,
      connection,
      restaurantReviewMapper,
    );
    restaurantRepository = new RestaurantRepository(
      restaurantModel as never,
      connection,
      restaurantMapper,
    );

    const contextService = { getContext: () => context };
    const userService = { getContextUser: () => Promise.resolve(author) };
    systemReviewService = new SystemReviewService(
      contextService as never,
      userService as never,
      systemReviewRepository,
      systemReviewMapper,
      userMapper,
    );
    restaurantReviewService = new RestaurantReviewService(
      contextService as never,
      userService as never,
      restaurantReviewRepository,
      restaurantRepository,
      restaurantReviewMapper,
    );
  });

  beforeEach(async () => {
    await Promise.all([
      userModel.deleteMany({}),
      restaurantModel.deleteMany({}),
      systemReviewModel.deleteMany({}),
      restaurantReviewModel.deleteMany({}),
    ]);

    const authorDocument = await userModel.create({
      _id: new Types.ObjectId(),
      name: 'Review Author',
      email: 'review-author@example.com',
      phoneNumber: '+251900000001',
      passwordHash: 'review-author-password-hash',
      role: Role.END_USER,
      status: UserStatus.ACTIVE,
      savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
      auditCreatedBy: 'review-integrity@example.com',
      auditCreatedDateTime: new Date().toISOString(),
    });
    author = new UserMapper(new AuditMapper()).toDomain(authorDocument);
  });

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  async function seedRestaurant(): Promise<Types.ObjectId> {
    const restaurantId = new Types.ObjectId();
    await restaurantModel.create({
      _id: restaurantId,
      name: `Restaurant ${randomUUID()}`,
      savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
      phoneNumber: randomUUID(),
      companyId: new Types.ObjectId(),
      restaurantAdminId: new Types.ObjectId(),
      status: 'ACTIVE',
      openingHours: '08:00',
      closingHours: '20:00',
      image: 'restaurant-image',
      logo: 'restaurant-logo',
      auditCreatedBy: 'review-integrity@example.com',
      auditCreatedDateTime: new Date().toISOString(),
    });
    return restaurantId;
  }

  function duplicateErrorCode(result: PromiseSettledResult<unknown>) {
    expect(result.status).toBe('rejected');
    return (result as PromiseRejectedResult).reason?.code;
  }

  it('allows only one concurrent system review after both prechecks pass', async () => {
    const realLookup = systemReviewRepository.getSystemReviewByUserId.bind(
      systemReviewRepository,
    );
    let completedLookups = 0;
    let releaseLookups!: () => void;
    const bothLookupsComplete = new Promise<void>((resolve) => {
      releaseLookups = resolve;
    });
    const lookupSpy = jest
      .spyOn(systemReviewRepository, 'getSystemReviewByUserId')
      .mockImplementation(async (userId) => {
        const result = await realLookup(userId);
        completedLookups += 1;
        if (completedLookups === 2) releaseLookups();
        await bothLookupsComplete;
        return result;
      });

    const results = await Promise.allSettled([
      systemReviewService.createReview(reviewProps),
      systemReviewService.createReview(reviewProps),
    ]);
    lookupSpy.mockRestore();

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    expect(
      duplicateErrorCode(results.find((r) => r.status === 'rejected')!),
    ).toBe(11000);
    expect(await systemReviewModel.countDocuments({ userId: author.id })).toBe(
      1,
    );
  });

  it('enforces one review per user and restaurant, not one per user globally', async () => {
    const restaurantA = await seedRestaurant();
    const restaurantB = await seedRestaurant();

    const concurrentResults = await Promise.allSettled([
      restaurantReviewService.createReview(restaurantA, reviewProps),
      restaurantReviewService.createReview(restaurantA, reviewProps),
    ]);

    expect(
      concurrentResults.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      concurrentResults.filter(({ status }) => status === 'rejected'),
    ).toHaveLength(1);
    expect(
      duplicateErrorCode(
        concurrentResults.find((result) => result.status === 'rejected')!,
      ),
    ).toBe(11000);
    expect(
      await restaurantReviewModel.countDocuments({
        userId: author.id,
        restaurantId: restaurantA,
      }),
    ).toBe(1);

    await expect(
      restaurantReviewService.createReview(restaurantB, reviewProps),
    ).resolves.toBeDefined();
    expect(
      await restaurantReviewModel.countDocuments({ userId: author.id }),
    ).toBe(2);
    expect(
      await restaurantReviewModel.countDocuments({
        userId: author.id,
        restaurantId: restaurantB,
      }),
    ).toBe(1);
  });

  it('rejects an unknown restaurant without persisting a review', async () => {
    const createSpy = jest.spyOn(
      restaurantReviewRepository,
      'createRestaurantReview',
    );

    await expect(
      restaurantReviewService.createReview(new Types.ObjectId(), reviewProps),
    ).rejects.toMatchObject({
      status: 404,
      response: { status: 404, error: 'Restaurant not found' },
    });
    expect(createSpy).not.toHaveBeenCalled();
    expect(await restaurantReviewModel.countDocuments({})).toBe(0);
    createSpy.mockRestore();
  });
});
