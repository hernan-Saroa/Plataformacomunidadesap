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
    sugerenciaModalidad: vi.fn(),
    // Desde la migración 097 el proceso nace de una línea del PAA.
    paa: {
      opcionesDeCreacion: vi.fn(),
      buscarLineas: vi.fn(),
      linea: vi.fn(),
    },
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
  paa: {
    opcionesDeCreacion: ReturnType<typeof vi.fn>;
    buscarLineas: ReturnType<typeof vi.fn>;
    linea: ReturnType<typeof vi.fn>;
  };
};

const MODALIDADES = [
  { codigo: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía', orden: 90 },
  { codigo: 'LICITACION_PUBLICA', nombre: 'Licitación Pública', orden: 10 },
];

const VIGENTE = { id: 'v-2026', anio: 2026, versionId: 'ver-31', versionNumero: 31 };
const SEDE = {
  id: 'r-sede', documentoId: 'd-sede', codigo: 'SEDE_CENTRAL', nombre: 'Sede Central', prefijoLinea: 'LINEA',
  unidadContratacion: 'Contratación', activa: true, documento: 'Sede Central y Chocó', vigente: VIGENTE, motivo: null,
};
const CHOCO = {
  id: 'r-choco', documentoId: 'd-sede', codigo: 'CHOCO', nombre: 'Territorial Chocó', prefijoLinea: 'CHOCO',
  unidadContratacion: 'Territorial Choco', activa: true, documento: 'Sede Central y Chocó', vigente: VIGENTE, motivo: null,
};
const META_SIN_PAA = {
  id: 'r-meta', documentoId: 'd-meta', codigo: 'META', nombre: 'Territorial Meta', prefijoLinea: 'META',
  unidadContratacion: 'Territorial Meta', activa: true, documento: 'Territorial Meta', vigente: null,
  motivo: 'Territorial Meta no tiene un PAA vigente con una versión activa.',
};

const busqueda = (lineas: object[]) => ({
  vigencia: { id: 'v-2026', anio: 2026 },
  version: { id: 'ver-31', numero: 31 },
  total: lineas.length,
  pagina: 1,
  porPagina: 50,
  lineas,
});

const LINEA_1 = {
  id: 'l-1',
  codigo: 'LINEA 1',
  objeto: 'Soporte técnico en sitio',
  modalidad: 'Contratación directa',
  valorTotal: 78852000,
  enUso: null,
};

const DETALLE_LINEA_1 = {
  id: 'l-1',
  codigo: 'LINEA 1',
  region: { id: 'r-sede', nombre: 'Sede Central' },
  vigencia: { id: 'v-2026', anio: 2026, vigente: true },
  version: { id: 'ver-31', numero: 31, estado: 'ACTIVA' },
  campos: [
    { clave: 'objeto', etiqueta: 'Objeto', valor: 'Soporte técnico en sitio' },
    { clave: 'valor_total', etiqueta: 'Valor total estimado', valor: 78852000 },
  ],
  enUso: null,
};

/**
 * Crear un proceso desde el Plan Anual de Adquisiciones (migración 097).
 *
 * El objeto, la modalidad y el valor ya no se teclean: se elige la región, se
 * busca la línea y se confirma lo que trae.
 */
describe('VistaProcesos · crear desde el PAA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.listarProcesos.mockResolvedValue([]);
    servicio.paa.opcionesDeCreacion.mockResolvedValue({
      regiones: [SEDE, CHOCO, META_SIN_PAA],
      listo: true,
      motivo: null,
    });
    servicio.paa.buscarLineas.mockResolvedValue(busqueda([LINEA_1]));
    servicio.paa.linea.mockResolvedValue(DETALLE_LINEA_1);
  });

  const abrir = async (onAbrir = vi.fn()) => {
    render(<VistaProcesos onAbrir={onAbrir} />);
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo proceso|Nuevo/ }));
    return onAbrir;
  };

  it('dice por qué no se puede crear si no hay un PAA vigente', async () => {
    servicio.paa.opcionesDeCreacion.mockResolvedValue({
      regiones: [{ ...SEDE, vigente: null }],
      listo: false,
      motivo: 'No hay un Plan Anual de Adquisiciones vigente con una versión activa.',
    });
    await abrir();

    expect(await screen.findByRole('alert')).toHaveTextContent(/No hay un Plan Anual de Adquisiciones vigente/);
  });

  it('busca solo en la región elegida', async () => {
    await abrir();
    await userEvent.click(await screen.findByRole('radio', { name: /Territorial Chocó/ }));

    await waitFor(() => expect(servicio.paa.buscarLineas).toHaveBeenCalledWith('r-choco', ''));
  });

  it('no deja elegir la región cuyo territorio no tiene PAA vigente, y dice por qué', async () => {
    await abrir();
    expect(await screen.findByRole('radio', { name: /Territorial Meta/ })).toBeDisabled();
    expect(screen.getByText('Territorial Meta no tiene un PAA vigente con una versión activa.')).toBeInTheDocument();
  });

  it('muestra lo que trae la línea y crea el proceso con ella', async () => {
    servicio.crearProceso.mockResolvedValue({ id: 'proc-1', radicado: 'CTO-2026-0100' });
    const onAbrir = await abrir();
    await userEvent.click(await screen.findByRole('radio', { name: /Sede Central/ }));
    await userEvent.click(await screen.findByRole('button', { name: /LINEA 1/ }));

    expect(await screen.findByText('$ 78.852.000')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Crear y abrir/ }));

    await waitFor(() => expect(servicio.crearProceso).toHaveBeenCalledWith('l-1'));
    expect(onAbrir).toHaveBeenCalledWith('proc-1', '3.1');
  });

  it('no deja crear con una línea que ya tiene proceso', async () => {
    servicio.paa.linea.mockResolvedValue({
      ...DETALLE_LINEA_1,
      enUso: { procesoId: 'p-9', radicado: 'CTO-2026-0009' },
    });
    await abrir();
    await userEvent.click(await screen.findByRole('radio', { name: /Sede Central/ }));
    await userEvent.click(await screen.findByRole('button', { name: /LINEA 1/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/CTO-2026-0009/);
    expect(screen.getByRole('button', { name: /Crear y abrir/ })).toBeDisabled();
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
