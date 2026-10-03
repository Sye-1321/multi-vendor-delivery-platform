import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, FilterQuery, Model, Types } from 'mongoose';
import { Company } from 'src/company/company';
import { CompanyMapper } from 'src/company/company.mapper';
import { CompanyDataModel } from './schemas/company.schema';
import { CompanyDocument } from './schemas/company.schema';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { Result } from 'src/domain/result/result';

@Injectable()
export class CompanyRepository extends GenericDocumentRepository<
  Company,
  CompanyDocument
> {
  constructor(
    @InjectModel(CompanyDataModel.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectConnection() readonly connection: Connection,
    @Inject(CompanyMapper) private readonly companyMapper: CompanyMapper,
  ) {
    super(companyModel, connection, companyMapper);
  }

  async createCompany(
    companyModel: CompanyDataModel,
    options?: { session?: ClientSession },
  ): Promise<Result<Company>> {
    const created = options?.session
      ? (await this.DocumentModel.create([companyModel], options))[0]
      : await this.DocumentModel.create(companyModel);
    if (!created) {
      return Result.fail(
        'Failed to create company',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const populated = await created.populate({
      path: 'ownerDetails',
      options: { session: options?.session },
    });
    const company: Company = this.companyMapper.toDomain(populated);
    return Result.ok(company);
  }

  async getCompanyById(companyId: Types.ObjectId): Promise<Result<Company>> {
    const companyDocument =
      await this.DocumentModel.findById(companyId).populate('ownerDetails');
    if (!companyDocument) {
      return Result.fail(
        `Company with id ${companyId} does not exist`,
        HttpStatus.NOT_FOUND,
      );
    }
    const company: Company = this.companyMapper.toDomain(companyDocument);
    return Result.ok(company);
  }

  async getCompanyByOwner(ownerId: Types.ObjectId): Promise<Result<Company>> {
    const companyDocument = await this.DocumentModel.findOne({
      ownerId: ownerId,
    }).populate('ownerDetails');
    if (!companyDocument) {
      return Result.fail(
        `Company with owner id ${ownerId} does not exist`,
        HttpStatus.NOT_FOUND,
      );
    }
    const company: Company = this.companyMapper.toDomain(companyDocument);
    return Result.ok(company);
  }

  async updateCompany(
    companyId: Types.ObjectId,
    updateData: any,
    options?: { session?: ClientSession },
  ): Promise<Result<Company>> {
    const updatedDocument = await this.DocumentModel.findByIdAndUpdate(
      companyId,
      { $set: updateData },
      { new: true, session: options?.session },
    )
      .populate('ownerDetails')
      .exec();
    if (!updatedDocument) {
      return Result.fail(
        'Error while updating company',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const updatedCompany = this.companyMapper.toDomain(updatedDocument);
    return Result.ok(updatedCompany);
  }

  async getCompanies(
    filterQuery: FilterQuery<Company>,
  ): Promise<Result<Company[]>> {
    const companyDocs =
      await this.DocumentModel.find(filterQuery).populate('ownerDetails');
    if (!companyDocs) {
      return Result.fail(
        'Error fetching companies from database',
        HttpStatus.NOT_FOUND,
      );
    }
    const companies: Company[] = companyDocs?.length
      ? companyDocs.map((document) => this.companyMapper.toDomain(document))
      : [];
    return Result.ok(companies);
  }
}
