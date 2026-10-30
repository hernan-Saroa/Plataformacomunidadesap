import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

import { apiClient } from './apiClient';
import { authService } from './authService';

const usuario = (id: string, nombre: string, roles: Array<{ id?: string; code?: string; name: string }>) => ({
  id_user: id,
  person: { full_name: nombre, email: `${id}@esap.edu.co` },
  roles,
});

const USUARIOS = [
  usuario('u1', 'Resuelve Uno', [{ id: 'r1', code: 'RESUELVE_GESTION_LEGAL', name: 'Resuelve Gestión Legal' }]),
  usuario('u2', 'Rocío Secretariado', [{ id: 'r2', code: 'SECRETARIADO_GESTION_LEGAL', name: 'Secretariado Gestión Legal' }]),
  usuario('u3', 'Erika Consulta', [{ id: 'r3', code: 'CONSULTA_SEGUIMIENTO_GESTION_LEGAL', name: 'Consulta de Seguimiento Gestión Legal' }]),
  usuario('u4', 'Otro Rol', [{ id: 'r4', code: 'CONTADOR', name: 'Contador' }]),
  usuario('u5', 'Rol Sin Code', [{ id: 'r-custom', name: 'Gestión Legal Nuevo' }]),
];

describe('authService.getUsuariosPorRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: USUARIOS, meta: {} } as any);
  });

  it('pide solo usuarios activos', async () => {
    await authService.getUsuariosPorRoles(['RESUELVE_GESTION_LEGAL']);
    expect(apiClient.get).toHaveBeenCalledWith('/auth/api/v1/users', { status: 'active', limit: 1000 });
  });

  it('CA-01/02/03: lista a los usuarios de todos los roles configurados', async () => {
    const res = await authService.getUsuariosPorRoles([
      'RESUELVE_GESTION_LEGAL',
      'SECRETARIADO_GESTION_LEGAL',
      'CONSULTA_SEGUIMIENTO_GESTION_LEGAL',
    ]);
    expect(res.map(u => u.id)).toEqual(['u1', 'u2', 'u3']);
    expect(res[1].nombreCompleto).toBe('Rocío Secretariado');
  });

  it('no incluye usuarios de roles que no están configurados', async () => {
    const res = await authService.getUsuariosPorRoles(['RESUELVE_GESTION_LEGAL']);
    expect(res.map(u => u.id)).toEqual(['u1']);
  });

  it('CA-05: un rol nuevo sin code se reconoce por su id, sin tocar código', async () => {
    const res = await authService.getUsuariosPorRoles(['r-custom']);
    expect(res.map(u => u.id)).toEqual(['u5']);
  });

  it('ignora mayúsculas/minúsculas en la clave', async () => {
    const res = await authService.getUsuariosPorRoles(['secretariado_gestion_legal']);
    expect(res.map(u => u.id)).toEqual(['u2']);
  });

  it('sin roles configurados devuelve vacío y no consulta al backend', async () => {
    const res = await authService.getUsuariosPorRoles([]);
    expect(res).toEqual([]);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('un usuario con varios roles aparece una sola vez', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [usuario('u6', 'Varios Roles', [
        { id: 'r1', code: 'RESUELVE_GESTION_LEGAL', name: 'Resuelve Gestión Legal' },
        { id: 'r2', code: 'SECRETARIADO_GESTION_LEGAL', name: 'Secretariado Gestión Legal' },
      ])],
      meta: {},
    } as any);
    const res = await authService.getUsuariosPorRoles(['RESUELVE_GESTION_LEGAL', 'SECRETARIADO_GESTION_LEGAL']);
    expect(res.map(u => u.id)).toEqual(['u6']);
  });

  it('acepta la respuesta como arreglo plano (sin envoltorio data/meta)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(USUARIOS as any);
    const res = await authService.getUsuariosPorRoles(['SECRETARIADO_GESTION_LEGAL']);
    expect(res.map(u => u.id)).toEqual(['u2']);
  });

  it('lee los roles cuando vienen en user.roles', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{
        user: { id_user: 'u7', roles: [{ id: 'r2', code: 'SECRETARIADO_GESTION_LEGAL', name: 'Secretariado Gestión Legal' }] },
        person: { full_name: 'Anidado', email: 'anidado@esap.edu.co' },
      }],
      meta: {},
    } as any);
    const res = await authService.getUsuariosPorRoles(['SECRETARIADO_GESTION_LEGAL']);
    expect(res).toEqual([
      expect.objectContaining({ id: 'u7', nombreCompleto: 'Anidado', email: 'anidado@esap.edu.co' }),
    ]);
  });

  it('usuarios sin roles o con roles sin code/id no rompen el filtro', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        { id_user: 'u8', person: { full_name: 'Sin roles' } },
        usuario('u9', 'Rol vacío', [{ name: 'Gestión Legal sin identificador' }]),
      ],
      meta: {},
    } as any);
    const res = await authService.getUsuariosPorRoles(['SECRETARIADO_GESTION_LEGAL']);
    expect(res).toEqual([]);
  });

  it('devuelve id, nombre, nombreCompleto y email mapeados', async () => {
    const res = await authService.getUsuariosPorRoles(['CONSULTA_SEGUIMIENTO_GESTION_LEGAL']);
    expect(res).toEqual([
      { id: 'u3', nombre: 'Erika Consulta', nombreCompleto: 'Erika Consulta', email: 'u3@esap.edu.co' },
    ]);
  });

  // Pendientes: la regla del ticket (filtrar por nombre de rol) aún no está implementada.
  it.todo('CA-05: incluye cualquier rol cuyo nombre contenga "Gestión Legal" sin configurarlo');
  it.todo('CA-04: excluye usuarios no vigentes aunque estén activos');
});
