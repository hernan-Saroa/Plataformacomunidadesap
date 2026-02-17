import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CorreosJuridicosService } from './correos-juridicos.service';

@Injectable()
export class CorreosSyncScheduler {
    private readonly logger = new Logger(CorreosSyncScheduler.name);
    private isRunning = false;

    constructor(private readonly correosService: CorreosJuridicosService) { }

    /**
     * Sync emails every 2 minutes
     * Runs in all environments (dev + prod) as long as AZURE_TENANT_ID is configured
     */
    @Cron('0 */2 * * * *')
    async handleCron() {
        // Only skip if Graph is explicitly disabled
        if (process.env.AZURE_TENANT_ID === 'development-disabled') {
            this.logger.log('Skipping scheduled sync — Graph disabled');
            return;
        }

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
