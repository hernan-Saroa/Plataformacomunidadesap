import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'rund-service',
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness: además de estar vivo, el servicio puede hablar con la base de datos. */
  async getReadiness(): Promise<{ status: string; service: string; database: string; timestamp: string }> {
    await this.dataSource.query('SELECT 1');
    return { ...this.getHealth(), database: 'up' };
  }
}
