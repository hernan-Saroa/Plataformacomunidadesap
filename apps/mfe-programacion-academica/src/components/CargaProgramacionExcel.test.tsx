// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { CargaProgramacionExcel } from './CargaProgramacionExcel';
import { cargarProgramacion, ErrorConReporte, validarCarga, type ResultadoCarga } from '../services/api/cargaProgramacionApi';
import { leerPlantilla } from '../services/plantillaProgramacion';

vi.mock('../services/api/cargaProgramacionApi', async (orig) => ({
  ...((await orig()) as object),
  validarCarga: vi.fn(), cargarProgramacion: vi.fn(), getReferenciaPlantilla: vi.fn(),
}));
vi.mock('../services/plantillaProgramacion', async (orig) => ({
  ...((await orig()) as object),
  leerPlantilla: vi.fn(), generarPlantilla: vi.fn(),
}));

const filas = [{ fila: 4, codigoAsignatura: 'ASIG-00003', grupo: '1', dia: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }];
const reporte = (extra: Partial<ResultadoCarga> = {}): ResultadoCarga => ({
  valido: true, aplicado: false, periodo: { idPeriodo: '7', codigo: '2027-1' },
  resumen: { filas: 1, gruposNuevos: 1, gruposExistentes: 0, sesiones: 1, asignaciones: 0 },
  errores: [], avisos: [], grupos: [{ codigoAsignatura: 'ASIG-00003', asignatura: 'X', grupo: 1, tipoOferta: 'periodo_regular', nuevo: true, sesiones: 1, docentes: [] }],
  ...extra,
});
const subir = () => {
  const archivo = new File(['x'], 'programacion.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  Object.defineProperty(archivo, 'arrayBuffer', { value: async () => new ArrayBuffer(1) });
  fireEvent.change(screen.getByLabelText('Archivo de programación (.xlsx)'), { target: { files: [archivo] } });
};

beforeEach(() => { vi.resetAllMocks(); vi.mocked(leerPlantilla).mockResolvedValue(filas); });
afterEach(cleanup);

it('cargar está deshabilitado hasta que el archivo valide sin errores', async () => {
  vi.mocked(validarCarga).mockResolvedValue(reporte({
    valido: false, errores: [{ fila: 4, mensaje: 'Día «Lun» no reconocido (LUNES a DOMINGO).' }],
  }));
  render(<CargaProgramacionExcel idPeriodo="7" codigoPeriodo="2027-1" onCerrar={() => {}} />);
  subir();
  expect(await screen.findByText(/tiene 1 error/)).toBeTruthy();
  expect(screen.getByText(/Día «Lun» no reconocido/)).toBeTruthy();
  expect(validarCarga).toHaveBeenCalledWith('7', filas);
  expect((screen.getByRole('button', { name: /3\. Cargar programación/ }) as HTMLButtonElement).disabled).toBe(true);
});

it('valida, muestra el resumen y carga', async () => {
  vi.mocked(validarCarga).mockResolvedValue(reporte());
  vi.mocked(cargarProgramacion).mockResolvedValue(reporte({ aplicado: true }));
  render(<CargaProgramacionExcel idPeriodo="7" codigoPeriodo="2027-1" onCerrar={() => {}} />);
  subir();
  expect(await screen.findByText(/El archivo es válido/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /3\. Cargar programación/ }));
  expect(await screen.findByText('Programación cargada.')).toBeTruthy();
  expect(cargarProgramacion).toHaveBeenCalledWith('7', filas);
});

it('si al cargar el servidor responde 409, muestra su reporte nuevo y no dice «cargada»', async () => {
  vi.mocked(validarCarga).mockResolvedValue(reporte());
  vi.mocked(cargarProgramacion).mockRejectedValue(new ErrorConReporte('La carga tiene 1 error(es): no se escribió nada.', 409,
    reporte({ valido: false, errores: [{ fila: 4, mensaje: 'El aula 204 ya está ocupada el lunes de 08:00 a 10:00.' }] })));
  render(<CargaProgramacionExcel idPeriodo="7" codigoPeriodo="2027-1" onCerrar={() => {}} />);
  subir();
  await screen.findByText(/El archivo es válido/);
  fireEvent.click(screen.getByRole('button', { name: /3\. Cargar programación/ }));
  expect((await screen.findByRole('alert')).textContent).toContain('no se escribió nada');
  expect(screen.getByText(/El aula 204 ya está ocupada/)).toBeTruthy();
  expect(screen.queryByText('Programación cargada.')).toBeNull();
});

it('un archivo que no es .xlsx se rechaza sin llamar al servidor', async () => {
  render(<CargaProgramacionExcel idPeriodo="7" codigoPeriodo="2027-1" onCerrar={() => {}} />);
  fireEvent.change(screen.getByLabelText('Archivo de programación (.xlsx)'), { target: { files: [new File(['x'], 'datos.csv')] } });
  expect((await screen.findByRole('alert')).textContent).toContain('.xlsx');
  expect(validarCarga).not.toHaveBeenCalled();
});
