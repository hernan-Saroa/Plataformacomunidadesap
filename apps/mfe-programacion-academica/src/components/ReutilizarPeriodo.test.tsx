// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { ReutilizarPeriodo } from './ReutilizarPeriodo';
import {
  ErrorConReporte, reutilizarPeriodo, validarReutilizacion, type ResultadoReutilizacion,
} from '../services/api/cargaProgramacionApi';
import type { PeriodoPlataforma } from '../services/api/periodosApi';

vi.mock('../services/api/cargaProgramacionApi', async (orig) => ({
  ...((await orig()) as object),
  validarReutilizacion: vi.fn(), reutilizarPeriodo: vi.fn(),
}));

const periodo = (idPeriodo: string, codigo: string): PeriodoPlataforma => ({
  idPeriodo, modelo: 'plataforma', codigo, anio: Number(codigo.slice(0, 4)), semestre: 1, fechaInicio: '2027-02-01', fechaFin: '2027-06-12',
  estadoPlataforma: 'planeacion', programacion: { estado: 'abierta', cerradaEn: null }, programable: true, esActivo: false,
});
const destino = periodo('7', '2027-1');
const periodos = [periodo('1', '2026-1'), destino, periodo('3', '2026-2')];
const resultado = (extra: Partial<ResultadoReutilizacion> = {}): ResultadoReutilizacion => ({
  valido: true, aplicado: false, alcance: 'catalogo_grupos_docentes',
  origen: { idPeriodo: '1', codigo: '2026-1' }, destino: { idPeriodo: '7', codigo: '2027-1' }, corrimientoDias: 364,
  catalogo: { ofertasCopiadas: 325, ofertasYaExistentes: 0, activacionesCetapCopiadas: 0 },
  grupos: { copiados: 1, yaExistentes: 0, sesiones: 5, fechasAjustadas: 0, sinOferta: 0 },
  docentes: { asignados: 1, noAsignados: [{ grupo: 'ASIG-00003 grupo 1', documento: '99', nombre: 'Docente Vencido', motivos: ['La vinculación del docente termina antes del ciclo del grupo.'] }] },
  errores: [], avisos: [], ...extra,
});

beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);

it('no ofrece copiar del mismo periodo y no copia sin revisar antes', () => {
  render(<ReutilizarPeriodo destino={destino} periodos={periodos} onCerrar={() => {}} />);
  const opciones = Array.from((screen.getByRole('combobox') as HTMLSelectElement).options).map((o) => o.textContent);
  expect(opciones.some((t) => t?.startsWith('2027-1'))).toBe(false);
  expect((screen.getByRole('button', { name: /Copiar de/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
});

it('revisa, muestra qué se copiaría (con el docente que no cumple y su motivo) y luego copia', async () => {
  vi.mocked(validarReutilizacion).mockResolvedValue(resultado());
  vi.mocked(reutilizarPeriodo).mockResolvedValue(resultado({ aplicado: true }));
  const alTerminar = vi.fn();
  render(<ReutilizarPeriodo destino={destino} periodos={periodos} onCerrar={() => {}} alTerminar={alTerminar} />);
  fireEvent.click(screen.getByRole('radio', { name: /Catálogo \+ grupos \+ docentes/ }));
  fireEvent.click(screen.getByRole('button', { name: /Revisar qué se copiaría/ }));
  expect(await screen.findByText(/Esto se copiaría de 2026-1/)).toBeTruthy();
  expect(validarReutilizacion).toHaveBeenCalledWith('7', '1', 'catalogo_grupos_docentes');
  expect(screen.getByText(/325 oferta/)).toBeTruthy();
  expect(screen.getByText(/52 semana/)).toBeTruthy();
  expect(screen.getByText(/La vinculación del docente termina/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Copiar de 2026-1/ }));
  expect(await screen.findByText('Copiado de 2026-1.')).toBeTruthy();
  expect(reutilizarPeriodo).toHaveBeenCalledWith('7', '1', 'catalogo_grupos_docentes');
  expect(alTerminar).toHaveBeenCalled();
});

it('al abrir desde «crear periodo» revisa sola con lo elegido', async () => {
  vi.mocked(validarReutilizacion).mockResolvedValue(resultado({ alcance: 'catalogo' }));
  render(<ReutilizarPeriodo destino={destino} periodos={periodos} origenInicial="3" alcanceInicial="catalogo" revisarAlAbrir onCerrar={() => {}} />);
  await waitFor(() => expect(validarReutilizacion).toHaveBeenCalledWith('7', '3', 'catalogo'));
});

it('un 409 muestra el reporte del servidor y no finge que copió', async () => {
  vi.mocked(validarReutilizacion).mockResolvedValue(resultado());
  vi.mocked(reutilizarPeriodo).mockRejectedValue(new ErrorConReporte('La copia tiene 1 error(es): no se copió nada.', 409,
    resultado({ valido: false, errores: [{ grupo: 'ASIG-00003 grupo 1', mensaje: 'El aula 204 ya está ocupada el lunes de 08:00 a 10:00.' }] })));
  render(<ReutilizarPeriodo destino={destino} periodos={periodos} onCerrar={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /Revisar qué se copiaría/ }));
  await screen.findByText(/Esto se copiaría/);
  fireEvent.click(screen.getByRole('button', { name: /Copiar de/ }));
  expect((await screen.findByRole('alert')).textContent).toContain('no se copió nada');
  expect(screen.getByText(/El aula 204 ya está ocupada/)).toBeTruthy();
  expect(screen.queryByText(/^Copiado de/)).toBeNull();
});
