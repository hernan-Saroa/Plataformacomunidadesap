import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ItinerarioBuilder, { generarOpcionesHorarioMilitar } from './ItinerarioBuilder';
import { RutaItinerario, Geopolitica } from '../types/viaticos';
import { formatearHorarioMilitarCon12h } from '../utils/viaticosUtils';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerCiudadesPorDepartamento: vi.fn().mockResolvedValue([]),
  },
  viaticosService: {
    obtenerCiudadesPorDepartamento: vi.fn().mockResolvedValue([]),
  },
}));

const mockDepartamentos: Geopolitica[] = [
  { idGeopolitica: 1, codDepartamento: 11, nomDivGeopolitica: 'BOGOTÁ D.C.', tipDivision: 'DEPARTAMENTO' },
  { idGeopolitica: 2, codDepartamento: 5, nomDivGeopolitica: 'ANTIOQUIA', tipDivision: 'DEPARTAMENTO' },
];

describe('ItinerarioBuilder — Selector de Horario Militar y Aviso (Formato 023)', () => {
  it('genera correctamente las opciones de horario militar agrupadas por franjas', () => {
    const franjas = generarOpcionesHorarioMilitar();
    expect(franjas.length).toBe(4);

    const nombresGrupos = franjas.map((f) => f.grupo);
    expect(nombresGrupos.some((g) => g.includes('Mañana'))).toBe(true);
    expect(nombresGrupos.some((g) => g.includes('Tarde'))).toBe(true);
    expect(nombresGrupos.some((g) => g.includes('Noche'))).toBe(true);
    expect(nombresGrupos.some((g) => g.includes('Madrugada'))).toBe(true);

    // Revisar que contenga 08:00 en la mañana con formato 12h explicativo
    const manana = franjas.find((f) => f.grupo.includes('Mañana'));
    expect(manana).toBeDefined();
    const opcion0800 = manana!.opciones.find((o) => o.valor === '08:00');
    expect(opcion0800).toBeDefined();
    expect(opcion0800!.label).toContain('08:00 h (08:00 AM)');

    // Revisar que contenga 14:30 en la tarde con formato 12h explicativo
    const tarde = franjas.find((f) => f.grupo.includes('Tarde'));
    expect(tarde).toBeDefined();
    const opcion1430 = tarde!.opciones.find((o) => o.valor === '14:30');
    expect(opcion1430).toBeDefined();
    expect(opcion1430!.label).toContain('14:30 h (02:30 PM)');
  });

  it('formatearHorarioMilitarCon12h formatea correctamente las horas militares', () => {
    expect(formatearHorarioMilitarCon12h('08:00')).toBe('08:00 h (08:00 AM)');
    expect(formatearHorarioMilitarCon12h('14:30')).toBe('14:30 h (02:30 PM)');
    expect(formatearHorarioMilitarCon12h('00:15')).toBe('00:15 h (12:15 AM)');
    expect(formatearHorarioMilitarCon12h('23:45')).toBe('23:45 h (11:45 PM)');
    expect(formatearHorarioMilitarCon12h('')).toBe('—');
  });

  it('renderiza el aviso visible de horario militar sin sugerencia de fechas', () => {
    const itinerarioInicial: RutaItinerario[] = [
      {
        id: 'ruta-1',
        origenCiudad: 'Bogotá, D.C.',
        origenDepartamento: 'BOGOTÁ D.C.',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'ANTIOQUIA',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-10-15',
        fechaLlegada: '2026-10-16',
        diasRuta: 1.5,
        horarioEstimadoMilitar: '08:00',
        horaEstimadaSalida: '08:00',
        horaEstimadaLlegada: '14:30',
        tipoTransporte: 'AEREO',
        guardada: false,
      },
    ];

    render(
      <ItinerarioBuilder
        itinerario={itinerarioInicial}
        onChange={vi.fn()}
        departamentos={mockDepartamentos}
      />
    );

    // Debe mostrar el aviso explícito de horario militar
    expect(screen.getByText(/Aviso: Horario de Rutas en Formato Militar \(24 Horas\)/i)).toBeDefined();
    expect(screen.getByText(/no sugiere ni admite fechas/i)).toBeDefined();
  });

  it('renderiza el selector de horario militar para la hora estimada del viaje con soporte para digitar y flechas', () => {
    const onChange = vi.fn();
    const itinerarioInicial: RutaItinerario[] = [
      {
        id: 'ruta-1',
        origenCiudad: 'Bogotá, D.C.',
        origenDepartamento: 'BOGOTÁ D.C.',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'ANTIOQUIA',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-10-15',
        fechaLlegada: '2026-10-16',
        diasRuta: 1.5,
        horarioEstimadoMilitar: '08:00',
        horaEstimadaSalida: '08:00',
        tipoTransporte: 'TERRESTRE',
        guardada: false,
      },
    ];

    render(
      <ItinerarioBuilder
        itinerario={itinerarioInicial}
        onChange={onChange}
        departamentos={mockDepartamentos}
      />
    );

    // Debe mostrar la instrucción clara para digitar o usar flechas seleccionadoras
    expect(screen.getAllByText(/flechas seleccionadoras/i).length).toBeGreaterThan(0);

    // Debe tener el selector de hora estimada del viaje por aria-label
    const selectHoraViaje = screen.getByLabelText(/Hora estimada del viaje/i) as HTMLSelectElement;

    expect(selectHoraViaje).toBeDefined();
    expect(selectHoraViaje.tagName).toBe('SELECT');

    // Cambiar la hora del viaje a las 09:30 militar
    fireEvent.change(selectHoraViaje, { target: { value: '09:30' } });

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        horaEstimadaSalida: '09:30',
        horarioEstimadoMilitar: '09:30',
      }),
    ]);
  });

  it('no muestra información de días calculados por tramo ni columna de días totales en el itinerario', () => {
    const itinerarioInicial: RutaItinerario[] = [
      {
        id: 'ruta-1',
        origenCiudad: 'Bogotá, D.C.',
        origenDepartamento: 'BOGOTÁ D.C.',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'ANTIOQUIA',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-10-15',
        fechaLlegada: '2026-10-16',
        diasRuta: 1.5,
        horarioEstimadoMilitar: '08:00',
        horaEstimadaSalida: '08:00',
        horaEstimadaLlegada: '14:30',
        tipoTransporte: 'TERRESTRE',
        guardada: true,
      },
    ];

    render(
      <ItinerarioBuilder
        itinerario={itinerarioInicial}
        onChange={vi.fn()}
        departamentos={mockDepartamentos}
      />
    );

    // No debe existir el campo de 'Días calculados para este tramo'
    expect(screen.queryByText(/Días calculados para este tramo/i)).toBeNull();

    // No debe mostrarse la columna 'Días Totales' en la tarjeta general
    expect(screen.queryByText(/Días Totales/i)).toBeNull();

    // Sí debe mostrar las fechas de la comisión y los selectores o vista de horario militar
    expect(screen.getByText(/Fechas de la Comisión/i)).toBeDefined();
  });

  it('muestra las 5 modalidades de transporte y el campo de costo adicional para medios no aéreos', () => {
    const itinerarioTerrestre: RutaItinerario[] = [
      {
        id: 'ruta-1',
        origenCiudad: 'Bogotá, D.C.',
        origenDepartamento: 'BOGOTÁ D.C.',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'ANTIOQUIA',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-10-15',
        fechaLlegada: '2026-10-16',
        diasRuta: 1,
        horarioEstimadoMilitar: '08:00',
        horaEstimadaSalida: '08:00',
        horaEstimadaLlegada: '14:30',
        tipoTransporte: 'TERRESTRE',
        valorTransporte: 120000,
        guardada: false,
      },
    ];

    const { rerender } = render(
      <ItinerarioBuilder
        itinerario={itinerarioTerrestre}
        onChange={vi.fn()}
        departamentos={mockDepartamentos}
      />
    );

    // Debe mostrar los 5 botones de transporte
    expect(screen.getByRole('button', { name: /Aéreo/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Terrestre/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Marítimo/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Fluvial/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Ferroviario/i })).toBeDefined();

    // Como es TERRESTRE, debe pedir el transporte adicional
    expect(screen.getByText(/Transporte terrestre \/ fluvial \/ ferroviario \/ otros/i)).toBeDefined();
    expect(screen.getByText(/Ingrese el costo de transporte adicional/i)).toBeDefined();
    expect(screen.getByLabelText(/Costo de transporte adicional/i)).toBeDefined();

    // Si cambiamos a AÉREO, no debe mostrar el campo de transporte adicional
    const itinerarioAereo: RutaItinerario[] = [
      {
        ...itinerarioTerrestre[0],
        tipoTransporte: 'AEREO',
        valorTransporte: 0,
      },
    ];

    rerender(
      <ItinerarioBuilder
        itinerario={itinerarioAereo}
        onChange={vi.fn()}
        departamentos={mockDepartamentos}
      />
    );

    expect(screen.queryByText(/Ingrese el costo de transporte adicional/i)).toBeNull();
  });
});

