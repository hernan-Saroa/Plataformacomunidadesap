import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VistaEstadisticas } from './VistaEstadisticas';
import { contratacionService } from '../../services/contratacionService';
import { ContratoDelReporte, EstadisticasGestion } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    estadisticas: vi.fn(),
    urlEstadisticasCsv: vi.fn(),
    modalidades: vi.fn(),
    tipologias: vi.fn(),
  },
}));

const servicio = contratacionService as unknown as {
  estadisticas: ReturnType<typeof vi.fn>;
  urlEstadisticasCsv: ReturnType<typeof vi.fn>;
  modalidades: ReturnType<typeof vi.fn>;
  tipologias: ReturnType<typeof vi.fn>;
};

const REPORTE: EstadisticasGestion = {
  generadoEn: '2026-09-02T15:30:00.000Z',
  filtros: { vigencia: null, modalidad: null, tipologia: null },
  contratos: {
    total: 9,
    valorTotal: 900_000_000,
    valorInicial: 800_000_000,
    valorPromedio: 100_000_000,
    porEstado: [
      { clave: 'SUSCRITO', etiqueta: 'Suscritos', cuantos: 2, valor: 100_000_000 },
      { clave: 'EJECUCION', etiqueta: 'En ejecución', cuantos: 4, valor: 500_000_000 },
      { clave: 'TERMINADO', etiqueta: 'Terminados', cuantos: 1, valor: 100_000_000 },
      { clave: 'LIQUIDADO', etiqueta: 'Liquidados', cuantos: 1, valor: 100_000_000 },
      { clave: 'CERRADO', etiqueta: 'Cerrados', cuantos: 1, valor: 100_000_000 },
    ],
    porModalidad: [
      { clave: 'MC', etiqueta: 'Mínima cuantía', cuantos: 6, valor: 600_000_000 },
      { clave: 'SA', etiqueta: 'Selección abreviada', cuantos: 3, valor: 300_000_000 },
    ],
    porTipologia: [
      { clave: 'PS', etiqueta: 'Prestación de servicios', cuantos: 9, valor: 900_000_000 },
    ],
    porTipoPersona: [
      { clave: 'NATURAL', etiqueta: 'Persona natural', cuantos: 7, valor: 400_000_000 },
      { clave: 'JURIDICA', etiqueta: 'Persona jurídica', cuantos: 2, valor: 500_000_000 },
    ],
    porMes: [
      { clave: '2026-02', etiqueta: 'feb 2026', cuantos: 4, valor: 400_000_000 },
      { clave: '2026-03', etiqueta: 'mar 2026', cuantos: 5, valor: 500_000_000 },
    ],
    contratistasDistintos: 8,
    principalesContratistas: [
      { clave: '900', etiqueta: 'Servicios Integrales SAS', cuantos: 2, valor: 500_000_000 },
    ],
  },
  procesos: {
    total: 12,
    valorEstimado: 1_000_000_000,
    porModalidad: [],
    enCursoPorEtapa: [
      { clave: '3', etiqueta: '3. Estudios previos', cuantos: 2, valor: 20_000_000 },
    ],
    porDesenlace: [
      { clave: 'ADJUDICADO', etiqueta: 'Adjudicados', cuantos: 9, valor: 900_000_000 },
      { clave: 'DESIERTO', etiqueta: 'Declarados desiertos', cuantos: 3, valor: 30_000_000 },
    ],
  },
  presupuesto: {
    contratado: 900_000_000,
    pagado: 225_000_000,
    porPagar: 675_000_000,
    porcentajeEjecutado: 25,
    enTramite: 30_000_000,
    cuentasPorEstado: [
      { clave: 'AVALADO', etiqueta: 'Avaladas, por pagar', cuantos: 1, valor: 30_000_000 },
    ],
  },
  modificaciones: {
    total: 3,
    contratosModificados: 2,
    porTipo: [
      { clave: 'ADICION', etiqueta: 'Adiciones', cuantos: 1, valor: 100_000_000 },
      { clave: 'PRORROGA', etiqueta: 'Prórrogas', cuantos: 2, valor: 0 },
    ],
    valorAdicionado: 100_000_000,
    porcentajeAdicionado: 12.5,
    diasProrrogados: 45,
  },
  seguimiento: {
    porSituacion: [
      {
        clave: 'PLAZO_VENCIDO',
        etiqueta: 'En ejecución con el plazo vencido',
        cuantos: 1,
        valor: 50_000_000,
      },
      {
        clave: 'LIQUIDACION_VENCIDA',
        etiqueta: 'Sin liquidar y vencido el plazo de común acuerdo',
        cuantos: 0,
        valor: 0,
      },
      {
        clave: 'SIN_SUPERVISOR',
        etiqueta: 'En ejecución sin supervisor designado',
        cuantos: 0,
        valor: 0,
      },
      { clave: 'POR_VENCER', etiqueta: 'Plazo por vencer', cuantos: 1, valor: 80_000_000 },
      { clave: 'SUSPENDIDO', etiqueta: 'Suspendidos', cuantos: 0, valor: 0 },
      {
        clave: 'POR_LIQUIDAR',
        etiqueta: 'Terminados, pendientes de liquidar',
        cuantos: 1,
        valor: 100_000_000,
      },
    ],
    incumplimientosAbiertos: 1,
    contratosConIncumplimiento: 1,
    diasDeAnticipacion: 30,
  },
  tiempos: {
    radicacionASuscripcion: { promedio: 48.5, mediana: 41, muestras: 9 },
    suscripcionAInicio: { promedio: null, mediana: null, muestras: 0 },
  },
  contratosDelReporte: [
    contrato({ numero: 'CTO-VENCIDO', situaciones: ['PLAZO_VENCIDO'], diasParaVencer: -4 }),
    contrato({ numero: 'CTO-POR-VENCER', situaciones: ['POR_VENCER'], diasParaVencer: 9 }),
    contrato({ numero: 'CTO-TRANQUILO', contratista: 'Otra Firma SAS', procesoId: 'p-3' }),
  ],
  vigenciasDisponibles: [2026, 2025],
};

/** Un contrato del listado; cada prueba cambia solo lo que le importa. */
function contrato(extra: Partial<ContratoDelReporte>): ContratoDelReporte {
  return {
    procesoId: 'p-1',
    radicado: 'CTO-2026-1',
    numero: 'CTO-1',
    objeto: 'Apoyo a la gestión',
    contratista: 'Servicios Integrales SAS',
    tipoPersona: 'Persona jurídica',
    modalidad: 'Mínima cuantía',
    tipologia: 'Prestación de servicios',
    estado: 'EJECUCION',
    estadoCiclo: 'EJECUCION',
    valor: 80_000_000,
    valorInicial: 80_000_000,
    pagado: 40_000_000,
    porcentajePagado: 50,
    suscritoEl: '2026-02-10',
    inicioEl: '2026-02-15',
    plazoDias: 180,
    finDelPlazo: '2026-08-13',
    diasParaVencer: null,
    modificaciones: 0,
    supervisor: 'Supervisora',
    situaciones: [],
    ...extra,
  };
}


describe('VistaEstadisticas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.estadisticas.mockResolvedValue(REPORTE);
    servicio.urlEstadisticasCsv.mockReturnValue('/hiring/api/v1/estadisticas/csv');
    servicio.modalidades.mockResolvedValue([
      { codigo: 'MC', nombre: 'Mínima cuantía' },
      { codigo: 'SA', nombre: 'Selección abreviada' },
    ]);
    servicio.tipologias.mockResolvedValue([
      { codigo: 'PS', nombre: 'Prestación de servicios (catálogo)' },
    ]);
  });

  /** El criterio de aceptación: estadísticas por los cinco estados. */
  it('muestra una tarjeta por cada estado del ciclo', async () => {
    render(<VistaEstadisticas />);

    for (const etiqueta of [
      'Suscritos',
      'En ejecución',
      'Terminados',
      'Liquidados',
      'Cerrados',
    ]) {
      // También sale en el listado de contratos, en singular o igual.
      expect((await screen.findAllByText(etiqueta)).length).toBeGreaterThan(0);
    }
  });

  it('informa la ejecución presupuestal', async () => {
    render(<VistaEstadisticas />);

    expect(await screen.findByText('Ejecución presupuestal')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();

    const barra = screen.getByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '25');
  });

  it('desglosa por modalidad y por tipología', async () => {
    render(<VistaEstadisticas />);

    expect(await screen.findByText('Por modalidad de selección')).toBeInTheDocument();
    expect(screen.getByText('Por tipología de contrato')).toBeInTheDocument();
    expect(screen.getAllByText('Prestación de servicios').length).toBeGreaterThan(0);

    // «Selección abreviada» sale dos veces —en la barra y en el selector—, así
    // que se busca la barra por su cifra, que el selector no tiene.
    expect(screen.getByText(/3 · \$ 300 M/)).toBeInTheDocument();
  });

  it('cuenta los procesos desiertos, que también son gestión', async () => {
    render(<VistaEstadisticas />);
    expect(await screen.findByText('Declarados desiertos')).toBeInTheDocument();
  });

  it('vuelve a consultar al cambiar la vigencia', async () => {
    render(<VistaEstadisticas />);
    await screen.findByText('Suscritos');

    await userEvent.selectOptions(screen.getByLabelText('Vigencia'), '2025');

    await waitFor(() =>
      expect(servicio.estadisticas).toHaveBeenCalledWith({
        vigencia: 2025,
        modalidad: null,
        tipologia: null,
      }),
    );
  });

  it('solo ofrece las vigencias en que hay contratos', async () => {
    render(<VistaEstadisticas />);
    await screen.findByText('Suscritos');

    const opciones = Array.from(
      (screen.getByLabelText('Vigencia') as HTMLSelectElement).options,
    ).map((o) => o.textContent);

    expect(opciones).toEqual(['Todas', '2026', '2025']);
  });

  it('la descarga es un enlace, para que el navegador nombre el archivo', async () => {
    render(<VistaEstadisticas />);

    const enlace = await screen.findByRole('link', { name: /Descargar CSV/ });
    expect(enlace).toHaveAttribute('href', '/hiring/api/v1/estadisticas/csv');
  });

  it('la descarga arrastra los filtros de la pantalla', async () => {
    render(<VistaEstadisticas />);
    await screen.findByText('Suscritos');

    await userEvent.selectOptions(screen.getByLabelText('Modalidad'), 'SA');

    await waitFor(() =>
      expect(servicio.urlEstadisticasCsv).toHaveBeenCalledWith({
        vigencia: null,
        modalidad: 'SA',
        tipologia: null,
      }),
    );
  });

  it('sin contratos lo dice, en vez de enseñar ceros', async () => {
    servicio.estadisticas.mockResolvedValue({
      ...REPORTE,
      contratos: { ...REPORTE.contratos, total: 0, valorTotal: 0, porEstado: [] },
    });

    render(<VistaEstadisticas />);
    expect(await screen.findByText('Sin contratos que informar')).toBeInTheDocument();
  });

  it('si la consulta falla lo muestra y no se queda cargando', async () => {
    servicio.estadisticas.mockRejectedValue(new Error('No se pudo generar el reporte'));

    render(<VistaEstadisticas />);
    expect(await screen.findByText('No se pudo generar el reporte')).toBeInTheDocument();
  });

  it('si el catálogo de modalidades falla, el reporte se ve igual', async () => {
    // Es un selector, no un requisito: sin él se consultan todas.
    servicio.modalidades.mockRejectedValue(new Error('catálogo caído'));

    render(<VistaEstadisticas />);
    expect(await screen.findByText('Suscritos')).toBeInTheDocument();
  });

  it('filtra por tipología y lo pasa a la consulta y a la descarga', async () => {
    render(<VistaEstadisticas />);
    await screen.findByText('Suscritos');

    await userEvent.selectOptions(screen.getByLabelText('Tipología'), 'PS');

    await waitFor(() =>
      expect(servicio.estadisticas).toHaveBeenLastCalledWith({
        vigencia: null,
        modalidad: null,
        tipologia: 'PS',
      }),
    );
    expect(servicio.urlEstadisticasCsv).toHaveBeenLastCalledWith({
      vigencia: null,
      modalidad: null,
      tipologia: 'PS',
    });
  });

  it('quitar filtros vuelve a toda la contratación', async () => {
    render(<VistaEstadisticas />);
    await screen.findByText('Suscritos');
    expect(screen.queryByRole('button', { name: /Quitar filtros/ })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Vigencia'), '2025');
    await userEvent.click(await screen.findByRole('button', { name: /Quitar filtros/ }));

    await waitFor(() =>
      expect(servicio.estadisticas).toHaveBeenLastCalledWith({
        vigencia: null,
        modalidad: null,
        tipologia: null,
      }),
    );
  });

  it('muestra las cifras de cabecera', async () => {
    render(<VistaEstadisticas />);

    expect(await screen.findByText('Contratos suscritos')).toBeInTheDocument();
    expect(screen.getByText('Contratistas distintos')).toBeInTheDocument();
    expect(screen.getByText('Valor inicial $ 800 M')).toBeInTheDocument();
  });

  it('señala los contratos que requieren atención y lleva al listado filtrado', async () => {
    render(<VistaEstadisticas />);
    expect(await screen.findByText('Contratos que requieren atención')).toBeInTheDocument();
    expect(screen.getByText('CTO-TRANQUILO')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /En ejecución con el plazo vencido/ }),
    );

    expect(screen.getByText('CTO-VENCIDO')).toBeInTheDocument();
    expect(screen.queryByText('CTO-TRANQUILO')).not.toBeInTheDocument();
    expect(screen.getByText('Hace 4 días')).toBeInTheDocument();
  });

  it('del incumplimiento solo dice cuántos, sin detalle', async () => {
    render(<VistaEstadisticas />);
    expect(
      await screen.findByText(/1 caso de presunto incumplimiento sin cerrar/),
    ).toBeInTheDocument();
  });

  it('busca en el listado por contratista', async () => {
    render(<VistaEstadisticas />);
    await screen.findByText('Listado de contratos');

    await userEvent.type(screen.getByLabelText('Buscar contrato'), 'otra firma');

    expect(screen.getByText('CTO-TRANQUILO')).toBeInTheDocument();
    expect(screen.queryByText('CTO-VENCIDO')).not.toBeInTheDocument();
    expect(screen.getByText(/1 de 3 contratos/)).toBeInTheDocument();
  });

  it('una fila del listado abre su proceso', async () => {
    const onAbrir = vi.fn();
    render(<VistaEstadisticas onAbrir={onAbrir} />);

    await userEvent.click(await screen.findByText('CTO-TRANQUILO'));
    expect(onAbrir).toHaveBeenCalledWith('p-3');
  });

  it('informa modificaciones, cuentas de cobro, tiempos y el embudo de procesos', async () => {
    render(<VistaEstadisticas />);

    expect(await screen.findByText('Modificaciones contractuales')).toBeInTheDocument();
    expect(screen.getByText('12.5% sobre el valor inicial')).toBeInTheDocument();
    expect(screen.getByText('Cuentas de cobro')).toBeInTheDocument();
    expect(screen.getByText('Avaladas, por pagar')).toBeInTheDocument();
    expect(screen.getByText('Tiempos del ciclo')).toBeInTheDocument();
    expect(screen.getByText('Sin contratos para medirlo')).toBeInTheDocument();
    expect(screen.getByText('3. Estudios previos')).toBeInTheDocument();
    expect(screen.getByText('Contratos suscritos por mes')).toBeInTheDocument();
  });

  it('sin contratos sigue mostrando los procesos de selección', async () => {
    servicio.estadisticas.mockResolvedValue({
      ...REPORTE,
      contratos: { ...REPORTE.contratos, total: 0, valorTotal: 0, porEstado: [] },
      contratosDelReporte: [],
    });

    render(<VistaEstadisticas />);
    expect(await screen.findByText('Sin contratos que informar')).toBeInTheDocument();
    // Un año sin firmas puede tener procesos en curso o desiertos: también es gestión.
    expect(screen.getByText('Declarados desiertos')).toBeInTheDocument();
  });
});
