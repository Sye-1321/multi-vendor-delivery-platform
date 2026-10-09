import { Result } from 'src/domain/result/result';
import {
  DeleteFileLocally,
  SaveFileLocally,
} from 'src/application/saveFileLocally';
import { RestaurantService } from './restaurant.service';

jest.mock('src/application/saveFileLocally', () => ({
  SaveFileLocally: jest.fn(),
  DeleteFileLocally: jest.fn(() => Promise.resolve()),
}));

const saveFile = jest.mocked(SaveFileLocally);
const deleteFile = jest.mocked(DeleteFileLocally);

describe('RestaurantService media lifecycle', () => {
  const oldLogo = 'restaurant-logos/old-logo.png';
  const oldCover = 'restaurant-covers/old-cover.png';
  const newLogo = 'restaurant-logos/new-logo.png';
  const newCover = 'restaurant-covers/new-cover.png';
  const file = {} as Express.Multer.File;

  beforeEach(() => {
    saveFile.mockReset();
    deleteFile.mockReset().mockResolvedValue();
  });

  function build(repository: Record<string, jest.Mock>) {
    return new RestaurantService(
      { getContext: () => ({ email: 'admin@example.com' }) } as never,
      { getContextUser: () => Promise.resolve({ id: 'admin-id' }) } as never,
      repository as never,
      {
        getCompanyByCompanyAdmin: () => Promise.resolve({ id: 'company-id' }),
      } as never,
      {} as never,
    );
  }

  it('cleans the first file when the second create save fails', async () => {
    const unexpected = new Error('cover write failed');
    saveFile.mockResolvedValueOnce(newLogo).mockRejectedValueOnce(unexpected);
    const repository = {
      startSession: jest.fn(),
      createRestaurant: jest.fn(),
    };

    await expect(
      build(repository).createRestaurant({} as never, file, file),
    ).rejects.toBe(unexpected);

    expect(deleteFile).toHaveBeenCalledWith(newLogo);
    expect(repository.startSession).not.toHaveBeenCalled();
    expect(repository.createRestaurant).not.toHaveBeenCalled();
  });

  it('cleans both new files and retains both old files after a failed update', async () => {
    saveFile.mockResolvedValueOnce(newLogo).mockResolvedValueOnce(newCover);
    const restaurant = { id: 'restaurant-id', logo: oldLogo, image: oldCover };
    const repository = {
      getRestaurantByRestaurantAdmin: jest
        .fn()
        .mockResolvedValue(Result.ok(restaurant)),
      updateRestaurant: jest.fn().mockResolvedValue(Result.fail('failed', 500)),
    };

    await expect(
      build(repository).updateMyRestaurant({}, file, file),
    ).rejects.toMatchObject({ status: 500 });

    expect(deleteFile).toHaveBeenCalledWith(newLogo);
    expect(deleteFile).toHaveBeenCalledWith(newCover);
    expect(deleteFile).not.toHaveBeenCalledWith(oldLogo);
    expect(deleteFile).not.toHaveBeenCalledWith(oldCover);
  });

  it('deletes only the replaced old logo after a selective successful update', async () => {
    const unexpected = new Error('reload unavailable');
    saveFile.mockResolvedValue(newLogo);
    const restaurant = { id: 'restaurant-id', logo: oldLogo, image: oldCover };
    const repository = {
      getRestaurantByRestaurantAdmin: jest
        .fn()
        .mockResolvedValue(Result.ok(restaurant)),
      updateRestaurant: jest.fn().mockResolvedValue(Result.ok(restaurant)),
      getRestaurantById: jest.fn().mockRejectedValue(unexpected),
    };

    await expect(build(repository).updateMyRestaurant({}, file)).rejects.toBe(
      unexpected,
    );

    expect(repository.updateRestaurant.mock.calls[0][1].logo).toBe(newLogo);
    expect(deleteFile).toHaveBeenCalledWith(oldLogo);
    expect(deleteFile).not.toHaveBeenCalledWith(oldCover);
    expect(deleteFile).not.toHaveBeenCalledWith(newLogo);
  });
});
