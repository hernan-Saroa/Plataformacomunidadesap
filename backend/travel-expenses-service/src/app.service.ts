import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Running Microservice Travel Expenses Service';
  }
}
