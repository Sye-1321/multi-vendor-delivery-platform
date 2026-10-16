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
  Query,
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
import { ParseObjectIdPipe } from 'src/infrastructure/utilities/parse-object-id.pipe';
import { IMAGE_UPLOAD_OPTIONS } from 'src/application/image-upload.options';
import { PaginationQueryDTO } from 'src/shared/dtos/pagination-query.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiResultResponse,
  mongoIdParam,
} from 'src/infrastructure/swagger/swagger.decorators';

@ApiTags('Companies')
@ApiBearerAuth('access-token')
@Controller('companies')
export class CompanyController {
  constructor(
    @Inject(TYPES.ICompanyService)
    private readonly companyService: ICompanyService,
  ) {}

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('logo', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  @Post()
  @ApiOperation({ summary: 'Create a delivery company' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'name',
        'phoneNumber',
        'savedAddress',
        'companyAdminData',
        'logo',
      ],
      properties: {
        name: { type: 'string' },
        phoneNumber: { type: 'string' },
        savedAddress: {
          type: 'string',
          example: '{"city":"Nairobi","subCity":"Westlands"}',
        },
        companyAdminData: {
          type: 'string',
          example:
            '{"name":"Admin User","email":"admin@example.com","phoneNumber":"251911234567","savedAddress":{"city":"Nairobi","subCity":"Westlands"}}',
        },
        logo: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.CREATED)
  createCompany(
    @Body() body: CreateCompanyDTO,
    @UploadedFile() logo: Express.Multer.File,
  ) {
    return this.companyService.createCompany(body, logo);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  @Get('me')
  @ApiOperation({ summary: 'Get the current administrator’s company' })
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async getMyCompany(): Promise<Result<ICompanyResponse>> {
    return this.companyService.getMyCompany();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('logo', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  @Put('me')
  @ApiOperation({ summary: 'Update the current administrator’s company' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phoneNumber: { type: 'string' },
        savedAddress: {
          type: 'string',
          example: '{"city":"Nairobi","subCity":"Westlands"}',
        },
        logo: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.OK)
  async updateMyCompany(
    @UploadedFile() logoFile: Express.Multer.File,
    @Body() updateCompanyDto: UpdateCompanyDTO,
  ): Promise<Result<ICompanyResponse>> {
    return this.companyService.updateMyCompany(updateCompanyDto, logoFile);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Get()
  @ApiOperation({ summary: 'List delivery companies' })
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async getAllCompanies(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<ICompanyResponse[]>> {
    return this.companyService.getCompanies(pagination);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Put(':companyId/administrator')
  @ApiOperation({ summary: 'Change a company administrator' })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('companyId')
  @HttpCode(HttpStatus.OK)
  async changeCompanyAdmin(
    @Param('companyId', ParseObjectIdPipe) companyId: Types.ObjectId,
    @Body() newAdminData: CompanyAdminDTO,
  ): Promise<Result<ICompanyResponse>> {
    return this.companyService.changeCompanyAdmin(companyId, newAdminData);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Get(':companyId')
  @ApiOperation({ summary: 'Get a delivery company by ID' })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('companyId')
  @HttpCode(HttpStatus.OK)
  async getCompanyById(
    @Param('companyId', ParseObjectIdPipe) companyId: Types.ObjectId,
  ): Promise<Result<ICompanyResponse>> {
    return this.companyService.getCompanyById(companyId);
  }
}
