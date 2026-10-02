import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IUserData } from '../models/user-model.interface';
import { UserStatus } from 'src/user/constants/constants';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';
import { Role } from 'src/application/constants/constants';
import {
  IAccountActionsData,
  IAccountActionStateData,
} from '../models/user-model.interface';

@Schema({ _id: false })
export class AccountActionStateDataModel implements IAccountActionStateData {
  @Prop({ type: String, required: true })
  tokenHash: string;

  @Prop({ type: String })
  email?: string;
}

const AccountActionStateSchema = SchemaFactory.createForClass(
  AccountActionStateDataModel,
);

@Schema({ _id: false })
export class AccountActionsDataModel implements IAccountActionsData {
  @Prop({ type: AccountActionStateSchema })
  EMAIL_VERIFICATION?: AccountActionStateDataModel;

  @Prop({ type: AccountActionStateSchema })
  PASSWORD_RESET?: AccountActionStateDataModel;

  @Prop({ type: AccountActionStateSchema })
  EMAIL_CHANGE?: AccountActionStateDataModel;
}

const AccountActionsSchema = SchemaFactory.createForClass(
  AccountActionsDataModel,
);

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

  @Prop({
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Prop({ type: String })
  refreshTokenHash: string;

  @Prop({ type: AccountActionsSchema, default: () => ({}) })
  accountActions?: IUserData['accountActions'];

  @Prop({ type: Object, default: { city: '', subCity: '' } })
  savedAddress: { city: string; subCity: string };
}

export const UserSchema = SchemaFactory.createForClass(UserDataModel);
