import { UserParser } from 'src/user/user.parser';
import { Company } from './company';
import { ICompanyResponse } from './interfaces/company-response.interface';
import { AuditParser } from 'src/audit/audit.parser';

export class CompanyParser {
  static createCompanyResponse(company: Company): ICompanyResponse {
    const companyResponse: ICompanyResponse = {
      id: company.id,
      logo: company.logo,
      name: company.name,
      phoneNumber: company.phoneNumber,
      ownerId: company.ownerId,
      savedAddress: company.savedAddress,
      owner: UserParser.createUserResponse(company.owner),
      ...AuditParser.createAuditResponse(company.audit),
    };
    return companyResponse;
  }

  static createCompaniesResponse(companies: Company[]): ICompanyResponse[] {
    return companies.map((item) => CompanyParser.createCompanyResponse(item));
  }
}
