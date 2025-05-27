import { Types } from 'mongoose';
import { Result } from 'src/domain/result/result';
import { ICompanyResponse } from '../interfaces/company-response.interface';
import { Company } from '../company';
import { CompanyAdminDTO, CreateCompanyDTO, UpdateCompanyDTO } from '../dtos/company.dto';

export interface ICompanyService {
  createCompany(dto: CreateCompanyDTO, logoFile: Express.Multer.File): Promise<Result<ICompanyResponse>>;
  getCompanies(): Promise<Result<ICompanyResponse[]>>;
  getCompanyById(companyId: Types.ObjectId): Promise<Result<ICompanyResponse>>;
  changeCompanyAdmin(companyId: Types.ObjectId, companyAdminData: CompanyAdminDTO): Promise<Result<ICompanyResponse>>;
  getMyCompany(): Promise<Result<ICompanyResponse>>;
  updateMyCompany(props: UpdateCompanyDTO, logoFile?: Express.Multer.File): Promise<Result<ICompanyResponse>>;
  getCompanyByCompanyAdmin(ownerId: Types.ObjectId): Promise<Company>;
}
