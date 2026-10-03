import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { Role } from 'src/application/constants/constants';
import { Company } from 'src/company/company';
import { CompanyMapper } from 'src/company/company.mapper';
import { Audit } from 'src/domain/audit/audit';
import { MenuItemMapper } from 'src/menu-item/menu-item.mapper';
import { MenuMapper } from 'src/menu/menu.mapper';
import { RestaurantReview } from 'src/restaurant-review/restaurant-review';
import { RestaurantReviewMapper } from 'src/restaurant-review/restaurant-review.mapper';
import { RestaurantStatus } from 'src/restaurant/constants/constants';
import { Restaurant } from 'src/restaurant/restaurant';
import { RestaurantMapper } from 'src/restaurant/restaurant.mapper';
import { SystemReview } from 'src/system-review/system-review';
import { SystemReviewMapper } from 'src/system-review/system-review.mapper';
import { UserStatus } from 'src/user/constants/constants';
import { UserMapper } from 'src/user/user.mapper';
import { CompanyRepository } from './company.repository';
import { RestaurantReviewRepository } from './restaurant-review.repository';
import { RestaurantRepository } from './restaurant.repository';
import { CompanyDataModel, CompanySchema } from './schemas/company.schema';
import { MenuItemDataModel, MenuItemSchema } from './schemas/menu-item.schema';
import { MenuDataModel, MenuSchema } from './schemas/menu.schema';
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

describeWithMongo('Canonical relationship references (MongoDB)', () => {
  let connection: Connection;
  let userModel: Model<UserDataModel>;
  let companyModel: Model<CompanyDataModel>;
  let restaurantModel: Model<RestaurantDataModel>;
  let restaurantReviewModel: Model<RestaurantReviewDataModel>;
  let systemReviewModel: Model<SystemReviewDataModel>;
  let userMapper: UserMapper;
  let companyMapper: CompanyMapper;
  let restaurantMapper: RestaurantMapper;
  let restaurantReviewMapper: RestaurantReviewMapper;
  let systemReviewMapper: SystemReviewMapper;
  let companyRepository: CompanyRepository;
  let restaurantRepository: RestaurantRepository;
  let restaurantReviewRepository: RestaurantReviewRepository;
  let systemReviewRepository: SystemReviewRepository;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `relationship_references_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    userModel = connection.model(UserDataModel.name, UserSchema);
    companyModel = connection.model(CompanyDataModel.name, CompanySchema);
    restaurantModel = connection.model(
      RestaurantDataModel.name,
      RestaurantSchema,
    );
    restaurantReviewModel = connection.model(
      RestaurantReviewDataModel.name,
      RestaurantReviewSchema,
    );
    systemReviewModel = connection.model(
      SystemReviewDataModel.name,
      SystemReviewSchema,
    );
    connection.model(MenuDataModel.name, MenuSchema);
    connection.model(MenuItemDataModel.name, MenuItemSchema);

    const auditMapper = new AuditMapper();
    userMapper = new UserMapper(auditMapper);
    companyMapper = new CompanyMapper(auditMapper, userMapper);
    restaurantReviewMapper = new RestaurantReviewMapper(
      auditMapper,
      userMapper,
    );
    systemReviewMapper = new SystemReviewMapper(auditMapper, userMapper);
    restaurantMapper = new RestaurantMapper(
      auditMapper,
      restaurantReviewMapper,
      new MenuMapper(auditMapper, new MenuItemMapper(auditMapper)),
      userMapper,
      companyMapper,
    );
    companyRepository = new CompanyRepository(
      companyModel as never,
      connection,
      companyMapper,
    );
    restaurantRepository = new RestaurantRepository(
      restaurantModel as never,
      connection,
      restaurantMapper,
    );
    restaurantReviewRepository = new RestaurantReviewRepository(
      restaurantReviewModel as never,
      connection,
      restaurantReviewMapper,
    );
    systemReviewRepository = new SystemReviewRepository(
      systemReviewModel as never,
      connection,
      systemReviewMapper,
    );
  });

  afterEach(async () => {
    await Promise.all([
      userModel.deleteMany({}),
      companyModel.deleteMany({}),
      restaurantModel.deleteMany({}),
      restaurantReviewModel.deleteMany({}),
      systemReviewModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  const audit = () =>
    Audit.create({
      auditCreatedBy: 'relationship-test@example.com',
      auditCreatedDateTime: new Date().toISOString(),
    }).getValue();

  async function createUser(name: string) {
    const id = new Types.ObjectId();
    await userModel.create({
      _id: id,
      name,
      email: `${name.toLowerCase()}@example.com`,
      phoneNumber: `${name}-phone`,
      passwordHash: `${name}-password-hash`,
      refreshTokenHash: `${name}-refresh-token-hash`,
      role: Role.END_USER,
      status: UserStatus.ACTIVE,
      savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
      auditCreatedBy: 'relationship-test@example.com',
      auditCreatedDateTime: new Date().toISOString(),
    });
    return userMapper.toDomain((await userModel.findById(id))!);
  }

  async function createCompany(owner: Awaited<ReturnType<typeof createUser>>) {
    const company = Company.create(
      {
        logo: 'company-logo',
        name: `Company ${randomUUID()}`,
        phoneNumber: randomUUID(),
        ownerId: owner.id,
        owner,
        savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
        audit: audit(),
      },
      new Types.ObjectId(),
    ).getValue();
    return (
      await companyRepository.createCompany(
        companyMapper.toPersistence(company),
      )
    ).getValue();
  }

  async function createRestaurant(
    company: Awaited<ReturnType<typeof createCompany>>,
    administrator: Awaited<ReturnType<typeof createUser>>,
  ) {
    const restaurant = Restaurant.create(
      {
        name: `Restaurant ${randomUUID()}`,
        savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
        phoneNumber: randomUUID(),
        companyId: company.id,
        company,
        deliveryPersonAvailability: false,
        reviews: [],
        menus: [],
        restaurantAdminId: administrator.id,
        restaurantAdmin: administrator,
        status: RestaurantStatus.ACTIVE,
        openingHours: '08:00',
        closingHours: '20:00',
        image: 'restaurant-image',
        logo: 'restaurant-logo',
        audit: audit(),
      },
      new Types.ObjectId(),
    ).getValue();
    return (
      await restaurantRepository.createRestaurant(
        restaurantMapper.toPersistence(restaurant),
      )
    ).getValue();
  }

  it('stores only canonical ObjectId relationships for new documents', async () => {
    const owner = await createUser('Owner');
    const administrator = await createUser('Administrator');
    const author = await createUser('Author');
    const company = await createCompany(owner);
    const restaurant = await createRestaurant(company, administrator);

    const restaurantReview = RestaurantReview.create(
      {
        userId: author.id,
        user: author,
        restaurantId: restaurant.id,
        rating: 5,
        reviewText: 'Excellent service',
        audit: audit(),
      },
      new Types.ObjectId(),
    ).getValue();
    const systemReview = SystemReview.create(
      {
        userId: author.id,
        user: author,
        rating: 5,
        reviewText: 'A'.repeat(160),
        audit: audit(),
      },
      new Types.ObjectId(),
    ).getValue();

    await restaurantReviewRepository.createRestaurantReview(
      restaurantReviewMapper.toPersistence(restaurantReview),
    );
    await systemReviewRepository.createSystemReview(
      systemReviewMapper.toPersistence(systemReview),
    );

    const [rawCompany, rawRestaurant, rawRestaurantReview, rawSystemReview] =
      await Promise.all([
        companyModel.collection.findOne({ _id: company.id }),
        restaurantModel.collection.findOne({ _id: restaurant.id }),
        restaurantReviewModel.collection.findOne({ _id: restaurantReview.id }),
        systemReviewModel.collection.findOne({ _id: systemReview.id }),
      ]);

    expect(rawCompany?.ownerId).toBeInstanceOf(Types.ObjectId);
    expect(rawRestaurant?.companyId).toBeInstanceOf(Types.ObjectId);
    expect(rawRestaurant?.restaurantAdminId).toBeInstanceOf(Types.ObjectId);
    expect(rawRestaurantReview?.userId).toBeInstanceOf(Types.ObjectId);
    expect(rawRestaurantReview?.restaurantId).toBeInstanceOf(Types.ObjectId);
    expect(rawSystemReview?.userId).toBeInstanceOf(Types.ObjectId);

    expect(rawCompany).not.toHaveProperty('owner');
    expect(rawRestaurant).not.toHaveProperty('company');
    expect(rawRestaurant).not.toHaveProperty('restaurantAdmin');
    expect(rawRestaurantReview).not.toHaveProperty('user');
    expect(rawSystemReview).not.toHaveProperty('user');

    const relationshipJson = JSON.stringify({ rawCompany, rawRestaurant });
    expect(relationshipJson).not.toContain('passwordHash');
    expect(relationshipJson).not.toContain('refreshTokenHash');
    expect(relationshipJson).not.toContain('_passwordHash');
    expect(relationshipJson).not.toContain('_refreshTokenHash');
  });

  it('ignores contradictory historical relationship fields', async () => {
    const canonicalUser = await createUser('Canonical');
    const historicalUser = await createUser('Historical');
    const canonicalCompany = await createCompany(canonicalUser);
    const historicalCompany = await createCompany(historicalUser);
    const companyId = new Types.ObjectId();
    const restaurantId = new Types.ObjectId();
    const reviewId = new Types.ObjectId();
    const auditFields = {
      auditCreatedBy: 'relationship-test@example.com',
      auditCreatedDateTime: new Date().toISOString(),
    };

    await companyModel.collection.insertOne({
      _id: companyId,
      logo: 'legacy-logo',
      name: 'Legacy Company',
      phoneNumber: randomUUID(),
      ownerId: canonicalUser.id,
      owner: { _id: historicalUser.id },
      savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
      ...auditFields,
    });
    await restaurantModel.collection.insertOne({
      _id: restaurantId,
      name: 'Legacy Restaurant',
      savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
      phoneNumber: randomUUID(),
      companyId: canonicalCompany.id,
      company: { _id: historicalCompany.id },
      deliveryPersonAvailability: false,
      restaurantAdminId: canonicalUser.id,
      restaurantAdmin: { _id: historicalUser.id },
      status: RestaurantStatus.ACTIVE,
      openingHours: '08:00',
      closingHours: '20:00',
      image: 'legacy-image',
      logo: 'legacy-logo',
      menus: [],
      reviews: [],
      ...auditFields,
    });
    await restaurantReviewModel.collection.insertOne({
      _id: reviewId,
      userId: canonicalUser.id,
      user: historicalUser.id,
      restaurantId,
      rating: 4,
      reviewText: 'Legacy review',
      ...auditFields,
    });

    const [company, restaurant, review] = await Promise.all([
      companyRepository.getCompanyById(companyId),
      restaurantRepository.getRestaurantById(restaurantId),
      restaurantReviewRepository.getRestaurantReviewById(reviewId),
    ]);

    expect(company.getValue().owner.id).toEqual(canonicalUser.id);
    expect(restaurant.getValue().company.id).toEqual(canonicalCompany.id);
    expect(restaurant.getValue().restaurantAdmin.id).toEqual(canonicalUser.id);
    expect(review.getValue().user.id).toEqual(canonicalUser.id);
  });

  it('loads complete authors for both review types', async () => {
    const author = await createUser('ReviewAuthor');
    const restaurantReview = RestaurantReview.create(
      {
        userId: author.id,
        user: author,
        restaurantId: new Types.ObjectId(),
        rating: 4,
        reviewText: 'Restaurant review',
        audit: audit(),
      },
      new Types.ObjectId(),
    ).getValue();
    const systemReview = SystemReview.create(
      {
        userId: author.id,
        user: author,
        rating: 4,
        reviewText: 'S'.repeat(160),
        audit: audit(),
      },
      new Types.ObjectId(),
    ).getValue();

    const createdRestaurantReview = (
      await restaurantReviewRepository.createRestaurantReview(
        restaurantReviewMapper.toPersistence(restaurantReview),
      )
    ).getValue();
    const createdSystemReview = (
      await systemReviewRepository.createSystemReview(
        systemReviewMapper.toPersistence(systemReview),
      )
    ).getValue();

    for (const review of [createdRestaurantReview, createdSystemReview]) {
      expect(review.user.id).toEqual(author.id);
      expect(review.user.name).toBe(author.name);
      expect(review.user.email).toBe(author.email);
    }
  });
});
