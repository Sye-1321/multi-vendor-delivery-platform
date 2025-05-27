import { Types } from 'mongoose';
import { Company } from 'src/company/company';
import { CompanyDataModel } from '../schemas/company.schema';
import { Result } from 'src/domain/result/result';
import { IGenericDocument } from 'src/infrastructure/database/mongoDB/generic-document.interface';

export interface ICompanyRepository extends IGenericDocument<Company, CompanyDataModel> {
  createCompany(companyModel: CompanyDataModel): Promise<Result<Company>>;
  getCompanyById(companyId: Types.ObjectId): Promise<Result<Company>>;
  getCompanyByOwner(ownerId: Types.ObjectId): Promise<Result<Company>>;
  updateCompany(companyId: Types.ObjectId, updateData: any): Promise<Result<Company>>;
  getCompanies(filterQuery: any): Promise<Result<Company[]>>;
}
