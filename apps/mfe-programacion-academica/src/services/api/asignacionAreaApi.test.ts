import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { asignarFranjas } from './asignacionAreaApi';
import { invalidarProgramacion } from '../actualizacionProgramacion';
vi.mock('../../../config/environment', () => ({ getApiGatewayBaseUrl: () => '' }));
vi.mock('../actualizacionProgramacion', () => ({ invalidarProgramacion: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });
it('un 200 con asignado:false no invalida ningún recurso', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { asignado: false, motivos: [{ regla: 'AREA', mensaje: 'Fuera del área' }] } }) }));
  expect((await asignarFranjas('g1', '123', ['f2'])).asignado).toBe(false);
  expect(invalidarProgramacion).not.toHaveBeenCalled();
});
it('envía solo las franjas seleccionadas e invalida después de confirmar', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { asignado: true } }) });
  vi.stubGlobal('fetch', fetchMock);
  await asignarFranjas('g1', '123', ['f2']);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ idGrupo: 'g1', documento: '123', franjas: ['f2'] });
  expect(invalidarProgramacion).toHaveBeenCalledWith('programacion', 'horarios', 'portal-docente', 'acumulado', 'grupo:g1');
});
it('propaga 409 sin invalidar', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ message: 'La programación ya está en revisión.' }) }));
  await expect(asignarFranjas('g1', '123', ['f2'])).rejects.toThrow('La programación ya está en revisión.');
  expect(invalidarProgramacion).not.toHaveBeenCalled();
});
