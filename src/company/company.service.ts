import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';
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
import {
  DeleteFileLocally,
  SaveFileLocally,
} from 'src/application/saveFileLocally';

@Injectable()
export class CompanyService implements ICompanyService {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    @Inject(TYPES.IUserService) private readonly userService: IUserService,
    @Inject(TYPES.ICompanyRepository)
    private readonly companyRepository: ICompanyRepository,
    private readonly companyMapper: CompanyMapper,
  ) {}

  private get context(): Context {
    return this.contextService.getContext();
  }

  async createCompany(
    { name, phoneNumber, savedAddress, companyAdminData }: CreateCompanyDTO,
    logoFile: Express.Multer.File,
  ): Promise<Result<ICompanyResponse>> {
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
    let committed = false;
    let session: ClientSession | undefined;
    try {
      const audit: Audit = Audit.createInsertContext(this.context);
      session = await this.companyRepository.startSession();
      const transaction = await session.withTransaction(async () => {
        const registration = await this.userService.createAdminRegistration(
          companyAdminData,
          Role.BUSINESS_ADMINISTRATOR,
          { session },
        );
        const company = Company.create(
          {
            logo,
            name,
            phoneNumber,
            ownerId: registration.admin.id,
            audit,
            owner: registration.admin,
            savedAddress,
          },
          new Types.ObjectId(),
        ).getValue();
        const companyDocument = await this.companyRepository.createCompany(
          this.companyMapper.toPersistence(company),
          { session },
        );
        if (!companyDocument.isSuccess) {
          throwApplicationError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'Company could not be created',
          );
        }
        return { registration, companyId: companyDocument.getValue().id };
      });
      if (!transaction) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Company could not be created',
        );
      }
      committed = true;
      await this.userService.sendAdminRegistrationEmail(
        transaction.registration.admin,
        transaction.registration.token,
      );
      const response = await this.companyRepository.getCompanyById(
        transaction.companyId,
      );

      return Result.ok(
        CompanyParser.createCompanyResponse(response.getValue()),
        'Company created successfully',
      );
    } catch (error) {
      if (!committed) {
        await DeleteFileLocally(logo);
      }
      throw error;
    } finally {
      if (session) await session.endSession();
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
    const session = await this.companyRepository.startSession();
    try {
      const committed = await session.withTransaction(async () => {
        await this.userService.suspendUserAccount(ownerId, { session });
        const registration = await this.userService.createAdminRegistration(
          companyAdminData,
          Role.BUSINESS_ADMINISTRATOR,
          { session },
        );
        await this.updateCompanyById(
          companyId,
          {
            auditModifiedBy: this.context.email,
            auditModifiedDateTime: new Date().toISOString(),
            ownerId: registration.admin.id,
          },
          { session },
        );
        return registration;
      });
      if (!committed) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Company update failed',
        );
      }
      this.userService.publishAccessRevocation(ownerId);
      await this.userService.sendAdminRegistrationEmail(
        committed.admin,
        committed.token,
      );
    } finally {
      await session.endSession();
    }

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
    const oldLogo = company.logo;
    const data: any = {
      auditModifiedBy: this.context.email,
      auditModifiedDateTime: new Date().toISOString(),
      ...props,
    };

    let newLogo: string | undefined;
    try {
      if (logoFile) {
        newLogo = await SaveFileLocally(logoFile, 'company-logos');
        data.logo = newLogo;
      }

      this.updateCompanyData(data, company);

      if ((props as any).companyAdminData) {
        this.updateCompanyAdmin((props as any).companyAdminData, company.owner);
      }

      await this.updateCompanyById(company.id, data);
    } catch (error) {
      await DeleteFileLocally(newLogo);
      throw error;
    }

    if (newLogo) await DeleteFileLocally(oldLogo);

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

  private updateCompanyData(data: IUpdateCompany, company: Company) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in company) {
        (company as any)[key] = value;
      }
    });
  }

  private async updateCompanyById(
    id: Types.ObjectId,
    data: any,
    options?: { session?: ClientSession },
  ): Promise<Company> {
    const updatedCompanyResult = await this.companyRepository.updateCompany(
      id,
      data,
      options,
    );
    if (!updatedCompanyResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Company update failed',
      );
    }
    return updatedCompanyResult.getValue();
  }

  private updateCompanyAdmin(data: IUpdateCompanyAdmin, user: User) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in user) {
        (user as any)[key] = value;
      }
    });
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
