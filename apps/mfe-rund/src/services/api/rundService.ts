import { DocenteRund, DashboardSummary, FormacionAcademica, ExperienciaDocente, ProduccionIntelectual, SituacionAdministrativa, SoporteDocumental } from '../../types/rund.types';

const API_BASE = '/api/rund';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const rundService = {
  // Docentes
  async getDocentes(params: {
    q?: string;
    estadoRund?: string;
    escalafonDocente?: string;
    categoriaMinciencias?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: DocenteRund[]; total: number; page: number; limit: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.estadoRund) query.append('estadoRund', params.estadoRund);
    if (params.escalafonDocente) query.append('escalafonDocente', params.escalafonDocente);
    if (params.categoriaMinciencias) query.append('categoriaMinciencias', params.categoriaMinciencias);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/docentes?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener lista de docentes');
    return res.json();
  },

  async getDocenteById(id: string): Promise<DocenteRund> {
    const res = await fetch(`${API_BASE}/docentes/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener información del docente');
    return res.json();
  },

  async createDocente(data: Partial<DocenteRund>): Promise<DocenteRund> {
    const res = await fetch(`${API_BASE}/docentes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error al registrar docente' }));
      throw new Error(err.message || 'Error al registrar docente');
    }
    return res.json();
  },

  async updateDocente(id: string, data: Partial<DocenteRund>): Promise<DocenteRund> {
    const res = await fetch(`${API_BASE}/docentes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar docente');
    return res.json();
  },

  async changeEstado(id: string, estado: string): Promise<DocenteRund> {
    const res = await fetch(`${API_BASE}/docentes/${id}/estado`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) throw new Error('Error al cambiar estado del docente');
    return res.json();
  },

  // Estadísticas Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/estadisticas/dashboard`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener resumen de estadísticas');
    return res.json();
  },

  // Trayectoria (Formacion, Experiencia, Produccion)
  async addFormacion(idDocente: string, data: Partial<FormacionAcademica>): Promise<FormacionAcademica> {
    const res = await fetch(`${API_BASE}/trayectoria/docente/${idDocente}/formacion`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al agregar formación');
    return res.json();
  },

  async addExperiencia(idDocente: string, data: Partial<ExperienciaDocente>): Promise<ExperienciaDocente> {
    const res = await fetch(`${API_BASE}/trayectoria/docente/${idDocente}/experiencia`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al agregar experiencia');
    return res.json();
  },

  async addProduccion(idDocente: string, data: Partial<ProduccionIntelectual>): Promise<ProduccionIntelectual> {
    const res = await fetch(`${API_BASE}/trayectoria/docente/${idDocente}/produccion`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al agregar producción');
    return res.json();
  },

  // Situaciones Administrativas
  async getSituaciones(idDocente: string): Promise<SituacionAdministrativa[]> {
    const res = await fetch(`${API_BASE}/situaciones-admin/docente/${idDocente}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener situaciones');
    return res.json();
  },

  async addSituacion(idDocente: string, data: Partial<SituacionAdministrativa>): Promise<SituacionAdministrativa> {
    const res = await fetch(`${API_BASE}/situaciones-admin/docente/${idDocente}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al registrar situación administrativa');
    return res.json();
  },

  // Soportes y Validación
  async getSoportes(idDocente: string): Promise<SoporteDocumental[]> {
    const res = await fetch(`${API_BASE}/soportes/docente/${idDocente}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener soportes');
    return res.json();
  },

  async validateSoporte(idSoporte: string, estadoValidacion: string, observaciones?: string): Promise<SoporteDocumental> {
    const res = await fetch(`${API_BASE}/soportes/${idSoporte}/validar`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ estadoValidacion, observaciones }),
    });
    if (!res.ok) throw new Error('Error al validar soporte');
    return res.json();
  },

  // Tarjeta Digital RUND
  async emitirTarjeta(idDocente: string): Promise<{ docente: DocenteRund; codigoVerificacion: string; qrCodeDataUrl: string; fechaEmision: string }> {
    const res = await fetch(`${API_BASE}/tarjeta-digital/docente/${idDocente}/emitir`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Error al emitir tarjeta digital');
    return res.json();
  },
};
