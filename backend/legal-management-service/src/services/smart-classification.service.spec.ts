import { Test, TestingModule } from '@nestjs/testing';
import { SmartClassificationService } from './smart-classification.service';

describe('SmartClassificationService', () => {
    let service: SmartClassificationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SmartClassificationService],
        }).compile();

        service = module.get<SmartClassificationService>(SmartClassificationService);
    });

    describe('classify() — Capa 1: heurística (diccionario)', () => {
        it('clasifica como CORREO (Buzón General) si hay palabras "blandas" (invitaciones, boletines)', async () => {
            const result = await service.classify('Invitación al Webinar de Contratación', 'Los esperamos en este evento', false);

            expect(result).toEqual(expect.objectContaining({ category: 'CORREO', module: 'Buzón General', method: 'HEURISTIC' }));
        });

        it('clasifica como JUDICIAL cuando el asunto tiene términos de juzgados', async () => {
            const result = await service.classify('Fallo de Tutela No. 123', 'El Juzgado Primero notifica sentencia', false);

            expect(result).toEqual(expect.objectContaining({ category: 'JUDICIAL', module: 'MOD-01: Defensa Judicial', method: 'HEURISTIC' }));
        });

        it('clasifica como OFICIO cuando hay keyword fuerte + adjuntos, aunque no haya remitente institucional', async () => {
            const result = await service.classify('Pliego de Cargos', 'Se anexa el pliego de cargos formulado', true);

            expect(result).toEqual(expect.objectContaining({ category: 'OFICIO', method: 'HEURISTIC' }));
        });

        it('NO clasifica como OFICIO si la keyword es débil y no hay remitente institucional (cae a Bayesiano/DEFAULT)', async () => {
            const result = await service.classify('Solicitud de Información', 'Por favor enviar documentos', true);

            expect(result.category).not.toBe('OFICIO');
        });

        describe('CONSULTA — Asesoría Jurídica (agregado: antes solo vivía en la capa Bayesiana, nunca alcanzable)', () => {
            it('clasifica como CONSULTA cuando el asunto pide un concepto/consulta jurídica', async () => {
                const result = await service.classify('Solicitud de Concepto Jurídico', 'Se requiere concepto sobre el contrato X', false);

                expect(result).toEqual(expect.objectContaining({
                    category: 'CONSULTA',
                    module: 'MOD-03: Asesoría Jurídica',
                    method: 'HEURISTIC',
                }));
            });

            it('reconoce "asesoría jurídica" sin tilde y en minúsculas', async () => {
                const result = await service.classify('asesoria juridica requerida', 'Necesitamos acompañamiento jurídico para el proceso', false);

                expect(result.category).toBe('CONSULTA');
                expect(result.module).toBe('MOD-03: Asesoría Jurídica');
            });

            it('no depende de adjuntos ni de remitente institucional (a diferencia de OFICIO)', async () => {
                const result = await service.classify('Duda jurídica sobre vacaciones', 'Consulta interna de un funcionario', false);

                expect(result.category).toBe('CONSULTA');
            });

            it('JUDICIAL sigue teniendo prioridad sobre CONSULTA si el correo menciona ambos', async () => {
                const result = await service.classify('Solicitud de concepto jurídico sobre fallo del Juzgado', 'Detalles de la sentencia', false);

                expect(result.category).toBe('JUDICIAL');
            });
        });
    });

    describe('classify() — Capa 2: Bayesiano (fallback cuando la heurística no matchea)', () => {
        it('sin modelo entrenado (cold start), cae a DEFAULT en vez de fallar', async () => {
            const result = await service.classify('Actualización de inventario', 'Reporte mensual de indicadores del área', false);

            expect(result).toEqual(expect.objectContaining({ category: 'CORREO', module: 'Buzón General', confidence: 0, method: 'DEFAULT' }));
        });

        it('classify() nunca devuelve null/undefined (siempre hay moduloSugerido)', async () => {
            const result = await service.classify('', '', false);

            expect(result).toBeTruthy();
            expect(result.module).toBeTruthy();
        });
    });

    describe('train() + reclasificación', () => {
        it('después de entrenar con ejemplos, el Bayesiano puede clasificar sin caer en DEFAULT', async () => {
            // No debe tocar disco real durante el test (ml_models/classifier.json es un archivo versionado).
            jest.spyOn(service as any, 'saveModel').mockResolvedValue(undefined);

            await service.train('actualizacion inventario equipos oficina', 'CORREO');
            await service.train('reporte mensual indicadores area', 'CORREO');
            await service.train('propuesta mejora proceso interno', 'CORREO');

            const result = await service.classify('reporte indicadores area', 'actualizacion inventario', false);

            expect(result.method).toBe('BAYESIAN');
        });
    });

    describe('resolveModuleForCategory() — usado tanto por el Bayesiano como por la corrección manual', () => {
        it('mapea JUDICIAL, CORREO y CONSULTA a sus módulos fijos', () => {
            expect(service.resolveModuleForCategory('JUDICIAL', '', '')).toBe('MOD-01: Defensa Judicial');
            expect(service.resolveModuleForCategory('CORREO', '', '')).toBe('Buzón General');
            expect(service.resolveModuleForCategory('CONSULTA', '', '')).toBe('MOD-03: Asesoría Jurídica');
        });

        it('para OFICIO, usa las entidades del texto para elegir entre Defensa Judicial y Juzgamiento Disciplinario', () => {
            expect(service.resolveModuleForCategory('OFICIO', 'Pliego de cargos', 'Investigado: Juan Pérez, queja disciplinaria'))
                .toBe('MOD-02: Juzgamiento Disciplinario');
            expect(service.resolveModuleForCategory('OFICIO', 'Traslado procesal', 'Demanda ante el Tribunal'))
                .toBe('MOD-01: Defensa Judicial');
        });

        it('categoría desconocida cae a Buzón General en vez de romper', () => {
            expect(service.resolveModuleForCategory('ALGO_RARO', '', '')).toBe('Buzón General');
        });
    });

    describe('analyzeUrgency()', () => {
        it('marca urgente si el contenido tiene palabras clave de urgencia', () => {
            expect(service.analyzeUrgency('URGENTE: respuesta requerida', 'Término perentorio de 3 días')).toBe(true);
        });

        it('no marca urgente un correo normal', () => {
            expect(service.analyzeUrgency('Buenos días', 'Adjunto el informe mensual')).toBe(false);
        });
    });
});
