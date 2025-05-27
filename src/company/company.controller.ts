import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  Inject,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Types } from 'mongoose';
import { ICompanyService } from './interfaces/company-service.interface';
import { Result } from '../domain/result/result';
import { RoleGuard } from 'src/infrastructure/guards/role-guard';
import { TYPES } from 'src/application/constants/types';
import { AccessAuthGuard } from 'src/infrastructure/guards/access-auth.guard';
import { Role } from 'src/application/constants/constants';
import { Roles } from 'src/infrastructure/decorators/roles.decorators';
import {
  CompanyAdminDTO,
  CreateCompanyDTO,
  UpdateCompanyDTO,
} from './dtos/company.dto';
import { ICompanyResponse } from './interfaces/company-response.interface';
import { ParseStringifiedJsonInterceptor } from 'src/infrastructure/utilities/ParseStringifiedJsonInterceptor';

@Controller('companies')
export class CompanyController {
  constructor(
    @Inject(TYPES.ICompanyService)
    private readonly companyService: ICompanyService,
  ) {}

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('logo'),
    ParseStringifiedJsonInterceptor,
  )
  @Post()
  createCompany(
    @Body() body: CreateCompanyDTO,
    @UploadedFile() logo: Express.Multer.File,
  ) {
    return this.companyService.createCompany(body, logo);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMyCompany(): Promise<Result<ICompanyResponse>> {
    return this.companyService.getMyCompany();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('logo'),
    ParseStringifiedJsonInterceptor,
  )
  @Put('me')
  async updateMyCompany(
    @UploadedFile() logoFile: Express.Multer.File,
    @Body() updateCompanyDto: UpdateCompanyDTO,
  ): Promise<Result<ICompanyResponse>> {
    return this.companyService.updateMyCompany(updateCompanyDto, logoFile);
  }


  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllCompanies(): Promise<Result<ICompanyResponse[]>> {
    return this.companyService.getCompanies();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Put(':companyId/change-admin')
  @HttpCode(HttpStatus.OK)
  async changeCompanyAdmin(
  @Param('companyId') companyId: Types.ObjectId,
  @Body() newAdminData: CompanyAdminDTO,
  ): Promise<Result<ICompanyResponse>> {
    return this.companyService.changeCompanyAdmin(companyId, newAdminData);
  }

  
  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Get(':companyId')
  @HttpCode(HttpStatus.OK)
  async getCompanyById(
    @Param('companyId') companyId: Types.ObjectId,
  ): Promise<Result<ICompanyResponse>> {
    return this.companyService.getCompanyById(companyId);
  }

}
