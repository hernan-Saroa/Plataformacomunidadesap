import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfiguration } from '../entities/system-configuration.entity';

@Injectable()
export class ConfigurationsService {
    constructor(
        @InjectRepository(SystemConfiguration)
        private readonly configRepository: Repository<SystemConfiguration>
    ) { }

    async findByKey(key: string): Promise<SystemConfiguration | null> {
        return this.configRepository.findOne({ where: { key } });
    }

    async findAll(): Promise<SystemConfiguration[]> {
        return this.configRepository.find();
    }

    async saveConfiguration(key: string, data: any): Promise<SystemConfiguration> {
        let config = await this.findByKey(key);

        if (!config) {
            config = this.configRepository.create({
                key,
                module: data.module || 'general',
                value: data.value,
                description: data.description
            });
        } else {
            config.value = data.value;
            if (data.description) config.description = data.description;
        }

        return this.configRepository.save(config);
    }
}
