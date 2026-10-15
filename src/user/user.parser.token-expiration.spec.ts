import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { Role } from 'src/application/constants/constants';
import { ISignUpTokens } from 'src/infrastructure/auth/interfaces/auth.interface';
import { IUserSignedInResponseDTO } from './interfaces/user-response.interface';
import { UserParser } from './user.parser';

describe('UserParser access-token expiration metadata', () => {
  const user = {
    id: new Types.ObjectId(),
    name: 'Test User',
    email: 'user@example.com',
    phoneNumber: '251911111111',
    role: Role.END_USER,
    status: 'ACTIVE',
    savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
    audit: {},
  };

  it('reports the issued access-token lifetime in milliseconds', async () => {
    const jwtService = new JwtService();
    const accessToken = await jwtService.signAsync(
      { sub: new Types.ObjectId().toString() },
      { secret: 'test-secret', expiresIn: '7m' },
    );
    const tokens: ISignUpTokens = {
      accessToken,
      refreshToken: 'refresh-token',
    };
    const response = UserParser.createUserResponse(
      user as never,
      tokens,
      true,
    ) as IUserSignedInResponseDTO;

    expect(response).toMatchObject({
      tokens,
      tokenExpiresIn: 7 * 60 * 1000,
    });
    expect(response.tokenExpiresIn).not.toBe(60 * 60 * 1000);
  });

  it('requires an access token for a signed-in response', () => {
    expect(() =>
      UserParser.createUserResponse(user as never, undefined, true),
    ).toThrow('Access token is required for a signed-in response');
  });

  it('rejects invalid access-token expiration claims', async () => {
    const accessToken = await new JwtService().signAsync(
      { sub: user.id.toString() },
      { secret: 'test-secret' },
    );

    expect(() =>
      UserParser.createUserResponse(
        user as never,
        { accessToken, refreshToken: 'refresh-token' },
        true,
      ),
    ).toThrow('Access token has invalid expiration claims');
  });
});
