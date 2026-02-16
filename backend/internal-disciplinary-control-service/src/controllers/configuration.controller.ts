import { Controller, Get, Put, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StageConfiguration } from '../entities/stage-configuration.entity';
import { SystemConfiguration } from '../entities/system-configuration.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { ReglaAlerta } from '../entities/regla-alerta.entity';
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';

@Controller('configuration')
export class ConfigurationController {
    constructor(
        @InjectRepository(StageConfiguration)
        private stageConfigRepo: Repository<StageConfiguration>,
        @InjectRepository(SystemConfiguration)
        private systemConfigRepo: Repository<SystemConfiguration>,
        @InjectRepository(DisciplinaryProcess)
        private processRepo: Repository<DisciplinaryProcess>,
        @InjectRepository(ReglaAlerta)
        private reglasRepo: Repository<ReglaAlerta>,
        @InjectRepository(DisciplinaryProfessional)
        private professionalRepo: Repository<DisciplinaryProfessional>,
    ) { }

    // --- AVAILABLE ROLES (Punto 1: Dinámico) ---
    @Get('available-roles')
    async getAvailableRoles() {
        // Query distinct 'cargo' from active professionals
        const result = await this.professionalRepo
            .createQueryBuilder('professional')
            .select('DISTINCT professional.cargo', 'cargo')
            .where("professional.estado = 'ACTIVO'")
            .andWhere("professional.cargo IS NOT NULL")
            .andWhere("professional.cargo != ''")
            .getRawMany();

        return result.map(r => r.cargo);
    }

    // --- STAGE CONFIGURATION (Punto 1) ---

    @Get('stages')
    async getStageConfigs() {
        return this.stageConfigRepo.find();
    }

    @Put('stages')
    async updateStageConfigs(@Body() configs: StageConfiguration[]) {
        const savedConfigs: StageConfiguration[] = [];
        // Regex for standard UUID (v4)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        // 0. Identify stages to DELETE (those in DB but not in valid incoming list)
        // Get all valid UUIDs from the incoming payload
        const incomingIds = configs
            .map(c => c.id)
            .filter(id => id && uuidRegex.test(id));

        // Get all currently existing stage IDs from DB
        const allExistingStages = await this.stageConfigRepo.find({ select: ['id'] });
        const allExistingIds = allExistingStages.map(s => s.id);

        // Find IDs that are in DB but NOT in incoming payload
        const idsToDelete = allExistingIds.filter(id => !incomingIds.includes(id));

        // Delete them
        if (idsToDelete.length > 0) {
            await this.stageConfigRepo.delete(idsToDelete);
        }

        // Proceed with Update / Create
        for (const config of configs) {
            let existing: StageConfiguration | null = null;

            // 1. Try to find by ID ONLY if it is a valid UUID
            if (config.id && uuidRegex.test(config.id)) {
                existing = await this.stageConfigRepo.findOne({ where: { id: config.id } });
            }

            // 2. If not found by ID (or ID was invalid/temp), try by Name
            // Note: Use careful logic here. If we deleted it above because ID didn't match, 
            // but the user sent a "new" stage with the SAME name, we might want to revive/update it 
            // OR treating it as a new create is identifying it by name.
            // Current strict logic: if ID matches, update. If no ID match but Name matches, update.
            if (!existing) {
                existing = await this.stageConfigRepo.findOne({ where: { etapa: config.etapa } });
            }

            if (existing) {
                // Check if name is changing for Cascading Update
                if (existing.etapa !== config.etapa) {
                    const oldName = existing.etapa;
                    const newName = config.etapa;

                    // Update all processes that are currently in the old stage
                    await this.processRepo.update(
                        { etapaActual: oldName as any },
                        { etapaActual: newName as any }
                    );
                }

                // Update existing
                existing.etapa = config.etapa;
                existing.diasHabiles = config.diasHabiles;
                existing.descripcion = config.descripcion;
                existing.activo = config.activo;
                savedConfigs.push(await this.stageConfigRepo.save(existing));
            } else {
                // Create new (ensure we don't pass the temp ID)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, ...data } = config;
                savedConfigs.push(await this.stageConfigRepo.save(data));
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

        const saved = await this.systemConfigRepo.save(existing);

        // Sync Reglas de Alerta
        if (config.notificationSettings) {
            await this.syncAlertRules(config.notificationSettings);
        }

        return saved;
    }

    private async syncAlertRules(settings: any) {
        const mapping = [
            { key: 'vencimiento7dias', days: 7, name: 'Alerta 7 días antes' },
            { key: 'vencimiento3dias', days: 3, name: 'Alerta 3 días antes' },
            { key: 'vencimiento1dia', days: 1, name: 'Alerta 1 día antes' },
            { key: 'procesoVencido', days: 0, name: 'Alerta Proceso Vencido' }
        ];

        for (const map of mapping) {
            const isActive = settings[map.key];
            if (isActive !== undefined) {
                // Try to find by unique name first (more stable)
                let rule = await this.reglasRepo.findOne({ where: { nombre: map.name } });

                // If not found by name, try by days (legacy/fallback)
                if (!rule) {
                    rule = await this.reglasRepo.findOne({ where: { diasAnticipacion: map.days } });
                }

                if (!rule) {
                    rule = this.reglasRepo.create({
                        nombre: map.name,
                        diasAnticipacion: map.days,
                        activa: isActive,
                        enviarEmail: settings.emailMasterSwitch || false,
                        mostrarPanel: true
                    });
                } else {
                    rule.activa = isActive;
                    // Update email setting if present
                    if (settings.emailMasterSwitch !== undefined) {
                        rule.enviarEmail = settings.emailMasterSwitch;
                    }
                }
                await this.reglasRepo.save(rule);
            }
        }
    }

    // Seed inicial si está vacío
    @Get('seed')
    async seed() {
        // Seed Stages
        const stagesCount = await this.stageConfigRepo.count();
        if (stagesCount === 0) {
            const defaults = [
                { etapa: 'RECEPCION', diasHabiles: 3, descripcion: 'Recepción de la noticia', activo: true },
                { etapa: 'VALORACION', diasHabiles: 10, descripcion: 'Valoración inicial', activo: true },
                { etapa: 'INDAGACION_PREVIA', diasHabiles: 40, descripcion: 'Indagación previa', activo: true },
                { etapa: 'INVESTIGACION', diasHabiles: 60, descripcion: 'Investigación disciplinaria', activo: true },
                { etapa: 'EVALUACION', diasHabiles: 10, descripcion: 'Evaluación de investigación', activo: true },
                { etapa: 'JUZGAMIENTO', diasHabiles: 50, descripcion: 'Etapa de juzgamiento', activo: true },
                { etapa: 'SEGUNDA_INSTANCIA', diasHabiles: 10, descripcion: 'Segunda instancia', activo: true },
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
