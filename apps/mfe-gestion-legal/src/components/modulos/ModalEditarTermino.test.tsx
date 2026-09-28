/**
 * Formulario de edición de un informe (botón "Editar" del detalle de Términos e Informes).
 *
 * Lo que aquí se protege, más allá de "se renderizan los campos":
 *   - Se precargan desde el DETALLE del backend, no desde la fila del listado (que no trae
 *     tipoDias, prioridad, responsableId ni fechaBase).
 *   - Solo se envía lo que cambió: la presencia de `fechaVencimiento` en el PATCH es la señal
 *     con la que el backend decide rearmar y reevaluar las alertas, así que mandar el
 *     formulario entero reenviaría avisos ya enviados.
 *   - La duración del plazo y la fecha límite se mantienen sincronizadas entre sí.
 *   - El usuario ve, ANTES de guardar, si la fecha nueva cae dentro de la regla global de 3 días.
 *   - La descripción se guarda sin pisar los comentarios ni los adjuntos existentes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../../services/api/legal.service', () => ({
    legalService: {
        getTerminoDetalle: vi.fn(),
        updateTermino: vi.fn(),
        getAbogados: vi.fn(),
        listarReglasAlertaTerminos: vi.fn(),
        getConfiguration: vi.fn().mockResolvedValue(null),
        saveConfiguration: vi.fn().mockResolvedValue({}),
    },
    ocService: { syncOrganismosControl: vi.fn().mockResolvedValue({}) },
}));

vi.mock('../../services/api/expediente-config.service', () => ({
    expedienteConfigService: {
        renombrarTipoProceso: vi.fn().mockResolvedValue({}),
        recalcularPlazosPorTipoProceso: vi.fn().mockResolvedValue({ updated: 0 }),
    },
}));

import { ModalEditarTermino, construirPayloadEdicion } from './ModalEditarTermino';
import { ConfiguracionesSIGLProvider } from '../config/ConfiguracionesSIGLContext';
import { legalService } from '../../../../services/api/legal.service';
import { toast } from 'sonner';
import { SolicitudInforme } from '../core/types';

const REGLA_3_DIAS = { id: 'r-72', horasAnticipacion: 72, activa: true, descripcion: 'Alerta preventiva 3 días' };

const DIA = 24 * 60 * 60 * 1000;
/** Fecha "YYYY-MM-DD" local a N días de hoy, como la que produce un `<input type="date">`. */
function ymdEnDias(dias: number): string {
    const d = new Date(Date.now() + dias * DIA);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function detalleBackend(overrides: Record<string, any> = {}) {
    return {
        id: 'uuid-informe',
        numeroRadicado: 'TERM-2026-0001',
        nombreActuacion: 'Informe de contabilidad',
        enteSolicitante: 'Contraloría General de la República',
        destinatario: 'Contaduría General de la Nación',
        fundamentoNormativo: [{ tipo: 'Resolución', cita: 'Res. 123 de 2024', actualizacionPeriodica: false }],
        fechaBase: '2026-01-01T05:00:00.000Z',
        fechaVencimiento: '2026-02-01T04:59:59.999Z', // 31/01 en Bogotá
        diasTermino: 30,
        tipoDias: 'CALENDARIO',
        prioridad: 'MEDIA',
        responsableId: null,
        horasAnticipacionAlertaPersonalizada: null,
        observaciones: 'Descripción original',
        ...overrides,
    };
}

const solicitud = { id: 'TERM-2026-0001', asunto: 'Informe de contabilidad', metadata: { uuid: 'uuid-informe' } } as unknown as SolicitudInforme;

async function montar(onSuccess = vi.fn()) {
    render(
        <ConfiguracionesSIGLProvider>
            <ModalEditarTermino open onOpenChange={vi.fn()} solicitud={solicitud} onSuccess={onSuccess} />
        </ConfiguracionesSIGLProvider>,
    );
    await screen.findByLabelText(/Tipo de Actividad \/ Nombre/i);
    return onSuccess;
}

/** Reemplaza el contenido de un `<input type="date">` de una sola vez. */
async function escribirFecha(user: ReturnType<typeof userEvent.setup>, etiqueta: RegExp, valor: string) {
    const input = screen.getByLabelText(etiqueta) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, valor);
    return input;
}

describe('construirPayloadEdicion', () => {
    it('devuelve solo las claves que cambiaron', () => {
        const payload = construirPayloadEdicion(
            { nombreActuacion: 'A', prioridad: 'MEDIA' },
            { nombreActuacion: 'B', prioridad: 'MEDIA' },
        );

        expect(payload).toEqual({ nombreActuacion: 'B' });
    });

    it('compara por valor los campos de objeto (fuente normativa)', () => {
        const fuente = [{ tipo: 'Ley', cita: '1955' }];

        expect(construirPayloadEdicion({ fundamentoNormativo: fuente }, { fundamentoNormativo: [{ tipo: 'Ley', cita: '1955' }] })).toEqual({});
        expect(construirPayloadEdicion({ fundamentoNormativo: fuente }, { fundamentoNormativo: [{ tipo: 'Ley', cita: '2000' }] }))
            .toEqual({ fundamentoNormativo: [{ tipo: 'Ley', cita: '2000' }] });
    });

    it('detecta el paso de un valor a null (p. ej. quitar el responsable)', () => {
        expect(construirPayloadEdicion({ responsableId: 'resp-1' }, { responsableId: null })).toEqual({ responsableId: null });
    });
});

describe('ModalEditarTermino', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.mocked(legalService.getTerminoDetalle).mockResolvedValue(detalleBackend());
        vi.mocked(legalService.updateTermino).mockResolvedValue({});
        vi.mocked(legalService.getAbogados).mockResolvedValue([]);
        vi.mocked(legalService.listarReglasAlertaTerminos).mockResolvedValue([REGLA_3_DIAS]);
    });

    it('precarga los datos desde el detalle del backend, no desde la fila del listado', async () => {
        await montar();

        expect(legalService.getTerminoDetalle).toHaveBeenCalledWith('uuid-informe');
        expect(screen.getByLabelText(/Tipo de Actividad \/ Nombre/i)).toHaveValue('Informe de contabilidad');
        // El vencimiento está anclado al final del día de Bogotá (31/01 23:59 = 01/02 04:59 UTC):
        // el formulario tiene que mostrar el 31, o cada guardado correría el plazo un día.
        expect(screen.getByLabelText(/Fecha de Vencimiento/i)).toHaveValue('2026-01-31');
        expect(screen.getByLabelText(/Fecha del Término/i)).toHaveValue('2026-01-01');
        expect(screen.getByLabelText(/Duración del plazo/i)).toHaveValue(30);
    });

    it('al mover la fecha de vencimiento recalcula la duración del plazo', async () => {
        const user = userEvent.setup();
        await montar();

        await escribirFecha(user, /Fecha de Vencimiento/i, '2026-01-21');

        await waitFor(() => expect(screen.getByLabelText(/Duración del plazo/i)).toHaveValue(20));
    });

    it('al cambiar la duración del plazo recalcula la fecha de vencimiento', async () => {
        const user = userEvent.setup();
        await montar();

        const dias = screen.getByLabelText(/Duración del plazo/i);
        await user.clear(dias);
        await user.type(dias, '10');

        await waitFor(() => expect(screen.getByLabelText(/Fecha de Vencimiento/i)).toHaveValue('2026-01-11'));
    });

    it('envía solo los campos modificados (no reenvía la fecha de vencimiento si no se tocó)', async () => {
        const user = userEvent.setup();
        await montar();

        const nombre = screen.getByLabelText(/Tipo de Actividad \/ Nombre/i);
        await user.clear(nombre);
        await user.type(nombre, 'Informe de contabilidad corregido');
        await user.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

        await waitFor(() => expect(legalService.updateTermino).toHaveBeenCalled());
        const [id, payload] = vi.mocked(legalService.updateTermino).mock.calls[0];
        expect(id).toBe('uuid-informe');
        expect(payload).toEqual({ nombreActuacion: 'Informe de contabilidad corregido' });
        expect('fechaVencimiento' in (payload as any)).toBe(false);
    });

    it('al mover el plazo envía la fecha y la duración nuevas, que es lo que hace al backend rearmar las alertas', async () => {
        const user = userEvent.setup();
        await montar();

        await escribirFecha(user, /Fecha de Vencimiento/i, '2026-01-21');
        await user.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

        await waitFor(() => expect(legalService.updateTermino).toHaveBeenCalled());
        const payload = vi.mocked(legalService.updateTermino).mock.calls[0][1] as any;
        expect(payload.fechaVencimiento).toBe('2026-01-21');
        expect(payload.diasTermino).toBe(20);
    });

    it('avisa antes de guardar que la fecha nueva cae dentro de la regla global de 3 días', async () => {
        const user = userEvent.setup();
        await montar();

        await escribirFecha(user, /Fecha de Vencimiento/i, ymdEnDias(2));

        const aviso = await screen.findByTestId('previsualizacion-alertas');
        await waitFor(() => expect(aviso).toHaveTextContent(/se dispara la alerta global de/i));
        expect(aviso).toHaveTextContent('3 día(s)');
    });

    it('con una fecha lejana informa que el informe queda fuera de la ventana de alerta', async () => {
        const user = userEvent.setup();
        await montar();

        await escribirFecha(user, /Fecha de Vencimiento/i, ymdEnDias(60));

        const aviso = await screen.findByTestId('previsualizacion-alertas');
        await waitFor(() => expect(aviso).toHaveTextContent(/fuera de la ventana/i));
    });

    it('si el informe tiene anticipación personalizada, avisa que ignora las reglas globales', async () => {
        vi.mocked(legalService.getTerminoDetalle).mockResolvedValue(detalleBackend({ horasAnticipacionAlertaPersonalizada: 12 }));
        const user = userEvent.setup();
        await montar();

        await escribirFecha(user, /Fecha de Vencimiento/i, ymdEnDias(2));

        const aviso = await screen.findByTestId('previsualizacion-alertas');
        await waitFor(() => expect(aviso).toHaveTextContent(/ignora las reglas globales/i));
    });

    it('avisa cuando la fecha elegida ya pasó', async () => {
        const user = userEvent.setup();
        await montar();

        await escribirFecha(user, /Fecha de Vencimiento/i, ymdEnDias(-3));

        const aviso = await screen.findByTestId('previsualizacion-alertas');
        await waitFor(() => expect(aviso).toHaveTextContent(/ya pasó/i));
    });

    it('al guardar la descripción conserva los comentarios y los adjuntos ya registrados', async () => {
        const comentario = '[15/09/2026 10:00:00] Ana Gómez:\nSe pidió prórroga';
        const adjunto = '[ARCHIVO_ADJUNTO] informe.pdf|file-1.pdf|24.00 KB|2026-09-01T10:00:00.000Z';
        vi.mocked(legalService.getTerminoDetalle).mockResolvedValue(
            detalleBackend({ observaciones: `Descripción original\n\n---\n${comentario}\n${adjunto}` }),
        );
        const user = userEvent.setup();
        await montar();

        const descripcion = screen.getByLabelText(/Descripción \/ Observaciones/i);
        expect(descripcion).toHaveValue('Descripción original');
        await user.clear(descripcion);
        await user.type(descripcion, 'Descripción corregida');
        await user.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

        await waitFor(() => expect(legalService.updateTermino).toHaveBeenCalled());
        const payload = vi.mocked(legalService.updateTermino).mock.calls[0][1] as any;
        expect(payload.observaciones).toContain('Descripción corregida');
        expect(payload.observaciones).toContain(comentario);
        expect(payload.observaciones).toContain(adjunto);
        expect(payload.observaciones).not.toContain('Descripción original');
    });

    it('detecta el cambio de un ente solicitante escrito a mano ("Otro"), que no está en la lista paramétrica', async () => {
        // El valor libre no coincide con ningún ítem de la paramétrica, así que el formulario lo
        // reabre en el campo de texto de "Otro (especificar)". Ese campo vive en su propio estado:
        // si el diff se calculara a partir de él, el valor "anterior" sería el ya editado y el
        // cambio se perdería en silencio.
        vi.mocked(legalService.getTerminoDetalle).mockResolvedValue(
            detalleBackend({ enteSolicitante: 'Junta de acción comunal del barrio' }),
        );
        const user = userEvent.setup();
        await montar();

        const campoLibre = await screen.findByDisplayValue('Junta de acción comunal del barrio');
        await user.clear(campoLibre);
        await user.type(campoLibre, 'Veeduría ciudadana');
        await user.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

        await waitFor(() => expect(legalService.updateTermino).toHaveBeenCalled());
        expect(vi.mocked(legalService.updateTermino).mock.calls[0][1]).toEqual({ enteSolicitante: 'Veeduría ciudadana' });
    });

    it('no llama al backend si no hubo ningún cambio', async () => {
        const user = userEvent.setup();
        await montar();

        await user.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

        await waitFor(() => expect(toast.info).toHaveBeenCalledWith('No hay cambios por guardar'));
        expect(legalService.updateTermino).not.toHaveBeenCalled();
    });

    it('bloquea el guardado si se borra el nombre del informe', async () => {
        const user = userEvent.setup();
        await montar();

        await user.clear(screen.getByLabelText(/Tipo de Actividad \/ Nombre/i));

        expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeDisabled();
        expect(legalService.updateTermino).not.toHaveBeenCalled();
    });

    it('si el guardado falla, avisa del error y no cierra el formulario como si hubiera funcionado', async () => {
        vi.mocked(legalService.updateTermino).mockRejectedValue(new Error('backend caído'));
        const user = userEvent.setup();
        const onSuccess = await montar();

        const nombre = screen.getByLabelText(/Tipo de Actividad \/ Nombre/i);
        await user.clear(nombre);
        await user.type(nombre, 'Otro nombre');
        await user.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
            'No se pudo guardar la edición del informe',
            expect.anything(),
        ));
        expect(onSuccess).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
    });

    it('si no se puede cargar el detalle, lo dice en vez de mostrar un formulario vacío', async () => {
        vi.mocked(legalService.getTerminoDetalle).mockRejectedValue(new Error('404'));

        render(
            <ConfiguracionesSIGLProvider>
                <ModalEditarTermino open onOpenChange={vi.fn()} solicitud={solicitud} onSuccess={vi.fn()} />
            </ConfiguracionesSIGLProvider>,
        );

        expect(await screen.findByText(/No se pudo cargar la información del informe/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/Tipo de Actividad \/ Nombre/i)).not.toBeInTheDocument();
    });
});
