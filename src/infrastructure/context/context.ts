import { Injectable } from '@nestjs/common';

@Injectable()
export class Context {
  private readonly _email: string;
  private readonly _correlationId?: string;
  private readonly _authToken?: string;
  private readonly _role?: string;

  constructor(
    email: string,
    correlationId?: string,
    authToken?: string,
    role?: string,
  ) {
    this._email = email;
    this._correlationId = correlationId;
    this._authToken = authToken;
    this._role = role;
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

  get role(): string | undefined {
    return this._role;
  }

  getCurrentContext(): this {
    return this;
  }
}
