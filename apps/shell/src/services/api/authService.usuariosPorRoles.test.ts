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
});
