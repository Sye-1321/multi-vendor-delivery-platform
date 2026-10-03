import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class AccessRevocationPublisher {
  private readonly subject = new Subject<string>();

  readonly revocations$ = this.subject.asObservable();

  publish(userId: string): void {
    this.subject.next(userId);
  }
}
