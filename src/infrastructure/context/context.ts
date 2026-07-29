import { Role } from 'src/application/constants/constants';

export interface AuthenticatedPrincipal {
  userId: string;
  email: string;
  role: Role;
}

export class Context {
  private _email: string;
  private readonly _correlationId?: string;
  private _authToken?: string;
  private _role?: Role;
  private _userId?: string;

  constructor(
    email: string,
    correlationId?: string,
    authToken?: string,
    role?: Role,
  ) {
    this._email = email;
    this._correlationId = correlationId;
    this._authToken = authToken;
    this._role = role;
  }

  setPrincipal(principal: AuthenticatedPrincipal, authToken?: string): void {
    this._userId = principal.userId;
    this._email = principal.email;
    this._role = principal.role;
    this._authToken = authToken;
  }

  get userId(): string | undefined {
    return this._userId;
  }

  get email(): string {
    return this._email;
  }

  get correlationId(): string | undefined {
    return this._correlationId;
  }

  get authToken(): string | undefined {
    return this._authToken;
  }

  get role(): Role | undefined {
    return this._role;
  }
}
