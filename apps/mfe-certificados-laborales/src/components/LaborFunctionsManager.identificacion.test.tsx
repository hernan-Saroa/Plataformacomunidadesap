import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LaborFunctionsManager } from './LaborFunctionsManager';
import { certificadosService } from '../../services/api/certificados.service';
import * as XLSX from 'xlsx';

vi.mock('../../services/api/certificados.service', () => ({ certificadosService: { laborales: {
  listarFuncionesLaborales: vi.fn(), consultarEmpleadoFuncionesLaborales: vi.fn(),
  listarSeleccionFuncionesLaborales: vi.fn(), crearFuncionesLaborales: vi.fn(),
  actualizarFuncionesLaborales: vi.fn(), eliminarFuncionesLaborales: vi.fn(),
  validarFuncionesLaboralesMasivas: vi.fn(), cargarFuncionesLaboralesMasivas: vi.fn(),
} } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
const api = certificadosService.laborales;
const profile = { id: 'p1', id_number: '0012345678', function_count: 1,
  functions: [{ ordinal: 1, description: 'Aplicar el numeral 2. Revisar los expedientes.' }] };
const tick = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(300); }); };
const response = (items: any[] = [profile]) => ({ items, page: 1, totalPages: 1, total: items.length,
  stats: { profiles: items.length, functions: items.length, pending: items.filter(p => !p.id_number).length } });
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.mocked(api.listarFuncionesLaborales).mockResolvedValue(response() as any);
  vi.mocked(api.crearFuncionesLaborales).mockResolvedValue(profile as any);
  vi.mocked(api.actualizarFuncionesLaborales).mockResolvedValue(profile as any);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Gestión individual por identificación', () => {
  it('muestra solo la identificación, funciones y acciones', async () => {
    render(<LaborFunctionsManager canManage />); await tick();
    expect(screen.getByRole('columnheader', { name: 'Número de identificación' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: /grado|denominación|dependencia/i })).toBeNull();
    expect(screen.getByText('0012345678')).toBeTruthy();
  });
  it('crea con identificación y funciones sin solicitar datos del cargo', async () => {
    render(<LaborFunctionsManager canManage />); await tick();
    fireEvent.click(screen.getByRole('button', { name: /Agregar individual/ }));
    const document = screen.getByLabelText(/Número de identificación/);
    fireEvent.change(document, { target: { value: '00.123.456-78' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Funciones/ }), { target: { value: '1. Aplicar el numeral 2. Revisar los expedientes.' } });
    expect(screen.queryByLabelText(/Nivel jerárquico/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Guardar funciones/ })); await tick();
    expect(api.crearFuncionesLaborales).toHaveBeenCalledWith({ idNumber: '0012345678', functions: '1. Aplicar el numeral 2. Revisar los expedientes.', sourceSheet: 'Registro individual' });
  });
  it('edita y conserva el texto íntegro de funciones ya guardadas', async () => {
    render(<LaborFunctionsManager canManage />); await tick();
    fireEvent.click(screen.getByRole('button', { name: 'Editar 0012345678' }));
    expect((screen.getByLabelText(/Número de identificación/) as HTMLInputElement).value).toBe('0012345678');
    expect((screen.getByRole('textbox', { name: /Funciones/ }) as HTMLTextAreaElement).value).toBe('1. Aplicar el numeral 2. Revisar los expedientes.');
    fireEvent.change(screen.getByLabelText(/Número de identificación/), { target: { value: '87654321' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar funciones/ })); await tick();
    expect(api.actualizarFuncionesLaborales).toHaveBeenCalledWith('p1', expect.objectContaining({ idNumber: '87654321' }));
  });
  it('mantiene registros heredados pendientes hasta asignarles un documento', async () => {
    vi.mocked(api.listarFuncionesLaborales).mockResolvedValue(response([{ ...profile, id_number: null }]) as any);
    render(<LaborFunctionsManager canManage />); await tick();
    expect(screen.getByText(/registros anteriores pendientes/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Pendiente de identificación' }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar funciones/ })); await tick();
    expect(api.actualizarFuncionesLaborales).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresa un número de identificación válido, de hasta 50 dígitos.')).toBeTruthy();
  });
  it('conserva el formulario si el servidor rechaza una identificación duplicada', async () => {
    vi.mocked(api.actualizarFuncionesLaborales).mockRejectedValueOnce(new Error('Esta identificación ya tiene funciones registradas.'));
    render(<LaborFunctionsManager canManage />); await tick();
    fireEvent.click(screen.getByRole('button', { name: 'Editar 0012345678' }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar funciones/ })); await tick();
    expect(screen.getByText('Esta identificación ya tiene funciones registradas.')).toBeTruthy();
    expect((screen.getByLabelText(/Número de identificación/) as HTMLInputElement).value).toBe('0012345678');
  });
  it('valida el Excel e importa solo identificaciones únicas con funciones válidas', async () => {
    vi.mocked(api.validarFuncionesLaboralesMasivas).mockImplementation(async ({ rows }) => ({
      summary: { total: rows.length, valid: rows.length, invalid: 0, toCreate: rows.length, toUpdate: 0 },
      results: rows.map(row => ({ rowNumber: row.rowNumber!, status: 'valid', action: 'created', id_number: row.idNumber, function_count: 1, message: 'Fila válida.' })),
    }));
    vi.mocked(api.cargarFuncionesLaboralesMasivas).mockResolvedValue({ summary: { total: 1, success: 1, failed: 0, created: 1, updated: 0 },
      results: [{ rowNumber: 4, status: 'success', action: 'created', id_number: '0012345678', function_count: 1, message: 'Registro creado.' }] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['PLANTILLA OFICIAL DE CARGA - No cambie el nombre de esta hoja'], ['Instrucciones'],
      ['Número de identificación', 'FUNCIONES'],
      ['0012345678', 'Aplicar el numeral 2. Revisar los expedientes.'],
      ['0012345678', 'Presentar informes institucionales.'],
      ['abc123', 'Otra función institucional.'],
    ]), 'Matriz Funciones ESAP');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const file = new File([bytes], 'funciones.xlsx');
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes });
    render(<LaborFunctionsManager canManage />); await tick();
    fireEvent.click(screen.getByRole('button', { name: 'Carga masiva' }));
    await act(async () => { fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } }); });
    await tick();
    expect(api.validarFuncionesLaboralesMasivas).toHaveBeenCalledWith(expect.objectContaining({ rows: [expect.objectContaining({ idNumber: '0012345678', rowNumber: 4 })] }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear 1 fila válida' })); await tick();
    expect(api.cargarFuncionesLaboralesMasivas).toHaveBeenCalledWith(expect.objectContaining({ rows: [expect.objectContaining({ idNumber: '0012345678', rowNumber: 4 })] }));
    expect(screen.getByText('Registro creado.')).toBeTruthy();
  });
});
