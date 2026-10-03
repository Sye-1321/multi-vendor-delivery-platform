import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { UserDataModel } from './user.schema';
import { Type } from 'class-transformer';
import { BaseDocument } from 'src/infrastructure/database/mongoDB/base-document';
import { ICompanyData } from '../models/company-model.interface';

export type CompanyDocument = CompanyDataModel & Document;

@Schema({ versionKey: false })
export class CompanyDataModel extends BaseDocument implements ICompanyData {
  @Prop({ type: String, required: true })
  logo: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  phoneNumber: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UserDataModel.name,
    required: true,
  })
  ownerId: Types.ObjectId;

  @Type(() => UserDataModel)
  ownerDetails?: UserDataModel;

  @Prop({
    type: {
      city: { type: String, required: true },
      subCity: { type: String, required: true },
    },
    required: true,
  })
  savedAddress: {
    city: string;
    subCity: string;
  };
}

export const CompanySchema = SchemaFactory.createForClass(CompanyDataModel);

CompanySchema.virtual('ownerDetails', {
  ref: UserDataModel.name,
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true,
});
