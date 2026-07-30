import { HttpStatus } from '@nestjs/common';

export class Result<T> {
  isSuccess: boolean;
  private data?: any;
  message: string;
  errorCode?: HttpStatus;

  constructor(
    isSuccess: boolean,
    data?: any,
    message?: string,
    errorCode?: HttpStatus,
  ) {
    this.isSuccess = isSuccess;
    this.data = data;
    this.message = message || '';

    if (!isSuccess && errorCode) {
      this.errorCode = errorCode;
    }
  }

  getValue(): T {
    return this.data;
  }

  static ok<U>(data: U, message?: string): Result<U> {
    return new Result<U>(true, data, message);
  }

  static fail<U>(message: string, errorCode: HttpStatus): Result<U> {
    return new Result<U>(false, null, message, errorCode);
  }
}
