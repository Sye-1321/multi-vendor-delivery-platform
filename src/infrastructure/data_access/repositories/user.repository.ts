import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model, Types } from 'mongoose';
import { User } from 'src/user/user';
import { UserMapper } from '../../../user/user.mapper';
import { UserDocument, UserDataModel } from './schemas/user.schema';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { IUserRepository } from './interfaces/user-repository.interface';
import { Result } from 'src/domain/result/result';

@Injectable()
export class UserRepository
  extends GenericDocumentRepository<User, UserDocument>
  implements IUserRepository
{
  constructor(
    @InjectModel(UserDataModel.name)
    private readonly userModel: Model<UserDocument>,
    @InjectConnection() connection: Connection,
    private readonly userMapper: UserMapper,
  ) {
    super(userModel, connection, userMapper);
  }

  async createUser(userModel: UserDataModel): Promise<Result<User>> {
    const createdUser = await this.userModel.create(userModel);
    if (!createdUser) {
      return Result.fail(
        'Error while creating user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const user: User = this.userMapper.toDomain(createdUser);
    return Result.ok(user);
  }

  async findByEmail(email: string): Promise<Result<User>> {
    const userDocument = await this.DocumentModel.findOne({ email });
    if (!userDocument) {
      return Result.fail(
        'Error while creating user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const user: User = this.userMapper.toDomain(userDocument);
    return Result.ok(user);
  }

  async getUserById(id: Types.ObjectId): Promise<Result<User>> {
    const userDocument = await this.DocumentModel.findById(id);
    if (!userDocument) {
      return Result.fail(
        'Error getting user document from database',
        HttpStatus.NOT_FOUND,
      );
    }
    const user: User = this.userMapper.toDomain(userDocument);
    return Result.ok(user);
  }

  async updateUser(filter: any, updateData: any): Promise<Result<User>> {
    const updatedUserDocument = await this.DocumentModel.findOneAndUpdate(
      filter,
      updateData,
      { new: true },
    );
    if (!updatedUserDocument) {
      return Result.fail(
        'Error while updating user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const user: User = this.userMapper.toDomain(updatedUserDocument);
    return Result.ok(user);
  }

  async getUsers(filterQuery: FilterQuery<User>): Promise<Result<User[]>> {
    const userDocs = await this.DocumentModel.find(filterQuery);
    if (!userDocs) {
      return Result.fail(
        'Error getting document from database',
        HttpStatus.NOT_FOUND,
      );
    }
    const users: User[] = userDocs?.length
      ? userDocs.map((document) => this.userMapper.toDomain(document))
      : [];
    return Result.ok(users);
  }
}
