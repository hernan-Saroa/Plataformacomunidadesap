import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CorreosJuridicosService } from './correos-juridicos.service';

@Injectable()
export class CorreosSyncScheduler {
    private readonly logger = new Logger(CorreosSyncScheduler.name);
    private isRunning = false;

    constructor(private readonly correosService: CorreosJuridicosService) { }

    /**
     * Sync emails every 5 minutes
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleCron() {
        // Prevent overlapping runs
        if (this.isRunning) {
            this.logger.warn('Sync already in progress, skipping...');
            return;
        }

        this.isRunning = true;
        this.logger.log('Starting scheduled email sync...');

        try {
            const result = await this.correosService.syncInbox();
            this.logger.log(`Scheduled sync complete. Synced: ${result.synced}, Errors: ${result.errors}`);
        } catch (error) {
            this.logger.error('Scheduled sync failed:', error);
        } finally {
            this.isRunning = false;
        }
    }
}
