import { Types } from "mongoose";
import { ISavedAddress } from "src/company/interfaces/company.interface";

export interface ICompanyData {
    readonly logo: string;
    readonly name: string;
    readonly phoneNumber: string;
    readonly ownerId: Types.ObjectId;
    readonly savedAddress: ISavedAddress;
 }
  