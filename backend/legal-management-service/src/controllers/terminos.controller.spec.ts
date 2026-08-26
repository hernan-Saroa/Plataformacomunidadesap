import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TerminosService } from '../services/terminos.service';
import { TerminosController } from './terminos.controller';

describe('TerminosController', () => {
    let controller: TerminosController;
    let mockTerminosService: any;

    beforeEach(async () => {
        mockTerminosService = {
            create: jest.fn((data: any) => Promise.resolve({ id: 'term-1', ...data })),
            update: jest.fn((id: string, data: any) => Promise.resolve({ id, ...data })),
            remove: jest.fn(),
            sincronizar: jest.fn().mockResolvedValue({ total: 0, nuevos: 0 }),
            getDocumentos: jest.fn().mockResolvedValue([]),
            getCalendario: jest.fn().mockResolvedValue([]),
            getSemaforoList: jest.fn().mockResolvedValue([]),
            getReporteEficiencia: jest.fn().mockResolvedValue({}),
            getReporteCarga: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({ id: 'term-1' }),
            generarPDF: jest.fn().mockResolvedValue(Buffer.from('pdf')),
            getNotas: jest.fn().mockResolvedValue([]),
            addNota: jest.fn().mockResolvedValue({}),
            addDocumentoLogico: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [TerminosController],
            providers: [{ provide: TerminosService, useValue: mockTerminosService }],
        }).compile();

        controller = module.get<TerminosController>(TerminosController);
    });

    afterEach(() => jest.clearAllMocks());

    // ---------------------------------------------------------------------
    // createManual()
    // ---------------------------------------------------------------------
    describe('createManual()', () => {
        it('debe reenviar enteSolicitante y destinatario sin modificarlos', async () => {
            await controller.createManual({
                nombreActuacion: 'Informe a Contraloría',
                origenModulo: 'MANUAL',
                destinatario: 'Oficina de Planeación',
                enteSolicitante: 'Contraloría General de la República',
                fechaVencimiento: '2026-12-31',
            });

            expect(mockTerminosService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    destinatario: 'Oficina de Planeación',
                    enteSolicitante: 'Contraloría General de la República',
                }),
            );
        });

        it('debe dejar enteSolicitante en undefined cuando no viene en el body (no inventa valor)', async () => {
            await controller.createManual({ nombreActuacion: 'Sin ente', fechaVencimiento: '2026-12-31' });

            const sent = mockTerminosService.create.mock.calls[0][0];
            expect(sent.enteSolicitante).toBeUndefined();
        });

        it.each([
            ['DEFENSA_JUDICIAL', 'DEFENSA'],
            ['DEFENSA', 'DEFENSA'],
            ['JUZGAMIENTO', 'JUZGAMIENTO'],
            ['JUZGAMIENTO_DISCIPLINARIO', 'JUZGAMIENTO'],
            ['ASESORIA', 'ASESORIA'],
            ['ASESORIA_JURIDICA', 'ASESORIA'],
            ['ORGANOS_CONTROL', 'ORGANOS_CONTROL'],
            ['PROCESOS_COACTIVOS', 'PROCESOS_COACTIVOS'],
            ['MANUAL', 'MANUAL'],
        ])('debe normalizar origenModulo "%s" -> "%s" según el MODULO_MAP', async (entrada, esperado) => {
            await controller.createManual({ nombreActuacion: 'X', origenModulo: entrada, fechaVencimiento: '2026-12-31' });

            expect(mockTerminosService.create).toHaveBeenCalledWith(expect.objectContaining({ origenModulo: esperado }));
        });

        it('debe usar MANUAL por defecto cuando no viene origenModulo', async () => {
            await controller.createManual({ nombreActuacion: 'Sin módulo', fechaVencimiento: '2026-12-31' });

            expect(mockTerminosService.create).toHaveBeenCalledWith(expect.objectContaining({ origenModulo: 'MANUAL' }));
        });

        it('debe pasar tal cual un origenModulo desconocido que no está en el MODULO_MAP (no cae a MANUAL)', async () => {
            await controller.createManual({ nombreActuacion: 'Módulo raro', origenModulo: 'ALGO_INVENTADO', fechaVencimiento: '2026-12-31' });

            expect(mockTerminosService.create).toHaveBeenCalledWith(expect.objectContaining({ origenModulo: 'ALGO_INVENTADO' }));
        });

        it('debe convertir responsableId y referenciaId vacíos ("" o solo espacios) a null', async () => {
            await controller.createManual({
                nombreActuacion: 'Con campos vacíos',
                fechaVencimiento: '2026-12-31',
                responsableId: '',
                referenciaId: '   ',
            });

            expect(mockTerminosService.create).toHaveBeenCalledWith(
                expect.objectContaining({ responsableId: null, referenciaId: null }),
            );
        });

        it('debe conservar responsableId y referenciaId cuando vienen con un valor real', async () => {
            await controller.createManual({
                nombreActuacion: 'Con ids reales',
                fechaVencimiento: '2026-12-31',
                responsableId: 'resp-123',
                referenciaId: 'ref-456',
            });

            expect(mockTerminosService.create).toHaveBeenCalledWith(
                expect.objectContaining({ responsableId: 'resp-123', referenciaId: 'ref-456' }),
            );
        });

        it('debe usar la fecha actual como fechaBase cuando no viene ninguna', async () => {
            const before = Date.now();
            await controller.createManual({ nombreActuacion: 'Sin fechaBase', fechaVencimiento: '2026-12-31' });
            const after = Date.now();

            const sent = mockTerminosService.create.mock.calls[0][0];
            expect(sent.fechaBase).toBeInstanceOf(Date);
            expect(sent.fechaBase.getTime()).toBeGreaterThanOrEqual(before);
            expect(sent.fechaBase.getTime()).toBeLessThanOrEqual(after);
        });

        it('debe convertir fechaVencimiento ausente a null (no a una fecha inventada)', async () => {
            await controller.createManual({ nombreActuacion: 'Sin vencimiento' });

            expect(mockTerminosService.create).toHaveBeenCalledWith(expect.objectContaining({ fechaVencimiento: null }));
        });

        it('debe respetar diasTermino explícito y NO recalcularlo aunque venga fechaVencimiento', async () => {
            await controller.createManual({
                nombreActuacion: 'Con días explícitos',
                fechaBase: '2026-01-01',
                fechaVencimiento: '2026-01-31',
                diasTermino: 5,
            });

            expect(mockTerminosService.create).toHaveBeenCalledWith(expect.objectContaining({ diasTermino: 5 }));
        });

        it('debe calcular diasTermino a partir de fechaBase y fechaVencimiento cuando no viene explícito', async () => {
            await controller.createManual({
                nombreActuacion: 'Calcular días',
                fechaBase: '2026-01-01',
                fechaVencimiento: '2026-01-11',
            });

            expect(mockTerminosService.create).toHaveBeenCalledWith(expect.objectContaining({ diasTermino: 10 }));
        });

        it('diasTermino debe quedar en 0 si no viene explícito y tampoco hay fechaVencimiento', async () => {
            await controller.createManual({ nombreActuacion: 'Sin nada de fechas', fechaBase: '2026-01-01' });

            expect(mockTerminosService.create).toHaveBeenCalledWith(expect.objectContaining({ diasTermino: 0 }));
        });

        it('debe aplicar defaults de estado=PENDIENTE, prioridad=MEDIA y tipoDias=CALENDARIO', async () => {
            await controller.createManual({ nombreActuacion: 'Defaults', fechaVencimiento: '2026-12-31' });

            expect(mockTerminosService.create).toHaveBeenCalledWith(
                expect.objectContaining({ estado: 'PENDIENTE', prioridad: 'MEDIA', tipoDias: 'CALENDARIO' }),
            );
        });

        it('debe respetar estado, prioridad y tipoDias cuando vienen explícitos en el body', async () => {
            await controller.createManual({
                nombreActuacion: 'Custom',
                fechaVencimiento: '2026-12-31',
                estado: 'VENCIDO',
                prioridad: 'ALTA',
                tipoDias: 'HABILES',
            });

            expect(mockTerminosService.create).toHaveBeenCalledWith(
                expect.objectContaining({ estado: 'VENCIDO', prioridad: 'ALTA', tipoDias: 'HABILES' }),
            );
        });

        it('debe retornar el resultado de terminosService.create() sin transformarlo', async () => {
            mockTerminosService.create.mockResolvedValue({ id: 'creado-1', enteSolicitante: 'Ciudadano' });

            const result = await controller.createManual({ nombreActuacion: 'X', fechaVencimiento: '2026-12-31' });

            expect(result).toEqual({ id: 'creado-1', enteSolicitante: 'Ciudadano' });
        });
    });

    // ---------------------------------------------------------------------
    // sincronizar() / getDocumentos() / reportes / getDetalle() (passthrough)
    // ---------------------------------------------------------------------
    describe('endpoints de solo lectura/passthrough', () => {
        it('sincronizar() debe delegar directamente al servicio', async () => {
            mockTerminosService.sincronizar.mockResolvedValue({ total: 5, nuevos: 2 });

            const result = await controller.sincronizar();

            expect(result).toEqual({ total: 5, nuevos: 2 });
        });

        it('getDocumentos(id) debe delegar al servicio con el id recibido', async () => {
            await controller.getDocumentos('term-1');

            expect(mockTerminosService.getDocumentos).toHaveBeenCalledWith('term-1');
        });

        it('getReporteEficiencia() y getReporteCarga() deben delegar sin argumentos', async () => {
            await controller.getReporteEficiencia();
            await controller.getReporteCarga();

            expect(mockTerminosService.getReporteEficiencia).toHaveBeenCalledWith();
            expect(mockTerminosService.getReporteCarga).toHaveBeenCalledWith();
        });

        it('getDetalle(id) debe delegar a findOne', async () => {
            mockTerminosService.findOne.mockResolvedValue({ id: 'term-1', enteSolicitante: 'Ciudadano' });

            const result = await controller.getDetalle('term-1');

            expect(mockTerminosService.findOne).toHaveBeenCalledWith('term-1');
            expect(result.enteSolicitante).toBe('Ciudadano');
        });

        it('getDocumentosAsociados(id) debe retornar siempre un arreglo vacío (stub)', async () => {
            const result = await controller.getDocumentosAsociados('term-1');

            expect(result).toEqual([]);
        });
    });

    // ---------------------------------------------------------------------
    // getCalendario() / getListado()  — lógica de alcance por rol (esResuelveSolo)
    // ---------------------------------------------------------------------
    describe('getCalendario() — alcance de datos según el rol', () => {
        it('con rol RESUELVE_GESTION_LEGAL (esResuelveSolo=true) debe ignorar el responsableId de la query y usar userKeys propios', async () => {
            const req = { headers: { 'x-user-roles': 'RESUELVE_GESTION_LEGAL', 'x-user-id': 'user-42' } };

            await controller.getCalendario('2026-01-01', '2026-01-31', 'otro-responsable', req);

            expect(mockTerminosService.getCalendario).toHaveBeenCalledWith(
                '2026-01-01', '2026-01-31',
                { responsableId: undefined, responsableKeys: ['user-42'] },
            );
        });

        it('con rol con vista global (ej. SUPER_ADMIN) debe respetar el responsableId de la query y no forzar responsableKeys', async () => {
            const req = { headers: { 'x-user-roles': 'SUPER_ADMIN', 'x-user-id': 'user-1' } };

            await controller.getCalendario('2026-01-01', '2026-01-31', 'resp-filtrado', req);

            expect(mockTerminosService.getCalendario).toHaveBeenCalledWith(
                '2026-01-01', '2026-01-31',
                { responsableId: 'resp-filtrado', responsableKeys: undefined },
            );
        });

        it('sin ningún rol reconocido (usuario normal) debe respetar el responsableId de la query', async () => {
            const req = { headers: {} };

            await controller.getCalendario('2026-01-01', '2026-01-31', 'resp-x', req);

            expect(mockTerminosService.getCalendario).toHaveBeenCalledWith(
                '2026-01-01', '2026-01-31',
                { responsableId: 'resp-x', responsableKeys: undefined },
            );
        });
    });

    describe('getListado() — alcance de datos según el rol', () => {
        it('con esResuelveSolo=true debe ignorar responsableId y usar responsableKeys propios', async () => {
            const req = { headers: { 'x-user-roles': 'RESUELVE_GESTION_LEGAL', 'x-user-id': 'user-42' } };

            await controller.getListado('otro-responsable', req);

            expect(mockTerminosService.getSemaforoList).toHaveBeenCalledWith({ responsableId: undefined, responsableKeys: ['user-42'] });
        });

        it('sin rol de auto-restricción debe respetar el responsableId de la query', async () => {
            const req = { headers: {} };

            await controller.getListado('resp-x', req);

            expect(mockTerminosService.getSemaforoList).toHaveBeenCalledWith({ responsableId: 'resp-x', responsableKeys: undefined });
        });
    });

    // ---------------------------------------------------------------------
    // update()
    // ---------------------------------------------------------------------
    describe('update()', () => {
        it('debe convertir responsableId vacío a null antes de actualizar', async () => {
            await controller.update('term-1', { responsableId: '' });

            expect(mockTerminosService.update).toHaveBeenCalledWith('term-1', expect.objectContaining({ responsableId: null }));
        });

        it('debe convertir referenciaId vacío a null antes de actualizar', async () => {
            await controller.update('term-1', { referenciaId: '  ' });

            expect(mockTerminosService.update).toHaveBeenCalledWith('term-1', expect.objectContaining({ referenciaId: null }));
        });

        it('no debe tocar responsableId/referenciaId si no vienen en el body (quedan undefined, no forzados a null)', async () => {
            await controller.update('term-1', { enteSolicitante: 'Ciudadano' });

            const sent = mockTerminosService.update.mock.calls[0][1];
            expect('responsableId' in sent).toBe(false);
            expect('referenciaId' in sent).toBe(false);
        });

        it('debe conservar responsableId/referenciaId con valor real sin transformarlos', async () => {
            await controller.update('term-1', { responsableId: 'resp-real', referenciaId: 'ref-real' });

            expect(mockTerminosService.update).toHaveBeenCalledWith('term-1', expect.objectContaining({ responsableId: 'resp-real', referenciaId: 'ref-real' }));
        });

        it('debe permitir actualizar enteSolicitante sin transformarlo', async () => {
            await controller.update('term-1', { enteSolicitante: 'Ciudadano' });

            expect(mockTerminosService.update).toHaveBeenCalledWith('term-1', expect.objectContaining({ enteSolicitante: 'Ciudadano' }));
        });
    });

    // ---------------------------------------------------------------------
    // remove()
    // ---------------------------------------------------------------------
    describe('remove()', () => {
        it('debe delegar el borrado (lógico) al servicio', async () => {
            await controller.remove('term-1');

            expect(mockTerminosService.remove).toHaveBeenCalledWith('term-1');
        });
    });

    // ---------------------------------------------------------------------
    // exportarPDF()
    // ---------------------------------------------------------------------
    describe('exportarPDF()', () => {
        const mockResponse = () => ({ set: jest.fn(), send: jest.fn(), status: jest.fn().mockReturnThis() });

        it('en éxito debe fijar headers de PDF y enviar el buffer', async () => {
            const pdfBuffer = Buffer.from('contenido-pdf');
            mockTerminosService.generarPDF.mockResolvedValue(pdfBuffer);
            const res = mockResponse();

            await controller.exportarPDF('term-1', res as any);

            expect(res.set).toHaveBeenCalledWith(
                expect.objectContaining({ 'Content-Type': 'application/pdf', 'Content-Length': pdfBuffer.length }),
            );
            expect(res.send).toHaveBeenCalledWith(pdfBuffer);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('si el servicio falla debe responder 500 en lugar de propagar el error', async () => {
            mockTerminosService.generarPDF.mockRejectedValue(new Error('fallo generando PDF'));
            const res = mockResponse();

            await controller.exportarPDF('term-1', res as any);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith('Error al generar el documento PDF');
        });
    });

    // ---------------------------------------------------------------------
    // getNotas() / addNota()
    // ---------------------------------------------------------------------
    describe('getNotas()', () => {
        it('debe delegar al servicio pasando el LegalAccess derivado del request', async () => {
            const req = { headers: { 'x-user-id': 'user-1' } };

            await controller.getNotas('term-1', req);

            expect(mockTerminosService.getNotas).toHaveBeenCalledWith('term-1', expect.objectContaining({ userId: 'user-1' }));
        });
    });

    describe('addNota()', () => {
        it('debe preferir el userId resuelto del access sobre el usuarioId del body', async () => {
            const req = { headers: { 'x-user-id': 'user-del-token' } };

            await controller.addNota('term-1', { texto: 'Nota', usuarioId: 'user-del-body' }, req);

            expect(mockTerminosService.addNota).toHaveBeenCalledWith('term-1', 'Nota', 'Sistema', 'user-del-token');
        });

        it('debe usar el usuarioId del body si el access no resuelve ninguno', async () => {
            const req = { headers: {} };

            await controller.addNota('term-1', { texto: 'Nota', usuarioId: 'user-del-body' }, req);

            expect(mockTerminosService.addNota).toHaveBeenCalledWith('term-1', 'Nota', 'Sistema', 'user-del-body');
        });

        it('debe usar el usuario del body cuando viene, en vez del default "Sistema"', async () => {
            const req = { headers: {} };

            await controller.addNota('term-1', { texto: 'Nota', usuario: 'Ana' }, req);

            expect(mockTerminosService.addNota).toHaveBeenCalledWith('term-1', 'Nota', 'Ana', undefined);
        });
    });

    // ---------------------------------------------------------------------
    // uploadDocumento()
    // ---------------------------------------------------------------------
    describe('uploadDocumento()', () => {
        it('debe lanzar BadRequestException si no se adjunta ningún archivo', async () => {
            await expect(controller.uploadDocumento('term-1', undefined as any)).rejects.toThrow(BadRequestException);
            expect(mockTerminosService.addDocumentoLogico).not.toHaveBeenCalled();
        });

        it('debe delegar al servicio cuando sí llega un archivo', async () => {
            const file = { originalname: 'doc.pdf', filename: 'doc-123.pdf', size: 1024 } as any;

            await controller.uploadDocumento('term-1', file);

            expect(mockTerminosService.addDocumentoLogico).toHaveBeenCalledWith('term-1', file);
        });
    });
});
