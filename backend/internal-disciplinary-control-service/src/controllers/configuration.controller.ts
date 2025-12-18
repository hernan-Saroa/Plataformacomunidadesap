import { Controller, Get, Put, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StageConfiguration } from '../entities/stage-configuration.entity';
import { SystemConfiguration } from '../entities/system-configuration.entity';

@Controller('configuration')
export class ConfigurationController {
    constructor(
        @InjectRepository(StageConfiguration)
        private stageConfigRepo: Repository<StageConfiguration>,
        @InjectRepository(SystemConfiguration)
        private systemConfigRepo: Repository<SystemConfiguration>,
    ) { }

    // --- STAGE CONFIGURATION (Punto 1) ---

    @Get('stages')
    async getStageConfigs() {
        return this.stageConfigRepo.find();
    }

    @Put('stages')
    async updateStageConfigs(@Body() configs: StageConfiguration[]) {
        const savedConfigs: StageConfiguration[] = [];
        for (const config of configs) {
            let existing = await this.stageConfigRepo.findOne({ where: { etapa: config.etapa } });
            if (existing) {
                existing.diasHabiles = config.diasHabiles;
                existing.descripcion = config.descripcion;
                existing.activo = config.activo;
                savedConfigs.push(await this.stageConfigRepo.save(existing));
            } else {
                savedConfigs.push(await this.stageConfigRepo.save(config));
            }
        }
        return savedConfigs;
    }

    // --- SYSTEM CONFIGURATION (Puntos 2, 3, 4, 5) ---

    @Get('global')
    async getGlobalConfig() {
        const config = await this.systemConfigRepo.findOne({ where: {} });
        if (!config) {
            // Retornar default si no existe (o crear uno)
            return this.seedGlobal();
        }
        return config;
    }

    @Put('global')
    async updateGlobalConfig(@Body() config: Partial<SystemConfiguration>) {
        let existing = await this.systemConfigRepo.findOne({ where: {} });
        if (!existing) {
            existing = this.systemConfigRepo.create(config);
        } else {
            this.systemConfigRepo.merge(existing, config);
        }
        return this.systemConfigRepo.save(existing);
    }

    // Seed inicial si está vacío
    @Get('seed')
    async seed() {
        // Seed Stages
        const stagesCount = await this.stageConfigRepo.count();
        if (stagesCount === 0) {
            const defaults = [
                { etapa: 'EVALUACION', diasHabiles: 30, descripcion: 'Etapa de evaluación inicial', activo: true },
                { etapa: 'INDAGACION_PREVIA', diasHabiles: 180, descripcion: 'Etapa de indagación previa', activo: true },
                { etapa: 'INVESTIGACION', diasHabiles: 180, descripcion: 'Etapa de investigación', activo: true },
                { etapa: 'JUZGAMIENTO', diasHabiles: 90, descripcion: 'Etapa de juzgamiento', activo: true },
            ];
            await this.stageConfigRepo.save(defaults);
        }

        // Seed Global
        await this.seedGlobal();

        return { message: 'Seeded configuration' };
    }

    private async seedGlobal() {
        const globalCount = await this.systemConfigRepo.count();
        if (globalCount === 0) {
            const defaultConfig = this.systemConfigRepo.create({
                roleCapacities: {
                    especializado: 12,
                    universitario: 10,
                    senior: 15,
                    coordinador: 8
                },
                notificationSettings: {
                    vencimiento7dias: true,
                    vencimiento3dias: true,
                    vencimiento1dia: true,
                    procesoVencido: true,
                    asignacionProceso: true,
                    cambioEtapa: true,
                    aprobacionRequerida: false,
                    resumenDiario: true,
                    resumenSemanal: true,
                    emailMasterSwitch: true
                },
                alertSettings: {
                    porcentajeRiesgo: 85,
                    porcentajeCritico: 95,
                    capacidadAlerta: 90,
                    diasAnticipacion: 7
                },
                securitySettings: {
                    auditEnabled: true,
                    digitalSignature: true,
                    backupEnabled: true
                }
            });
            return await this.systemConfigRepo.save(defaultConfig);
        }
    }
}
