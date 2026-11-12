import { Injectable } from '@nestjs/common';

/** The only source of "now" for attendance rules, so tests can pin the time. */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
