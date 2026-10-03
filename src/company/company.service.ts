import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { Types, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { TYPES } from '../application/constants/types';
import { Result } from '../domain/result/result';
import { throwApplicationError } from '../infrastructure/utilities/exception-instance';
import { ICompanyResponse } from './interfaces/company-response.interface';
import { Context } from '../infrastructure/context/context';
import { CompanyParser } from './company.parser';
import { Company } from './company';
import { IUserService } from 'src/user/interfaces/user-service.interface';
import { ICompanyService } from './interfaces/company-service.interface';
import { CompanyMapper } from './company.mapper';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { ICompanyRepository } from 'src/infrastructure/data_access/repositories/interfaces/company-repository.interface';
import {
  CompanyAdminDTO,
  CreateCompanyDTO,
  UpdateCompanyDTO,
} from './dtos/company.dto';
import { Role } from 'src/application/constants/constants';
import { User } from 'src/user/user';
import {
  IUpdateCompany,
  IUpdateCompanyAdmin,
} from './interfaces/company.interface';
import { Audit } from 'src/domain/audit/audit';
import { SaveFileLocally } from 'src/application/saveFileLocally';

@Injectable()
export class CompanyService implements ICompanyService {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    @Inject(TYPES.IUserService) private readonly userService: IUserService,
    @Inject(TYPES.ICompanyRepository)
    private readonly companyRepository: ICompanyRepository,
    @InjectConnection() private readonly connection: Connection,
    private readonly companyMapper: CompanyMapper,
  ) {}

  private get context(): Context {
    return this.contextService.getContext();
  }

  async createCompany(
    { name, phoneNumber, savedAddress, companyAdminData }: CreateCompanyDTO,
    logoFile: Express.Multer.File,
  ): Promise<Result<ICompanyResponse>> {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const existingCompany = await this.companyRepository.getCompanies({});
      if (
        existingCompany
          .getValue()
          .some((company) => company.phoneNumber === phoneNumber)
      ) {
        throwApplicationError(
          HttpStatus.CONFLICT,
          `Company with phone number ${phoneNumber} already exists`,
        );
      }

      const logo = await SaveFileLocally(logoFile, 'company-logos');
      const audit: Audit = Audit.createInsertContext(this.context);

      const companyAdmin = await this.userService.createAdmin(
        companyAdminData,
        Role.BUSINESS_ADMINISTRATOR,
      );

      const company = Company.create(
        {
          logo,
          name,
          phoneNumber,
          ownerId: companyAdmin.id,
          audit,
          owner: companyAdmin,
          savedAddress,
        },
        new Types.ObjectId(),
      ).getValue();

      const companyModel = this.companyMapper.toPersistence(company);
      const companyDocument =
        await this.companyRepository.createCompany(companyModel);

      if (!companyDocument.isSuccess) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Company could not be created',
        );
      }

      await session.commitTransaction();

      const newCompany = companyDocument.getValue();
      const response = await this.companyRepository.getCompanyById(
        newCompany.id,
      );

      return Result.ok(
        CompanyParser.createCompanyResponse(response.getValue()),
        'Company created successfully',
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getCompanies(): Promise<Result<ICompanyResponse[]>> {
    const companies = await this.companyRepository.getCompanies({});
    if (!companies.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Could not retrieve companies',
      );
    }
    return Result.ok(
      CompanyParser.createCompaniesResponse(companies.getValue()),
      'Companies retrieved successfully',
    );
  }

  async getCompanyById(
    companyId: Types.ObjectId,
  ): Promise<Result<ICompanyResponse>> {
    const companyResult =
      await this.companyRepository.getCompanyById(companyId);
    if (!companyResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Company not found');
    }
    return Result.ok(
      CompanyParser.createCompanyResponse(companyResult.getValue()),
      'Company retrieved successfully',
    );
  }

  async changeCompanyAdmin(
    companyId: Types.ObjectId,
    companyAdminData: CompanyAdminDTO,
  ): Promise<Result<ICompanyResponse>> {
    const companyResult =
      await this.companyRepository.getCompanyById(companyId);
    if (!companyResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Company not found');
    }

    const ownerId = companyResult.getValue().owner.id;
    await this.userService.suspendUser(ownerId);

    const companyAdmin = await this.userService.createAdmin(
      companyAdminData,
      Role.BUSINESS_ADMINISTRATOR,
    );

    const data = {
      auditModifiedBy: this.context.email,
      auditModifiedDateTime: new Date().toISOString(),
      ownerId: companyAdmin.id,
    };

    await this.updateCompanyById(companyId, data);

    const updatedCompanyResult =
      await this.companyRepository.getCompanyById(companyId);
    if (!updatedCompanyResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Could not retrieve updated company',
      );
    }

    return Result.ok(
      CompanyParser.createCompanyResponse(updatedCompanyResult.getValue()),
      'Company admin changed successfully',
    );
  }

  async getMyCompany(): Promise<Result<ICompanyResponse>> {
    const companyAdmin: User = await this.userService.getContextUser();
    const companyResult = await this.companyRepository.getCompanyByOwner(
      companyAdmin.id,
    );
    return Result.ok(
      CompanyParser.createCompanyResponse(companyResult.getValue()),
      'Company retrieved successfully',
    );
  }

  async updateMyCompany(
    props: UpdateCompanyDTO,
    logoFile?: Express.Multer.File,
  ): Promise<Result<ICompanyResponse>> {
    const companyAdmin: User = await this.userService.getContextUser();
    const companyResult = await this.companyRepository.getCompanyByOwner(
      companyAdmin.id,
    );

    if (!companyResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Company not found');
    }

    const company = companyResult.getValue();
    const data: any = {
      auditModifiedBy: this.context.email,
      auditModifiedDateTime: new Date().toISOString(),
      ...props,
    };

    if (logoFile) {
      const logo = await SaveFileLocally(logoFile, 'company-logos');
      data.logo = logo;
    }

    this.updateCompanyData(data, company, this.context);

    if ((props as any).companyAdminData) {
      this.updateCompanyAdmin(
        (props as any).companyAdminData,
        company.owner,
        this.context,
      );
    }

    await this.updateCompanyById(company.id, data);

    const refreshedCompanyResult = await this.companyRepository.getCompanyById(
      company.id,
    );
    if (!refreshedCompanyResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to retrieve updated company',
      );
    }

    const refreshedCompany = refreshedCompanyResult.getValue();

    return Result.ok(
      CompanyParser.createCompanyResponse(refreshedCompany),
      'Company updated successfully',
    );
  }

  private updateCompanyData(
    data: IUpdateCompany,
    company: Company,
    context: Context,
  ) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in company) {
        (company as any)[key] = value;
      }
    });
    Audit.updateContext(context.email, company);
  }

  private async updateCompanyById(
    id: Types.ObjectId,
    data: any,
  ): Promise<Company> {
    const updatedCompanyResult = await this.companyRepository.updateCompany(
      id,
      data,
    );
    if (!updatedCompanyResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Company update failed',
      );
    }
    return updatedCompanyResult.getValue();
  }

  private updateCompanyAdmin(
    data: IUpdateCompanyAdmin,
    user: User,
    context: Context,
  ) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in user) {
        (user as any)[key] = value;
      }
    });
    Audit.updateContext(context.email, user);
  }

  async getCompanyByCompanyAdmin(ownerId: Types.ObjectId): Promise<Company> {
    const companyResult =
      await this.companyRepository.getCompanyByOwner(ownerId);
    if (!companyResult) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Company not found');
    }
    return companyResult.getValue();
  }
}
