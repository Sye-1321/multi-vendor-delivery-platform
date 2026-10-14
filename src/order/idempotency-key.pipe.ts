import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class IdempotencyKeyPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Idempotency-Key header is required.');
    }

    const key = value.trim();
    if (!key || key.length > 128) {
      throw new BadRequestException(
        'Idempotency-Key must contain between 1 and 128 characters.',
      );
    }

    return key;
  }
}
