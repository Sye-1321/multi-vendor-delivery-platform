import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Restaurant } from 'src/restaurant/restaurant';
import { RestaurantMapper } from 'src/restaurant/restaurant.mapper';
import { RestaurantDataModel, RestaurantDocument } from './schemas/restaurant.schema';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { Result } from 'src/domain/result/result';
import { IRestaurantRepository } from './interfaces/restaurant-repository.interface';

@Injectable()
export class RestaurantRepository
  extends GenericDocumentRepository<Restaurant, RestaurantDocument> implements IRestaurantRepository
{
  constructor(
    @InjectModel(RestaurantDataModel.name) private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectConnection() readonly connection: Connection,
    @Inject(RestaurantMapper) 
    private readonly restaurantMapper: RestaurantMapper
  ) {
    super(restaurantModel, connection, restaurantMapper);
  }

  async getRestaurantByRestaurantAdmin(restaurantAdminId: Types.ObjectId): Promise<Result<Restaurant>> {
    const restaurantDocument = await this.restaurantModel
      .findOne({ restaurantAdminId: restaurantAdminId })
      .populate('menus')
      .populate('reviews')
      .populate('restaurantAdmin')
      .populate('company');
  
    if (!restaurantDocument) {
      return Result.fail('No restaurant found for the given restaurant admin', HttpStatus.NOT_FOUND);
    }
  
    const restaurant = this.restaurantMapper.toDomain(restaurantDocument);
    return Result.ok(restaurant);
  }
  
  async getRestaurantsByCompanyId(companyId: Types.ObjectId): Promise<Result<Restaurant[]>> {
    const restaurantDocuments = await this.restaurantModel
      .find({ companyId: companyId})
      .populate('menus')
      .populate('reviews')
      .populate('restaurantAdmin')
      .populate('company');
    if (!restaurantDocuments || restaurantDocuments.length === 0) {
      return Result.fail('No restaurants found for the given company admin', HttpStatus.NOT_FOUND);
    }
    const restaurants = restaurantDocuments.map((doc) => this.restaurantMapper.toDomain(doc));
    return Result.ok(restaurants);
  }
  
  async getRestaurantById(restaurantId: Types.ObjectId): Promise<Result<Restaurant>> {
    const restaurantDocument = await this.restaurantModel
      .findOne({ _id: restaurantId }) 
      .populate('menus')
      .populate('reviews')
      .populate('restaurantAdmin')
      .populate('company');
    if (!restaurantDocument) {
      return Result.fail('Restaurant not found', HttpStatus.NOT_FOUND);
    }
    const restaurant = this.restaurantMapper.toDomain(restaurantDocument);
    return Result.ok(restaurant);
  }
  
  async createRestaurant(restaurantDataModel: Partial<RestaurantDataModel>): Promise<Result<Restaurant>> {
    const created = await this.restaurantModel.create(restaurantDataModel);
  
    if (!created) {
      return Result.fail('Failed to create restaurant', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const restaurant = this.restaurantMapper.toDomain(created);
    return Result.ok(restaurant);
  }
  
  async updateRestaurant(restaurantId: Types.ObjectId, update: Partial<Restaurant>): Promise<Result<Restaurant>> {
    const updatedRestaurantDocument = await this.restaurantModel
      .findOneAndUpdate({ _id: restaurantId }, { $set: update }, { new: true })
      .populate('menus')
      .populate('reviews')
      .populate('restaurantAdmin')
      .populate('company');
  
    if (!updatedRestaurantDocument) {
      return Result.fail('Failed to update restaurant', HttpStatus.NOT_FOUND);
    }
    const restaurant = this.restaurantMapper.toDomain(updatedRestaurantDocument);
    return Result.ok(restaurant);
  }
  
  async getRestaurantsWithFilters(
    filter?: any,
    pagination?: { limit: number; skip: number }
  ): Promise<Result<Restaurant[]>> {
    const query = this.restaurantModel
      .find(filter || {})
      .populate('menus')
      .populate('reviews')
      .populate('restaurantAdmin')
      .populate('company');
  
    if (pagination) {
      query.limit(pagination.limit).skip(pagination.skip);
    }
  
    const restaurantDocs = await query.exec();
  
    if (!restaurantDocs || restaurantDocs.length === 0) {
      return Result.fail('No restaurants found with the given filters', HttpStatus.NOT_FOUND);
    }
    const restaurants = restaurantDocs.map((doc) => this.restaurantMapper.toDomain(doc));
    return Result.ok(restaurants);
  }
  
}
