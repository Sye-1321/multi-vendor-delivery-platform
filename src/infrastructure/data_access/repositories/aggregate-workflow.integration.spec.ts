import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { Role } from 'src/application/constants/constants';
import { CompanyMapper } from 'src/company/company.mapper';
import { CompanyService } from 'src/company/company.service';
import { Result } from 'src/domain/result/result';
import { MenuItemMapper } from 'src/menu-item/menu-item.mapper';
import { MenuMapper } from 'src/menu/menu.mapper';
import { RestaurantReviewMapper } from 'src/restaurant-review/restaurant-review.mapper';
import { RestaurantMapper } from 'src/restaurant/restaurant.mapper';
import { RestaurantService } from 'src/restaurant/restaurant.service';
import { UserStatus } from 'src/user/constants/constants';
import { UserMapper } from 'src/user/user.mapper';
import { UserService } from 'src/user/user.service';
import { CompanyRepository } from './company.repository';
import { RestaurantRepository } from './restaurant.repository';
import { MenuItemDataModel, MenuItemSchema } from './schemas/menu-item.schema';
import { MenuDataModel, MenuSchema } from './schemas/menu.schema';
import {
  RestaurantReviewDataModel,
  RestaurantReviewSchema,
} from './schemas/restaurant-review.schema';
import { CompanyDataModel, CompanySchema } from './schemas/company.schema';
import {
  RestaurantDataModel,
  RestaurantSchema,
} from './schemas/restaurant.schema';
import { UserDataModel, UserSchema } from './schemas/user.schema';
import { UserRepository } from './user.repository';
import {
  DeleteFileLocally,
  SaveFileLocally,
} from 'src/application/saveFileLocally';

jest.mock('src/application/saveFileLocally', () => ({
  SaveFileLocally: jest.fn((_file, folder) =>
    Promise.resolve(`${folder}/deterministic.png`),
  ),
  DeleteFileLocally: jest.fn(() => Promise.resolve()),
}));

const mongoUri = process.env.MONGODB_TEST_URI;
const saveFile = jest.mocked(SaveFileLocally);
const deleteFile = jest.mocked(DeleteFileLocally);
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo(
  'Aggregate company and restaurant workflows (MongoDB)',
  () => {
    let connection: Connection;
    let users: Model<UserDataModel>;
    let companies: Model<CompanyDataModel>;
    let restaurants: Model<RestaurantDataModel>;
    let userRepository: UserRepository;
    let companyRepository: CompanyRepository;
    let restaurantRepository: RestaurantRepository;
    let userService: UserService;
    let companyService: CompanyService;
    let restaurantService: RestaurantService;
    let contextUserId: string | undefined;
    let emails: string[];
    let revocations: string[];

    const address = { city: 'Addis Ababa', subCity: 'Bole' };
    const file = { originalname: 'image.png' } as Express.Multer.File;
    const admin = (email = `${randomUUID()}@example.com`) => ({
      name: 'Aggregate Administrator',
      email,
      phoneNumber: '251911111111',
      savedAddress: address,
    });
    const companyInput = () => ({
      name: `Company ${randomUUID()}`,
      phoneNumber: `2519${Math.floor(10000000 + Math.random() * 89999999)}`,
      savedAddress: address,
      companyAdminData: admin(),
    });
    const restaurantInput = () => ({
      name: `Restaurant ${randomUUID()}`,
      phoneNumber: '251922222222',
      savedAddress: address,
      openingHours: '08:00',
      closingHours: '20:00',
      description: 'Transactional restaurant',
      deliveryPersonAvailability: false,
      restaurantAdminData: admin(),
    });

    beforeAll(async () => {
      connection = await createConnection(mongoUri!, {
        dbName: `aggregate_workflows_${randomUUID().replaceAll('-', '')}`,
      }).asPromise();
      users = connection.model(UserDataModel.name, UserSchema);
      companies = connection.model(CompanyDataModel.name, CompanySchema);
      restaurants = connection.model(
        RestaurantDataModel.name,
        RestaurantSchema,
      );
      connection.model(RestaurantReviewDataModel.name, RestaurantReviewSchema);
      connection.model(MenuDataModel.name, MenuSchema);
      connection.model(MenuItemDataModel.name, MenuItemSchema);
      await Promise.all([
        users.syncIndexes(),
        companies.syncIndexes(),
        restaurants.syncIndexes(),
      ]);
    });

    beforeEach(() => {
      saveFile.mockClear();
      deleteFile.mockClear();
      contextUserId = undefined;
      emails = [];
      revocations = [];
      const auditMapper = new AuditMapper();
      const userMapper = new UserMapper(auditMapper);
      const companyMapper = new CompanyMapper(auditMapper, userMapper);
      const restaurantMapper = new RestaurantMapper(
        auditMapper,
        new RestaurantReviewMapper(auditMapper, userMapper),
        new MenuMapper(auditMapper, new MenuItemMapper(auditMapper)),
        userMapper,
        companyMapper,
      );
      const contextService = {
        getContext: () => ({
          email: 'system@example.com',
          userId: contextUserId,
        }),
      };
      userRepository = new UserRepository(
        users as never,
        connection,
        userMapper,
      );
      companyRepository = new CompanyRepository(
        companies as never,
        connection,
        companyMapper,
      );
      restaurantRepository = new RestaurantRepository(
        restaurants as never,
        connection,
        restaurantMapper,
      );
      const config = {
        JWT_VERIFICATION_TOKEN_SECRET:
          'aggregate-workflow-secret-at-least-32-chars',
        JWT_VERIFICATION_TOKEN_EXPIRATION_TIME: '15m',
        JWT_ACCESS_TOKEN_SECRET: 'aggregate-access-secret',
        JWT_ACCESS_TOKEN_EXPIRATION_TIME: '15m',
        JWT_REFRESH_TOKEN_SECRET: 'aggregate-refresh-secret',
        JWT_REFRESH_TOKEN_EXPIRATION_TIME: '1d',
      };
      userService = new UserService(
        new JwtService(),
        { get: (key: keyof typeof config) => config[key] } as ConfigService,
        {
          sendRegistrationCompletionEmail: ({ email }: { email: string }) => {
            emails.push(email);
            return Promise.resolve(Result.ok(undefined));
          },
        } as never,
        userMapper,
        contextService as never,
        userRepository,
        { publish: (id: string) => revocations.push(id) } as never,
      );
      companyService = new CompanyService(
        contextService as never,
        userService,
        companyRepository,
        companyMapper,
      );
      restaurantService = new RestaurantService(
        contextService as never,
        userService,
        restaurantRepository,
        companyService,
        restaurantMapper,
      );
    });

    afterEach(async () => {
      jest.restoreAllMocks();
      await Promise.all([
        users.deleteMany({}),
        companies.deleteMany({}),
        restaurants.deleteMany({}),
      ]);
    });

    afterAll(async () => {
      try {
        await connection.dropDatabase();
      } finally {
        await connection.close();
      }
    });

    async function seedCompany(refreshTokenHash = 'known-refresh') {
      const ownerId = new Types.ObjectId();
      await users.create({
        _id: ownerId,
        ...admin(`owner-${randomUUID()}@example.com`),
        passwordHash: 'hash',
        refreshTokenHash,
        role: Role.BUSINESS_ADMINISTRATOR,
        status: UserStatus.ACTIVE,
        auditCreatedBy: 'seed@example.com',
        auditCreatedDateTime: new Date().toISOString(),
      });
      const companyId = new Types.ObjectId();
      await companies.create({
        _id: companyId,
        logo: 'logo',
        name: 'Seed Company',
        phoneNumber: randomUUID(),
        ownerId,
        savedAddress: address,
        auditCreatedBy: 'seed@example.com',
        auditCreatedDateTime: new Date().toISOString(),
      });
      contextUserId = ownerId.toString();
      return { ownerId, companyId };
    }

    async function seedRestaurant() {
      const seeded = await seedCompany();
      const restaurantAdminId = new Types.ObjectId();
      await users.create({
        _id: restaurantAdminId,
        ...admin(`restaurant-owner-${randomUUID()}@example.com`),
        passwordHash: 'hash',
        refreshTokenHash: 'restaurant-refresh',
        role: Role.RESTAURANT_ADMINISTRATOR,
        status: UserStatus.ACTIVE,
        auditCreatedBy: 'seed@example.com',
        auditCreatedDateTime: new Date().toISOString(),
      });
      const restaurantId = new Types.ObjectId();
      await restaurants.create({
        _id: restaurantId,
        name: 'Seed Restaurant',
        phoneNumber: randomUUID(),
        savedAddress: address,
        companyId: seeded.companyId,
        deliveryPersonAvailability: false,
        restaurantAdminId,
        status: 'ACTIVE',
        openingHours: '08:00',
        closingHours: '20:00',
        image: 'image',
        logo: 'logo',
        menus: [],
        reviews: [],
        auditCreatedBy: 'seed@example.com',
        auditCreatedDateTime: new Date().toISOString(),
      });
      return { ...seeded, restaurantAdminId, restaurantId };
    }

    it('rolls back company creation after the real parent insert', async () => {
      const input = companyInput();
      const realCreate =
        companyRepository.createCompany.bind(companyRepository);
      jest
        .spyOn(companyRepository, 'createCompany')
        .mockImplementation(async (...args) => {
          await realCreate(...args);
          return Result.fail('controlled parent failure', 500);
        });

      await expect(
        companyService.createCompany(input, file),
      ).rejects.toBeDefined();

      expect(await companies.countDocuments()).toBe(0);
      expect(
        await users.findOne({ email: input.companyAdminData.email }),
      ).toBeNull();
      expect(emails).toHaveLength(0);
      expect(deleteFile).toHaveBeenCalledWith(
        'company-logos/deterministic.png',
      );
    });

    it('rolls back restaurant creation after the real parent insert', async () => {
      await seedCompany();
      const input = restaurantInput();
      const realCreate =
        restaurantRepository.createRestaurant.bind(restaurantRepository);
      jest
        .spyOn(restaurantRepository, 'createRestaurant')
        .mockImplementation(async (...args) => {
          await realCreate(...args);
          return Result.fail('controlled parent failure', 500);
        });

      await expect(
        restaurantService.createRestaurant(input, file, file),
      ).rejects.toBeDefined();

      expect(await restaurants.countDocuments()).toBe(0);
      expect(
        await users.findOne({ email: input.restaurantAdminData.email }),
      ).toBeNull();
      expect(emails).toHaveLength(0);
      expect(deleteFile).toHaveBeenCalledWith(
        'restaurant-logos/deterministic.png',
      );
      expect(deleteFile).toHaveBeenCalledWith(
        'restaurant-covers/deterministic.png',
      );
    });

    it('rolls back the complete company administrator replacement', async () => {
      const { ownerId, companyId } = await seedCompany();
      const replacement = admin();
      const realUpdate =
        companyRepository.updateCompany.bind(companyRepository);
      jest
        .spyOn(companyRepository, 'updateCompany')
        .mockImplementation(async (...args) => {
          await realUpdate(...args);
          return Result.fail('controlled parent failure', 500);
        });

      await expect(
        companyService.changeCompanyAdmin(companyId, replacement),
      ).rejects.toBeDefined();

      const oldAdmin = await users.findById(ownerId).lean();
      expect(oldAdmin?.status).toBe(UserStatus.ACTIVE);
      expect(oldAdmin?.refreshTokenHash).toBe('known-refresh');
      expect((await companies.findById(companyId).lean())?.ownerId).toEqual(
        ownerId,
      );
      expect(await users.findOne({ email: replacement.email })).toBeNull();
      expect(emails).toHaveLength(0);
      expect(revocations).toHaveLength(0);
    });

    it('rolls back the complete restaurant administrator replacement', async () => {
      const { restaurantAdminId, restaurantId } = await seedRestaurant();
      const replacement = admin();
      const realUpdate =
        restaurantRepository.updateRestaurant.bind(restaurantRepository);
      jest
        .spyOn(restaurantRepository, 'updateRestaurant')
        .mockImplementation(async (...args) => {
          await realUpdate(...args);
          return Result.fail('controlled parent failure', 500);
        });

      await expect(
        restaurantService.changeRestaurantAdmin(restaurantId, replacement),
      ).rejects.toBeDefined();

      const oldAdmin = await users.findById(restaurantAdminId).lean();
      expect(oldAdmin?.status).toBe(UserStatus.ACTIVE);
      expect(oldAdmin?.refreshTokenHash).toBe('restaurant-refresh');
      expect(
        (await restaurants.findById(restaurantId).lean())?.restaurantAdminId,
      ).toEqual(restaurantAdminId);
      expect(await users.findOne({ email: replacement.email })).toBeNull();
      expect(emails).toHaveLength(0);
      expect(revocations).toHaveLength(0);
    });

    it('commits company creation before sending its one registration email', async () => {
      const input = companyInput();
      let committedWhenEmailed = false;
      jest
        .spyOn(userService, 'sendAdminRegistrationEmail')
        .mockImplementation(async (created) => {
          committedWhenEmailed =
            (await users.exists({ _id: created.id })) !== null &&
            (await companies.exists({ ownerId: created.id })) !== null;
          emails.push(created.email);
        });

      await companyService.createCompany(input, file);

      const persisted = await users
        .findOne({ email: input.companyAdminData.email })
        .lean();
      expect(persisted?.accountActions?.ADMIN_REGISTRATION).toBeDefined();
      expect(committedWhenEmailed).toBe(true);
      expect(emails).toEqual([input.companyAdminData.email]);
    });

    it('retains the committed company logo when registration email fails', async () => {
      const input = companyInput();
      const unexpected = new Error('email unavailable');
      jest
        .spyOn(userService, 'sendAdminRegistrationEmail')
        .mockRejectedValue(unexpected);

      await expect(companyService.createCompany(input, file)).rejects.toBe(
        unexpected,
      );

      const persistedAdmin = await users.findOne({
        email: input.companyAdminData.email,
      });
      expect(persistedAdmin).not.toBeNull();
      expect(await companies.exists({ ownerId: persistedAdmin!._id })).not.toBe(
        null,
      );
      expect(deleteFile).not.toHaveBeenCalledWith(
        'company-logos/deterministic.png',
      );
    });

    it('commits restaurant replacement before publishing and emailing exactly once', async () => {
      const { restaurantAdminId, restaurantId } = await seedRestaurant();
      const replacement = admin();
      let committedAtRevocation = false;
      jest
        .spyOn(userService, 'publishAccessRevocation')
        .mockImplementation((id) => {
          committedAtRevocation = id.equals(restaurantAdminId);
          revocations.push(id.toString());
        });

      await restaurantService.changeRestaurantAdmin(restaurantId, replacement);

      const oldAdmin = await users.findById(restaurantAdminId).lean();
      const newAdmin = await users.findOne({ email: replacement.email }).lean();
      expect(oldAdmin?.status).toBe(UserStatus.SUSPENDED);
      expect(oldAdmin?.refreshTokenHash).toBeNull();
      expect(
        (await restaurants.findById(restaurantId).lean())?.restaurantAdminId,
      ).toEqual(newAdmin?._id);
      expect(newAdmin?.accountActions?.ADMIN_REGISTRATION).toBeDefined();
      expect(committedAtRevocation).toBe(true);
      expect(revocations).toEqual([restaurantAdminId.toString()]);
      expect(emails).toEqual([replacement.email]);
    });
  },
);
