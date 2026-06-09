import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, HttpException, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StageConfiguration } from '../entities/stage-configuration.entity';
import { SystemConfiguration } from '../entities/system-configuration.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { ReglaAlerta } from '../entities/regla-alerta.entity';
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';
import { StorageService } from '../services/storage.service';

@Controller('configuration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
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
        private storageService: StorageService,
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
        return this.stageConfigRepo.find({ order: { orden: 'ASC' } });
    }

    @Post('stages')
    async createStage(@Body() config: Partial<StageConfiguration>) {
        const newStage = this.stageConfigRepo.create(config);
        return this.stageConfigRepo.save(newStage);
    }

    @Delete('stages/:id')
    async deleteStage(id: string) {
        await this.stageConfigRepo.delete(id);
        return { message: 'Stage deleted' };
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
                existing.color = config.color;
                existing.descripcion = config.descripcion;
                existing.activo = config.activo;
                existing.orden = config.orden;
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
                { etapa: 'RECEPCION', diasHabiles: 3, color: '#6B7280', descripcion: 'Recepción de la noticia', activo: true, orden: 1 },
                { etapa: 'VALORACION', diasHabiles: 10, color: '#6B7280', descripcion: 'Valoración inicial', activo: true, orden: 2 },
                { etapa: 'INDAGACION_PREVIA', diasHabiles: 40, color: '#6B7280', descripcion: 'Indagación previa', activo: true, orden: 3 },
                { etapa: 'INVESTIGACION', diasHabiles: 60, color: '#003DA5', descripcion: 'Investigación disciplinaria', activo: true, orden: 4 },
                { etapa: 'EVALUACION', diasHabiles: 10, color: '#6B7280', descripcion: 'Evaluación de investigación', activo: true, orden: 5 },
                { etapa: 'JUZGAMIENTO', diasHabiles: 50, color: '#6B7280', descripcion: 'Etapa de juzgamiento', activo: true, orden: 6 },
                { etapa: 'SEGUNDA_INSTANCIA', diasHabiles: 10, color: '#6B7280', descripcion: 'Segunda instancia', activo: true, orden: 7 },
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

    // --- FIRMA DEL JEFE ---

    @Post('firma-jefe')
    @Roles('SUPER_ADMIN', 'ADMIN', 'JEFE_DE_LA_OCID')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFirmaJefe(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('No se proporcionó archivo', HttpStatus.BAD_REQUEST);
        }
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)) {
            throw new HttpException('Solo se permiten imágenes PNG o JPG', HttpStatus.BAD_REQUEST);
        }
        const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
        const targetPath = this.storageService.getFullPath(`firma_jefe.${ext}`);
        const otherExt = ext === 'png' ? 'jpg' : 'png';
        const otherPath = this.storageService.getFullPath(`firma_jefe.${otherExt}`);
        try { await fs.unlink(otherPath); } catch {}
        await fs.writeFile(targetPath, file.buffer);
        return { message: 'Firma guardada correctamente', filename: `firma_jefe.${ext}` };
    }

    @Get('firma-jefe/existe')
    async firmaJefeExiste() {
        const pngPath = this.storageService.getFullPath('firma_jefe.png');
        const jpgPath = this.storageService.getFullPath('firma_jefe.jpg');
        return { existe: existsSync(pngPath) || existsSync(jpgPath) };
    }

    @Get('firma-jefe')
    @Roles('SUPER_ADMIN', 'ADMIN', 'JEFE_DE_LA_OCID')
    getFirmaJefe(@Res() res: Response) {
        const pngPath = this.storageService.getFullPath('firma_jefe.png');
        const jpgPath = this.storageService.getFullPath('firma_jefe.jpg');
        if (existsSync(pngPath)) {
            res.setHeader('Content-Type', 'image/png');
            res.sendFile(pngPath);
        } else if (existsSync(jpgPath)) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.sendFile(jpgPath);
        } else {
            res.status(404).json({ message: 'No hay firma configurada' });
        }
    }
}
