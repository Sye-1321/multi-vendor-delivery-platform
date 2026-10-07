import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { Company } from 'src/company/company';
import { Audit } from 'src/domain/audit/audit';
import { RestaurantReview } from 'src/restaurant-review/restaurant-review';
import { RestaurantStatus } from 'src/restaurant/constants/constants';
import { RestaurantParser } from 'src/restaurant/restaurant.parser';
import { Restaurant } from 'src/restaurant/restaurant';
import { SystemReviewParser } from 'src/system-review/system-review.parser';
import { SystemReview } from 'src/system-review/system-review';
import { UserStatus } from './constants/constants';
import { UserParser } from './user.parser';
import { User } from './user';

describe('Public user responses', () => {
  const audit = Audit.create({
    auditCreatedBy: 'private-auditor@example.com',
    auditCreatedDateTime: '2026-01-01T00:00:00.000Z',
    auditModifiedBy: 'private-modifier@example.com',
    auditModifiedDateTime: '2026-01-02T00:00:00.000Z',
  }).getValue();

  const user = User.create(
    {
      name: 'Public Name',
      email: 'private-author@example.com',
      phoneNumber: '+251900000000',
      passwordHash: 'private-password-hash',
      refreshTokenHash: 'private-refresh-token-hash',
      role: Role.END_USER,
      status: UserStatus.ACTIVE,
      savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
      audit,
    },
    new Types.ObjectId(),
  ).getValue();

  it('projects public restaurant administrators and review authors', () => {
    const review = RestaurantReview.create(
      {
        userId: user.id,
        user,
        restaurantId: new Types.ObjectId(),
        rating: 5,
        reviewText: 'Excellent',
        audit,
      },
      new Types.ObjectId(),
    ).getValue();
    const company = Company.create(
      {
        logo: 'company-logo',
        name: 'Company',
        phoneNumber: '+251911111111',
        ownerId: user.id,
        owner: user,
        savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
        audit,
      },
      new Types.ObjectId(),
    ).getValue();
    const restaurant = Restaurant.create(
      {
        name: 'Restaurant',
        image: 'restaurant-image',
        logo: 'restaurant-logo',
        phoneNumber: '+251922222222',
        deliveryPersonAvailability: true,
        status: RestaurantStatus.ACTIVE,
        openingHours: '08:00',
        closingHours: '22:00',
        savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
        companyId: company.id,
        company,
        restaurantAdminId: user.id,
        restaurantAdmin: user,
        reviews: [review],
        menus: [],
        audit,
      },
      review.restaurantId,
    ).getValue();

    const response =
      RestaurantParser.createPublicRestaurantResponse(restaurant);

    expect(response.restaurantAdmin).toEqual({ id: user.id, name: user.name });
    expect(response.reviews[0].user).toEqual({ id: user.id, name: user.name });
  });

  it('projects public system-review authors', () => {
    const review = SystemReview.create(
      {
        userId: user.id,
        user,
        rating: 4,
        reviewText: 'Useful platform',
        audit,
      },
      new Types.ObjectId(),
    ).getValue();

    const response =
      SystemReviewParser.createPublicSystemReviewResponse(review);

    expect(response.user).toEqual({ id: user.id, name: user.name });
  });

  it('preserves the rich account response', () => {
    expect(UserParser.createUserResponse(user)).toMatchObject({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      savedAddress: user.savedAddress,
      auditCreatedBy: audit.auditCreatedBy,
      auditCreatedDateTime: audit.auditCreatedDateTime,
    });
  });
});
