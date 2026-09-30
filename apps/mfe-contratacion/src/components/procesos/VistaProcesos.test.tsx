import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VistaProcesos } from './VistaProcesos';
import { contratacionService } from '../../services/contratacionService';
import { fijarAlcance, olvidarAlcance } from '../../auth/alcance';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    listarProcesos: vi.fn(),
    modalidades: vi.fn(),
    crearProceso: vi.fn(),
    // Desde EFDS-1147 el formulario consulta la modalidad que corresponde a la
    // cuantía mientras se digita el valor.
    sugerenciaModalidad: vi.fn(),
    // Quién responde por cada punto: la fila dice a quién le toca.
    responsables: vi.fn(async () => []),
    // El semáforo de cada fila.
    plazos: vi.fn(async () => []),
  },
}));

const servicio = contratacionService as unknown as {
  plazos: ReturnType<typeof vi.fn>;
  listarProcesos: ReturnType<typeof vi.fn>;
  modalidades: ReturnType<typeof vi.fn>;
  crearProceso: ReturnType<typeof vi.fn>;
  sugerenciaModalidad: ReturnType<typeof vi.fn>;
};

const MODALIDADES = [
  { codigo: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía', orden: 90 },
  { codigo: 'LICITACION_PUBLICA', nombre: 'Licitación Pública', orden: 10 },
];

/**
 * La modalidad decide qué actividades recorre el proceso, así que es
 * obligatoria al crearlo. Eso hace que un fallo al cargar el catálogo deje al
 * usuario sin poder avanzar: la primera versión respondía al error con un
 * `setModalidades([])`, y el desplegable quedaba vacío sin decir por qué.
 */
describe('VistaProcesos · selector de modalidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.listarProcesos.mockResolvedValue([]);
    servicio.sugerenciaModalidad.mockResolvedValue({ modalidad: null, forzosa: false });
  });

  const abrirModal = async () => {
    render(<VistaProcesos onAbrir={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo proceso|Nuevo/ }));
  };

  it('ofrece las modalidades que devuelve el backend', async () => {
    servicio.modalidades.mockResolvedValue(MODALIDADES);
    await abrirModal();

    expect(await screen.findByRole('option', { name: 'Mínima Cuantía' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Licitación Pública' })).toBeInTheDocument();
  });

  it('explica el fallo en vez de mostrar un desplegable vacío', async () => {
    // Este era el sintoma del 500 que devolvia el endpoint: sin mensaje, el
    // usuario no tenia forma de saber por que no podia crear el proceso.
    servicio.modalidades.mockRejectedValue(new Error('Error 500'));
    await abrirModal();

    expect(await screen.findByRole('alert')).toHaveTextContent('Error 500');
  });

  it('avisa cuando el catálogo llega vacío', async () => {
    // Un catálogo vacío no es un error de red, pero deja igual de bloqueado.
    servicio.modalidades.mockResolvedValue([]);
    await abrirModal();

    expect(await screen.findByRole('alert')).toHaveTextContent(/No hay modalidades configuradas/);
  });

  it('deshabilita el selector cuando no hay nada que elegir', async () => {
    servicio.modalidades.mockResolvedValue([]);
    await abrirModal();

    await waitFor(() => expect(screen.getByLabelText(/Modalidad/)).toBeDisabled());
  });

  it('no deja crear el proceso sin modalidad', async () => {
    servicio.modalidades.mockResolvedValue(MODALIDADES);
    await abrirModal();

    await userEvent.type(screen.getByLabelText(/Objeto a contratar/), 'Adquisición de equipos');

    // Con objeto pero sin modalidad el boton sigue bloqueado: sin ella el
    // backend no puede instanciar las actividades del proceso.
    expect(screen.getByRole('button', { name: /Crear y abrir/ })).toBeDisabled();
  });

  it('envía la modalidad elegida junto al objeto y la cuantía', async () => {
    servicio.modalidades.mockResolvedValue(MODALIDADES);
    servicio.crearProceso.mockResolvedValue({ id: 'proc-1' });
    await abrirModal();

    await userEvent.type(screen.getByLabelText(/Objeto a contratar/), 'Adquisición de equipos');
    // El valor estimado se pide al crear desde EFDS-1147: de él depende la
    // modalidad aplicable, así que el proceso no puede nacer sin él.
    await userEvent.type(screen.getByLabelText(/Valor estimado/), '1000000');
    await userEvent.selectOptions(screen.getByLabelText(/Modalidad/), 'MINIMA_CUANTIA');
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));

    await waitFor(() =>
      expect(servicio.crearProceso).toHaveBeenCalledWith(
        'Adquisición de equipos',
        'MINIMA_CUANTIA',
        1000000,
      ),
    );
  });
});

/**
 * La bandeja en el listado (EFDS-1183).
 *
 * El reparto es por bandeja compartida: quien llega primero se queda con el
 * proceso. Para que eso funcione la lista tiene que distinguir un proceso que
 * alguien lleva de uno que llegó a la Dirección y nadie ha recibido — si los
 * dos se ven igual, el segundo se queda ahí semanas.
 */
describe('VistaProcesos · la bandeja', () => {
  const proceso = (participacion: unknown) => ({
    id: 'p-1',
    radicado: 'CTO-2026-0014',
    objeto: 'Servicio de vigilancia para la sede central',
    modalidad: 'MINIMA_CUANTIA',
    modalidadNombre: 'Mínima Cuantía',
    valorEstimado: 30000000,
    etapa: 3,
    fechaRadicacion: '2026-09-09T00:00:00.000Z',
    estudioPrevio: null,
    actividades: [],
    participacion,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    servicio.modalidades.mockResolvedValue(MODALIDADES);
    servicio.sugerenciaModalidad.mockResolvedValue({ modalidad: null, forzosa: false });
  });

  it('señala los que llegaron y nadie ha recibido', async () => {
    servicio.listarProcesos.mockResolvedValue([
      proceso({ contratacion: null, abogado: null, enBandeja: true }),
    ]);

    render(<VistaProcesos onAbrir={vi.fn()} />);

    expect(await screen.findByText(/En bandeja · sin recibir/)).toBeInTheDocument();
  });

  it('en los recibidos dice quién los lleva y quién los revisa', async () => {
    servicio.listarProcesos.mockResolvedValue([
      proceso({
        contratacion: { nombre: 'Laura Pineda', usuarioNombre: 'laura@esap', esMio: true },
        abogado: { nombre: 'Andrés Rojas', usuarioNombre: 'andres@esap', esMio: false },
        enBandeja: false,
      }),
    ]);

    render(<VistaProcesos onAbrir={vi.fn()} />);

    expect(await screen.findByText(/Laura Pineda \(tú\)/)).toBeInTheDocument();
    expect(screen.getByText(/revisa Andrés Rojas/)).toBeInTheDocument();
  });

  it('avisa cuando un proceso recibido se quedó sin abogado', async () => {
    // Es el estado que nadie pide pero ocurre: quitar sin poner otro. Mientras
    // dure, la 3.4 no la puede resolver nadie.
    servicio.listarProcesos.mockResolvedValue([
      proceso({
        contratacion: { nombre: 'Laura Pineda', usuarioNombre: 'laura@esap', esMio: false },
        abogado: null,
        enBandeja: false,
      }),
    ]);

    render(<VistaProcesos onAbrir={vi.fn()} />);

    expect(await screen.findByText(/sin abogado/)).toBeInTheDocument();
  });
});

/**
 * Qué botones ve cada rol (EFDS-1183).
 *
 * El menú lateral ya se filtraba por permisos, pero los botones de acción no:
 * a un ente de control —que solo consulta— se le ofrecía «Nuevo proceso», y al
 * pulsarlo recibía un 403 que no puede interpretar.
 */
describe('VistaProcesos · acciones según el alcance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    olvidarAlcance();
    servicio.listarProcesos.mockResolvedValue([]);
    servicio.modalidades.mockResolvedValue(MODALIDADES);
  });

  // Radicar es empezar el estudio previo: quien edita la 3.1 (migración 083).
  const quienRadica = () =>
    fijarAlcance({ alcances: [{ accion: 'editar', lugar: '3.1' }], transversales: [] });
  const quienSoloConsulta = () =>
    fijarAlcance({ alcances: [{ accion: 'ver', lugar: 'TODO' }], transversales: [] });

  it('ofrece crear a quien radica', async () => {
    quienRadica();
    render(<VistaProcesos onAbrir={vi.fn()} />);

    expect(await screen.findByRole('button', { name: /Nuevo proceso/ })).toBeInTheDocument();
  });

  it('no se lo ofrece a quien solo consulta', async () => {
    quienSoloConsulta();
    render(<VistaProcesos onAbrir={vi.fn()} />);

    await waitFor(() => expect(servicio.listarProcesos).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Nuevo proceso/ })).toBeNull();
  });

  it('a quien solo consulta le explica el vacío sin pedirle que cree', async () => {
    // «Crea el primero» sobre una lista vacía es una instrucción que ese rol
    // no puede seguir.
    quienSoloConsulta();
    render(<VistaProcesos onAbrir={vi.fn()} />);

    expect(await screen.findByText(/cuando haya alguno radicado/)).toBeInTheDocument();
  });

  it('mientras el alcance no llega no esconde nada', async () => {
    render(<VistaProcesos onAbrir={vi.fn()} />);

    expect(await screen.findByRole('button', { name: /Nuevo proceso/ })).toBeInTheDocument();
  });
});

/**
 * La fila dice en qué momento está el proceso y a quién le toca.
 *
 * Antes el estado era el del estudio previo: un contrato en la etapa 4 seguía
 * diciendo «Aprobado», y el botón ofrecía «Revisar» también a quien no podía
 * decidir nada.
 */
describe('VistaProcesos · a quién le toca', () => {
  const proceso = (cambios: Record<string, unknown>) => ({
    id: 'p-1',
    radicado: 'CTO-2026-0020',
    objeto: 'Mantenimiento de ascensores',
    modalidad: 'MINIMA_CUANTIA',
    etapa: 3,
    fechaRadicacion: '2026-09-09T00:00:00.000Z',
    estudioPrevio: null,
    actividades: [],
    participacion: { contratacion: null, abogado: null, enBandeja: false },
    ...cambios,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    olvidarAlcance();
    servicio.modalidades.mockResolvedValue(MODALIDADES);
  });

  it('al abogado del proceso le dice que le toca revisar', async () => {
    servicio.listarProcesos.mockResolvedValue([
      proceso({
        estudioPrevio: { estado: 'EN_REVISION', version: 1, camposFaltantes: 0, camposObligatorios: 5, actualizadoEn: '2026-09-20' },
        participacion: {
          contratacion: { nombre: 'Laura Pineda', usuarioNombre: 'laura@esap', esMio: false },
          abogado: { nombre: 'Andrés Rojas', usuarioNombre: 'andres@esap', esMio: true },
          enBandeja: false,
        },
      }),
    ]);

    render(<VistaProcesos onAbrir={vi.fn()} />);

    expect((await screen.findAllByText(/Te toca: Revisión del estudio previo/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Revisar/ })).toBeInTheDocument();
  });

  it('pasado el estudio previo, dice qué sigue y a quién le toca', async () => {
    const actividad = (numeral: string, estado: string, nombre: string) => ({
      numeral,
      estado,
      nombre,
      etapa: Number.parseInt(numeral, 10),
    });
    servicio.listarProcesos.mockResolvedValue([
      proceso({
        estudioPrevio: { estado: 'APROBADO', version: 2, camposFaltantes: 0, camposObligatorios: 5, actualizadoEn: '2026-09-20' },
        actividades: [
          actividad('3.1', 'APROBADO', 'Estudio previo'),
          actividad('3.3', 'APROBADO', 'Radicación'),
          {
            ...actividad('4.2', 'BORRADOR', 'Verificar disponibilidad presupuestal'),
            // Lo que manda el backend: de la 4.2 responde la Financiera que la tomó.
            responde: { papel: 'FINANCIERA', accion: 'editar', seToma: true, soloEnRevision: false },
          },
        ],
        participacion: {
          contratacion: { nombre: 'Laura Pineda', usuarioNombre: 'laura@esap', esMio: false },
          abogado: { nombre: 'Andrés Rojas', usuarioNombre: 'andres@esap', esMio: false },
          financiera: { nombre: 'Marta Presupuesto', usuarioNombre: 'marta@esap', esMio: false },
          enBandeja: false,
        },
      }),
    ]);

    render(<VistaProcesos onAbrir={vi.fn()} />);

    expect(
      (await screen.findAllByText(/Verificar disponibilidad presupuestal · Marta Presupuesto/)).length,
    ).toBeGreaterThan(0);
    // No le toca nada a quien mira: se consulta, no se «revisa».
    expect(screen.getByRole('button', { name: /Consultar/ })).toBeInTheDocument();
  });
});

describe('VistaProcesos · semáforo de plazos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.modalidades.mockResolvedValue(MODALIDADES);
  });

  it('marca el plazo vencido en la fila del proceso', async () => {
    servicio.listarProcesos.mockResolvedValue([
      {
        id: 'p-9',
        radicado: 'CTO-2026-0099',
        objeto: 'Aseo',
        etapa: 4,
        fechaRadicacion: '2026-09-01T00:00:00.000Z',
        estudioPrevio: null,
        actividades: [],
      },
    ]);
    servicio.plazos.mockResolvedValue([
      {
        procesoId: 'p-9',
        radicado: 'CTO-2026-0099',
        numeral: '4.2',
        nombre: 'Verificar disponibilidad presupuestal',
        vence: '2026-09-25',
        restantes: -2,
        estado: 'VENCIDO',
      },
    ]);

    render(<VistaProcesos onAbrir={vi.fn()} />);

    expect((await screen.findAllByText(/4\.2 · venció hace 2 días hábiles/)).length).toBeGreaterThan(0);
  });
});
