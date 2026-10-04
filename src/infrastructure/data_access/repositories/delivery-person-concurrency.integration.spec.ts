import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model, Types } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import {
  AvailabilityStatus,
  DeliveryPersonOwnership,
  DeliveryPersonStatus,
} from 'src/delivery-person/constants/constants';
import { DeliveryPersonMapper } from 'src/delivery-person/delivery-person.mapper';
import { DeliveryPersonService } from 'src/delivery-person/delivery-person.service';
import {
  DeliveryPersonDataModel,
  DeliveryPersonSchema,
} from './schemas/delivery-person.schema';
import { DeliveryPersonRepository } from './deliveryperson.repository';

const mongoUri = process.env.MONGODB_TEST_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;

describeWithMongo('Delivery person profile concurrency (MongoDB)', () => {
  let connection: Connection;
  let deliveryPeople: Model<DeliveryPersonDataModel>;
  let repository: DeliveryPersonRepository;
  let service: DeliveryPersonService;

  beforeAll(async () => {
    connection = await createConnection(mongoUri!, {
      dbName: `delivery_person_concurrency_${randomUUID().replaceAll('-', '')}`,
    }).asPromise();
    deliveryPeople = connection.model(
      DeliveryPersonDataModel.name,
      DeliveryPersonSchema,
    );
    await deliveryPeople.syncIndexes();
  });

  beforeEach(() => {
    const mapper = new DeliveryPersonMapper(new AuditMapper());
    repository = new DeliveryPersonRepository(
      deliveryPeople as never,
      connection,
      mapper,
    );
    service = new DeliveryPersonService(
      {
        getContext: () => ({ email: 'profile-editor@example.com' }),
      } as never,
      repository,
      {} as never,
      mapper,
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await deliveryPeople.deleteMany({});
  });

  afterAll(async () => {
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  it('preserves an assignment that occurs after the profile read', async () => {
    const courierId = new Types.ObjectId();
    await deliveryPeople.create({
      _id: courierId,
      profileImage: 'delivery-person-profiles/original.png',
      name: 'Original Courier',
      phoneNumber: '251911111111',
      savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      status: DeliveryPersonStatus.ACTIVE,
      deliveryType: DeliveryPersonOwnership.SYSTEM,
      restaurantId: null,
      auditCreatedBy: 'seed@example.com',
      auditCreatedDateTime: '2026-01-01T00:00:00.000Z',
    });

    const realUpdateProfile = repository.updateProfile.bind(repository);
    jest
      .spyOn(repository, 'updateProfile')
      .mockImplementation(async (...args) => {
        const assignment = await repository.changeAvailability(
          courierId,
          AvailabilityStatus.AVAILABLE,
          AvailabilityStatus.WORKING,
          {
            auditModifiedBy: 'assignment@example.com',
            auditModifiedDateTime: '2026-02-01T00:00:00.000Z',
          },
        );
        expect(assignment.isSuccess).toBe(true);
        return realUpdateProfile(...args);
      });

    const result = await service.updateSystemWideDeliveryPerson(courierId, {
      name: 'Updated Courier',
    });

    expect(result.isSuccess).toBe(true);
    const final = await deliveryPeople.findById(courierId).lean().exec();
    expect(final).toMatchObject({
      name: 'Updated Courier',
      availabilityStatus: AvailabilityStatus.WORKING,
      status: DeliveryPersonStatus.ACTIVE,
      deliveryType: DeliveryPersonOwnership.SYSTEM,
      restaurantId: null,
      auditModifiedBy: 'profile-editor@example.com',
    });
    expect(final?.auditModifiedDateTime).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(final!.auditModifiedDateTime!))).toBe(false);
  });
});
