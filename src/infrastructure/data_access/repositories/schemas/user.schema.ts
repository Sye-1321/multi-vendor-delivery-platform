import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IUserData } from '../models/user-model.interface';
import { UserStatus } from 'src/user/constants/constants';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';
import { Role } from 'src/application/constants/constants';

export type UserDocument = UserDataModel & Document;

@Schema({ versionKey: false })
export class UserDataModel extends BaseDocument implements IUserData {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  phoneNumber: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String, enum: Object.values(Role), required: true }) 
  role: Role;

  @Prop({ type: String, enum: Object.values(UserStatus), default: UserStatus.PENDING }) 
  status: UserStatus;

  @Prop({ type: String })
  refreshTokenHash: string;

  @Prop({ type: Object, default: { city: '', subCity: '' } }) 
  savedAddress: { city: string; subCity: string };
}

export const UserSchema = SchemaFactory.createForClass(UserDataModel);
