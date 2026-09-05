import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TicketsAdminPanel from './TicketsAdminPanel';

vi.mock('../../services/api/viaticosService', () => ({
  default: {
    obtenerHolguraGlobal: vi.fn(),
    actualizarHolguraGlobal: vi.fn(),
    obtenerRutasRestringidas: vi.fn(),
    crearRutaRestringida: vi.fn(),
    actualizarRutaRestringida: vi.fn(),
    eliminarRutaRestringida: vi.fn(),
    obtenerSaldosTiquetes: vi.fn(),
    crearSaldoTiquete: vi.fn(),
    actualizarSaldoTiquete: vi.fn(),
    eliminarSaldoTiquete: vi.fn(),
    obtenerTodasCiudades: vi.fn(),
    obtenerDependencias: vi.fn(),
  },
}));

import viaticosService from '../../services/api/viaticosService';

describe('TicketsAdminPanel - parametrización RF-LIQ-003/004', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (viaticosService.obtenerHolguraGlobal as any).mockResolvedValue({
      id: 1,
      clave: 'HOLGURA_TIQUETES_PORCENTAJE',
      valor: '15',
      tipo: 'NUMBER',
      descripcion: 'Holgura RF-LIQ-004',
    });
    (viaticosService.obtenerRutasRestringidas as any).mockResolvedValue([
      {
        id: 1,
        origenCiudad: 'BOGOTA',
        destinoCiudad: 'IBAGUE',
        descripcionRestriccion: 'ruta corta',
        activo: true,
      },
    ]);
    (viaticosService.obtenerSaldosTiquetes as any).mockResolvedValue([
      {
        id: 's1',
        dependenciaId: 'DEP-PLAN-01',
        nombreDependencia: 'Planificación',
        presupuestoInicial: 5_000_000,
        presupuestoReservado: 1_000_000,
        presupuestoDisponible: 4_000_000,
        holguraPorcentaje: 15,
        activo: true,
      },
    ]);
    (viaticosService.obtenerTodasCiudades as any).mockResolvedValue([
      { nomDivGeopolitica: 'Bogotá', tipDivision: 'CIUDAD' },
      { nomDivGeopolitica: 'Ibagué', tipDivision: 'CIUDAD' },
      { nomDivGeopolitica: 'Cali', tipDivision: 'CIUDAD' },
      { nomDivGeopolitica: 'Popayán', tipDivision: 'CIUDAD' },
      { nomDivGeopolitica: 'Medellín', tipDivision: 'CIUDAD' },
    ]);
    (viaticosService.obtenerDependencias as any).mockResolvedValue([
      {
        idDependencia: 1,
        codDependencia: 'DEP-PLAN-01',
        nomDependencia: 'Planificación',
        activo: true,
      },
      {
        idDependencia: 2,
        codDependencia: 'DEP-ACAD-01',
        nomDependencia: 'Subdirección Académica',
        activo: true,
      },
    ]);
    (viaticosService.actualizarHolguraGlobal as any).mockResolvedValue({
      id: 1,
      clave: 'HOLGURA_TIQUETES_PORCENTAJE',
      valor: '20',
      tipo: 'NUMBER',
      descripcion: 'x',
    });
    (viaticosService.crearRutaRestringida as any).mockResolvedValue({
      id: 2,
      origenCiudad: 'CALI',
      destinoCiudad: 'POPAYAN',
      descripcionRestriccion: 'otra',
      activo: true,
    });
    (viaticosService.eliminarRutaRestringida as any).mockResolvedValue({
      message: 'ok',
    });
    (viaticosService.crearSaldoTiquete as any).mockResolvedValue({
      id: 's2',
      dependenciaId: 'DEP-NEW-01',
      nombreDependencia: 'Nueva Dependencia',
      presupuestoInicial: 10_000_000,
      presupuestoReservado: 0,
      presupuestoDisponible: 10_000_000,
      holguraPorcentaje: 15,
      activo: true,
    });
    (viaticosService.eliminarSaldoTiquete as any).mockResolvedValue({
      message: 'ok',
    });
  });

  it('carga la holgura global, rutas y saldos', async () => {
    render(<TicketsAdminPanel />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('15')).toBeTruthy();
    });
    expect(screen.getByText(/BOGOTA/i)).toBeTruthy();
    expect(screen.getByText(/Planificación/i)).toBeTruthy();
  });

  it('permite actualizar la holgura y muestra mensaje de éxito', async () => {
    render(<TicketsAdminPanel />);
    const input = await screen.findByDisplayValue('15');
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByText(/Guardar holgura/i));
    await waitFor(() => {
      expect(viaticosService.actualizarHolguraGlobal).toHaveBeenCalledWith(20);
    });
    await waitFor(() => {
      expect(screen.getByText(/Holgura actualizada a 20%/)).toBeTruthy();
    });
  });

  it('rechaza valores fuera del rango 0-100 sin llamar al backend', async () => {
    render(<TicketsAdminPanel />);
    const input = await screen.findByDisplayValue('15');
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.click(screen.getByText(/Guardar holgura/i));
    await waitFor(() => {
      expect(
        screen.getByText(/debe ser un número entre 0 y 100/i),
      ).toBeTruthy();
    });
    expect(viaticosService.actualizarHolguraGlobal).not.toHaveBeenCalled();
  });

  it('abre el modal para nueva ruta restringida', async () => {
    render(<TicketsAdminPanel />);
    await waitFor(() => {
      expect(screen.getByText(/BOGOTA/i)).toBeTruthy();
    });
    fireEvent.click(screen.getAllByText(/Nueva ruta restringida/i)[0]);
    expect(screen.getAllByText(/Nueva ruta restringida/i).length).toBeGreaterThanOrEqual(2);
    // Ahora los campos son SearchableSelect: dos botones con placeholder
    // "Buscar y seleccionar ciudad…".
    const selectores = await screen.findAllByRole('button', {
      name: /Buscar y seleccionar ciudad/i,
    });
    expect(selectores.length).toBe(2);
  });

  it('consulta las ciudades desde auth.geopolitica al abrir el modal', async () => {
    render(<TicketsAdminPanel />);
    await waitFor(() => {
      expect(screen.getByText(/BOGOTA/i)).toBeTruthy();
    });
    fireEvent.click(screen.getAllByText(/Nueva ruta restringida/i)[0]);
    await waitFor(() => {
      expect(viaticosService.obtenerTodasCiudades).toHaveBeenCalled();
    });
  });

  it('crea una ruta restringida seleccionando ciudades del listado', async () => {
    render(<TicketsAdminPanel />);
    await waitFor(() => {
      expect(screen.getByText(/Nueva ruta restringida$/i)).toBeTruthy();
    });
    fireEvent.click(screen.getAllByText(/Nueva ruta restringida/i)[0]);

    // Espera a que aparezcan los SearchableSelect (ciudades cargadas).
    const [selectorOrigen, selectorDestino] = await screen.findAllByRole(
      'button',
      { name: /Buscar y seleccionar ciudad/i },
    );

    // Origen: Cali
    fireEvent.click(selectorOrigen);
    const opcionCali = await screen.findByRole('button', { name: 'Cali' });
    fireEvent.click(opcionCali);

    // Destino: Popayán
    fireEvent.click(selectorDestino);
    const opcionPopayan = await screen.findByRole('button', { name: 'Popayán' });
    fireEvent.click(opcionPopayan);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => {
      expect(viaticosService.crearRutaRestringida).toHaveBeenCalledWith(
        expect.objectContaining({
          origenCiudad: 'CALI',
          destinoCiudad: 'POPAYÁN',
          activo: true,
        }),
      );
    });
  });

  it('valida que origen y destino sean obligatorios antes de enviar', async () => {
    render(<TicketsAdminPanel />);
    await waitFor(() => {
      expect(screen.getByText(/Nueva ruta restringida$/i)).toBeTruthy();
    });
    fireEvent.click(screen.getAllByText(/Nueva ruta restringida/i)[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => {
      expect(
        screen.getByText(/Origen y destino son obligatorios/i),
      ).toBeTruthy();
    });
    expect(viaticosService.crearRutaRestringida).not.toHaveBeenCalled();
  });

  it('abre el modal de nuevo saldo desde el botón de la sección', async () => {
    render(<TicketsAdminPanel />);
    await waitFor(() => {
      expect(screen.getByText(/Planificación/i)).toBeTruthy();
    });
    fireEvent.click(screen.getByText(/^Nuevo saldo$/));
    expect(screen.getByText(/Nuevo saldo por dependencia/i)).toBeTruthy();
    // El campo de dependencia ahora es un SearchableSelect con su placeholder
    // (en lugar de inputs de texto libre).
    expect(
      screen.getByRole('button', { name: /Buscar y seleccionar dependencia/i }),
    ).toBeTruthy();
  });

  it('crea un saldo enviando el payload correcto al backend', async () => {
    render(<TicketsAdminPanel />);
    await waitFor(() => {
      expect(screen.getByText(/Planificación/i)).toBeTruthy();
    });
    fireEvent.click(screen.getByText(/^Nuevo saldo$/));

    const selectorDep = await screen.findByRole('button', {
      name: /Buscar y seleccionar dependencia/i,
    });
    fireEvent.click(selectorDep);
    const opcionAcad = await screen.findByRole('button', {
      name: /DEP-ACAD-01 — Subdirección Académica/i,
    });
    fireEvent.click(opcionAcad);

    fireEvent.change(screen.getByPlaceholderText('15.000.000'), {
      target: { value: '10000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => {
      expect(viaticosService.crearSaldoTiquete).toHaveBeenCalledWith(
        expect.objectContaining({
          dependenciaId: 'DEP-ACAD-01',
          nombreDependencia: 'Subdirección Académica',
          presupuestoInicial: 10_000_000,
          activo: true,
        }),
      );
    });
  });

  it('valida que ID y nombre de dependencia sean obligatorios', async () => {
    render(<TicketsAdminPanel />);
    await waitFor(() => {
      expect(screen.getByText(/Planificación/i)).toBeTruthy();
    });
    fireEvent.click(screen.getByText(/^Nuevo saldo$/));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => {
      expect(
        screen.getByText(/ID y nombre de la dependencia son obligatorios/i),
      ).toBeTruthy();
    });
    expect(viaticosService.crearSaldoTiquete).not.toHaveBeenCalled();
  });

  it('muestra el banner de estado vacío con CTA cuando no hay saldos', async () => {
    (viaticosService.obtenerSaldosTiquetes as any).mockResolvedValueOnce([]);
    render(<TicketsAdminPanel />);
    await waitFor(() => {
      expect(
        screen.getByText(/No hay saldos de tiquetes configurados/i),
      ).toBeTruthy();
    });
    expect(screen.getByText(/Crear el primer saldo/i)).toBeTruthy();
  });
});