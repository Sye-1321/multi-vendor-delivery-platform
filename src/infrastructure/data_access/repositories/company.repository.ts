import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model, Types } from 'mongoose';
import { Company } from 'src/company/company';
import { CompanyMapper } from 'src/company/company.mapper';
import { CompanyDataModel } from './schemas/company.schema';
import { CompanyDocument } from './schemas/company.schema';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { Result } from 'src/domain/result/result';

@Injectable()
export class CompanyRepository extends GenericDocumentRepository<Company, CompanyDocument> {
  constructor(
    @InjectModel(CompanyDataModel.name) private readonly companyModel: Model<CompanyDocument>,
    @InjectConnection() readonly connection: Connection,
    @Inject(CompanyMapper) private readonly companyMapper: CompanyMapper,
  ) {
    super(companyModel, connection, companyMapper);
  }

  async createCompany(companyModel: CompanyDataModel): Promise<Result<Company>> {
    const created = await this.DocumentModel.create(companyModel);
    if (!created) {
      return Result.fail('Failed to create company', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const company: Company = this.companyMapper.toDomain(created);
    return Result.ok(company);
  }

  async getCompanyById(companyId: Types.ObjectId): Promise<Result<Company>> {
    const companyDocument = await this.DocumentModel.findById(companyId).populate('owner');
    if (!companyDocument) {
      return Result.fail(`Company with id ${companyId} does not exist`, HttpStatus.NOT_FOUND);
    }
    const company: Company = this.companyMapper.toDomain(companyDocument);
    return Result.ok(company);
  }

  async getCompanyByOwner(ownerId: Types.ObjectId): Promise<Result<Company>> {
    const companyDocument = await this.DocumentModel.findOne({ ownerId: ownerId }).populate('owner');
    if (!companyDocument) {
      return Result.fail(`Company with owner id ${ownerId} does not exist`, HttpStatus.NOT_FOUND);
    }
    const company: Company = this.companyMapper.toDomain(companyDocument);
    return Result.ok(company);
  }

  async updateCompany(companyId: Types.ObjectId, updateData: any): Promise<Result<Company>> {
    const updatedDocument = await this.DocumentModel.findByIdAndUpdate(
      companyId,
      { $set: updateData },
      { new: true }
    ).exec();
    if (!updatedDocument) {
      return Result.fail('Error while updating company', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const updatedCompany = this.companyMapper.toDomain(updatedDocument);
    return Result.ok(updatedCompany);
  }

  async getCompanies(filterQuery: FilterQuery<Company>): Promise<Result<Company[]>> {
    const companyDocs = await this.DocumentModel.find(filterQuery);
    if (!companyDocs) {
      return Result.fail('Error fetching companies from database', HttpStatus.NOT_FOUND);
    }
    const companies: Company[] = companyDocs?.length
      ? companyDocs.map((document) => this.companyMapper.toDomain(document))
      : [];
    return Result.ok(companies);
  }
}
