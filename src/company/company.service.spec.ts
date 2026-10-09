import { Result } from 'src/domain/result/result';
import { CompanyService } from './company.service';
import { CreateCompanyDTO } from './dtos/company.dto';
import {
  DeleteFileLocally,
  SaveFileLocally,
} from 'src/application/saveFileLocally';

jest.mock('src/application/saveFileLocally', () => ({
  SaveFileLocally: jest.fn((file) =>
    file
      ? Promise.resolve('company-logos/new.png')
      : Promise.reject(
          Object.assign(new Error('Image file is required'), {
            status: 400,
            response: { error: 'Image file is required' },
          }),
        ),
  ),
  DeleteFileLocally: jest.fn(() => Promise.resolve()),
}));

const saveFile = jest.mocked(SaveFileLocally);
const deleteFile = jest.mocked(DeleteFileLocally);

beforeEach(() => {
  saveFile.mockReset().mockResolvedValue('company-logos/new.png');
  deleteFile.mockReset().mockResolvedValue();
});

describe('CompanyService required logo', () => {
  it('returns a controlled 400 when company creation has no logo', async () => {
    saveFile.mockRejectedValue(
      Object.assign(new Error('Image file is required'), {
        status: 400,
        response: { error: 'Image file is required' },
      }),
    );
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

describe('CompanyService logo lifecycle', () => {
  const id = { toString: () => 'company-id' };
  const oldLogo = 'company-logos/old.png';
  const image = {} as Express.Multer.File;

  function build(updateResult: Result<any>, reload?: jest.Mock) {
    const company = { id, logo: oldLogo, owner: {} };
    const repository = {
      getCompanyByOwner: jest.fn().mockResolvedValue(Result.ok(company)),
      updateCompany: jest.fn().mockResolvedValue(updateResult),
      getCompanyById:
        reload ?? jest.fn().mockRejectedValue(new Error('reload unavailable')),
    };
    const service = new CompanyService(
      { getContext: () => ({ email: 'admin@example.com' }) } as never,
      { getContextUser: () => Promise.resolve({ id: 'admin-id' }) } as never,
      repository as never,
      {} as never,
    );
    return { service, repository };
  }

  it('cleans the new logo and retains the old logo when persistence fails', async () => {
    const { service } = build(Result.fail('update failed', 500));

    await expect(service.updateMyCompany({}, image)).rejects.toMatchObject({
      status: 500,
      response: { error: 'Company update failed' },
    });

    expect(deleteFile).toHaveBeenCalledWith('company-logos/new.png');
    expect(deleteFile).not.toHaveBeenCalledWith(oldLogo);
  });

  it('deletes the old logo after persistence and retains the new logo when reload fails', async () => {
    const unexpected = new Error('reload unavailable');
    const { service, repository } = build(
      Result.ok({}),
      jest.fn().mockRejectedValue(unexpected),
    );

    await expect(service.updateMyCompany({}, image)).rejects.toBe(unexpected);

    expect(deleteFile).toHaveBeenCalledWith(oldLogo);
    expect(deleteFile).not.toHaveBeenCalledWith('company-logos/new.png');
    expect(repository.updateCompany.mock.invocationCallOrder[0]).toBeLessThan(
      deleteFile.mock.invocationCallOrder[0],
    );
  });
});
