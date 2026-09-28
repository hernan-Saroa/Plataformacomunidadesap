import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { Expediente } from '../entities/expediente.entity';
import { ConfigurationsService } from './configurations.service';
import { FirmaAutorizacionService, solicitaMarcarFirmado } from './firma-autorizacion.service';

// Reporte de QA: el rol "Resuelve" podía firmar documentos cuya etapa tiene configurado al Jefe
// como aprobador. El frontend ya oculta el botón, pero los endpoints que marcan un documento como
// firmado no validaban nada, así que el bypass seguía abierto por API.

describe('FirmaAutorizacionService', () => {
    let service: FirmaAutorizacionService;
    let mockExpedienteRepo: any;
    let mockConsultaRepo: any;
    let configService: ConfigurationsService;

    const etapaConJefe = {
        id: 'E5_FALLO_1I',
        nombre: 'Fallo 1ª Instancia',
        aprobacionTipo: 'rol',
        aprobacionRol: 'JEFE_GESTION_LEGAL',
    };

    const etapaSinAprobacion = { id: 'E1_AVOCAMIENTO', nombre: 'Avocamiento', aprobacionTipo: 'ninguno' };

    const acceso = (roles: string[], userId?: string): any => ({
        roles,
        userId,
        userKeys: [],
        esResuelve: roles.includes('RESUELVE_GESTION_LEGAL'),
        tieneVistaGlobal: false,
        esResuelveSolo: false,
    });

    beforeEach(async () => {
        mockExpedienteRepo = { findOne: jest.fn() };
        mockConsultaRepo = { findOne: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FirmaAutorizacionService,
                ConfigurationsService,
                { provide: getRepositoryToken(Expediente), useValue: mockExpedienteRepo },
                { provide: getRepositoryToken(ConsultaJuridica), useValue: mockConsultaRepo },
                { provide: getRepositoryToken(require('../entities/system-configuration.entity').SystemConfiguration), useValue: { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() } },
            ],
        }).compile();

        service = module.get<FirmaAutorizacionService>(FirmaAutorizacionService);
        configService = module.get<ConfigurationsService>(ConfigurationsService);
    });

    describe('documentos de expediente', () => {
        beforeEach(() => {
            mockExpedienteRepo.findOne.mockResolvedValue({
                id: 'exp-1',
                jurisdiccion: 'DISCIPLINARIO',
                tipoProceso: 'Ordinario',
                etapa: 'E5_FALLO_1I',
            });
        });

        it('rechaza al rol Resuelve cuando la etapa tiene configurado al Jefe como aprobador', async () => {
            jest.spyOn(configService, 'findByKey').mockResolvedValue({ value: { estados: [etapaConJefe] } } as any);

            await expect(
                service.assertPuedeFirmarDocumentoExpediente('exp-1', acceso(['RESUELVE_GESTION_LEGAL']))
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('permite al rol configurado como aprobador', async () => {
            jest.spyOn(configService, 'findByKey').mockResolvedValue({ value: { estados: [etapaConJefe] } } as any);

            await expect(
                service.assertPuedeFirmarDocumentoExpediente('exp-1', acceso(['JEFE_GESTION_LEGAL']))
            ).resolves.toBeUndefined();
        });

        it('permite a un SUPER_ADMIN', async () => {
            jest.spyOn(configService, 'findByKey').mockResolvedValue({ value: { estados: [etapaConJefe] } } as any);

            await expect(
                service.assertPuedeFirmarDocumentoExpediente('exp-1', acceso(['SUPER_ADMIN']))
            ).resolves.toBeUndefined();
        });

        it('con aprobación por usuario, sólo pasa el usuario asignado', async () => {
            jest.spyOn(configService, 'findByKey').mockResolvedValue({
                value: { estados: [{ ...etapaConJefe, aprobacionTipo: 'usuario', aprobacionRol: undefined, aprobacionUsuario: 'user-77' }] },
            } as any);

            await expect(
                service.assertPuedeFirmarDocumentoExpediente('exp-1', acceso([], 'user-77'))
            ).resolves.toBeUndefined();

            await expect(
                service.assertPuedeFirmarDocumentoExpediente('exp-1', acceso([], 'user-12'))
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('no bloquea cuando la etapa no tiene aprobación parametrizada (no exige firma en plataforma, y sigue sirviendo para cargar un PDF firmado por fuera)', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue({
                id: 'exp-1',
                jurisdiccion: 'DISCIPLINARIO',
                etapa: 'E1_AVOCAMIENTO',
            });
            jest.spyOn(configService, 'findByKey').mockResolvedValue({ value: { estados: [etapaSinAprobacion] } } as any);

            await expect(
                service.assertPuedeFirmarDocumentoExpediente('exp-1', acceso(['RESUELVE_GESTION_LEGAL']))
            ).resolves.toBeUndefined();
        });

        it('en Defensa Judicial resuelve la etapa contra el tablero del tipo de proceso, igual que la pantalla', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue({
                id: 'exp-2',
                jurisdiccion: 'JUDICIAL',
                tipoProceso: 'Reparación Directa',
                etapa: 'SENTENCIA',
            });
            const spy = jest
                .spyOn(configService, 'getEstadosForExpediente')
                .mockResolvedValue([{ id: 'SENTENCIA', aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' }]);

            await expect(
                service.assertPuedeFirmarDocumentoExpediente('exp-2', acceso(['RESUELVE_GESTION_LEGAL']))
            ).rejects.toBeInstanceOf(ForbiddenException);
            expect(spy).toHaveBeenCalled();
        });

        it('no rompe si el expediente no existe o no llega id', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue(null);
            await expect(service.assertPuedeFirmarDocumentoExpediente('exp-x', acceso([]))).resolves.toBeUndefined();
            await expect(service.assertPuedeFirmarDocumentoExpediente('', acceso([]))).resolves.toBeUndefined();
        });
    });

    describe('documentos de consulta (Asesoría Jurídica)', () => {
        it('rechaza al rol Resuelve en una etapa cuyo aprobador es el Jefe', async () => {
            mockConsultaRepo.findOne.mockResolvedValue({ id: 'consulta-1', estado: 'pendiente_revision_jefe' });
            jest.spyOn(configService, 'findByKey').mockResolvedValue({
                value: { estados: [{ id: 'pendiente_revision_jefe', nombre: 'Pendiente Revisión Jefe', aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' }] },
            } as any);

            await expect(
                service.assertPuedeFirmarDocumentoConsulta('consulta-1', acceso(['RESUELVE_GESTION_LEGAL']))
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('permite al Jefe en esa misma etapa', async () => {
            mockConsultaRepo.findOne.mockResolvedValue({ id: 'consulta-1', estado: 'pendiente_revision_jefe' });
            jest.spyOn(configService, 'findByKey').mockResolvedValue({
                value: { estados: [{ id: 'pendiente_revision_jefe', aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' }] },
            } as any);

            await expect(
                service.assertPuedeFirmarDocumentoConsulta('consulta-1', acceso(['JEFE_GESTION_LEGAL']))
            ).resolves.toBeUndefined();
        });

        it('no bloquea si el módulo no tiene configuración de estados', async () => {
            mockConsultaRepo.findOne.mockResolvedValue({ id: 'consulta-1', estado: 'en_analisis' });
            jest.spyOn(configService, 'findByKey').mockResolvedValue(null as any);

            await expect(
                service.assertPuedeFirmarDocumentoConsulta('consulta-1', acceso(['RESUELVE_GESTION_LEGAL']))
            ).resolves.toBeUndefined();
        });
    });

    describe('solicitaMarcarFirmado', () => {
        it('detecta el flag y el certificado JSON que guarda el visor al firmar', () => {
            expect(solicitaMarcarFirmado({ firmado: true })).toBe(true);
            expect(solicitaMarcarFirmado({ firmado: 'true' })).toBe(true);
            expect(solicitaMarcarFirmado({ descripcion: JSON.stringify({ firmado: true, hash: 'x' }) })).toBe(true);
        });

        it('no se dispara con actualizaciones que nada tienen que ver con la firma', () => {
            expect(solicitaMarcarFirmado({ nombre: 'Auto de trámite.pdf' })).toBe(false);
            expect(solicitaMarcarFirmado({ descripcion: 'Documento aportado por el investigado' })).toBe(false);
            expect(solicitaMarcarFirmado({ descripcion: JSON.stringify({ firmado: false }) })).toBe(false);
            expect(solicitaMarcarFirmado(null)).toBe(false);
        });
    });
});
