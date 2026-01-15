import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { ConfigurationsService } from '../services/configurations.service';

@Controller('configurations')
export class ConfigurationsController {
    constructor(private readonly configService: ConfigurationsService) { }

    @Get(':key')
    async getConfiguration(@Param('key') key: string) {
        return this.configService.findByKey(key);
    }

    @Put(':key')
    async updateConfiguration(@Param('key') key: string, @Body() body: any) {
        return this.configService.saveConfiguration(key, body);
    }
}
