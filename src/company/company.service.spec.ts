import { Result } from 'src/domain/result/result';
import { CompanyService } from './company.service';
import { CreateCompanyDTO } from './dtos/company.dto';

describe('CompanyService required logo', () => {
  it('returns a controlled 400 when company creation has no logo', async () => {
    const companyRepository = {
      getCompanies: jest.fn().mockResolvedValue(Result.ok([])),
    };
    const service = new CompanyService(
      {} as never,
      {} as never,
      companyRepository as never,
      {} as never,
    );

    const action = service.createCompany(
      {
        phoneNumber: '+254700000000',
      } as CreateCompanyDTO,
      undefined as unknown as Express.Multer.File,
    );

    await expect(action).rejects.toMatchObject({
      status: 400,
      response: { error: 'Image file is required' },
    });
    expect(companyRepository.getCompanies).toHaveBeenCalledTimes(1);
  });
});
