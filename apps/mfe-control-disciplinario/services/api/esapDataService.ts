import { disciplinaryService } from './disciplinary.service';

const toUiPersona = (raw: any) => ({
  nombre: raw?.nombre || 'Sin información',
  tipoIdentificacion: 'CC' as const,
  numeroIdentificacion: raw?.cedula || raw?.documento || 'N/A',
});

export const mapStageToUi = (stage?: string | number) => {
  if (typeof stage === 'number') {
    switch (stage) {
      case 1: return 'Recepción';
      case 2: return 'Valoración';
      case 3: return 'Indagación';
      case 4: return 'Investigación';
      case 5: return 'Juzgamiento';
      case 6: return 'Fallo';
      default: return 'Recepción';
    }
  }
  const value = (stage || '').toUpperCase();
  if (value.includes('RECEP')) return 'Recepción';
  if (value.includes('VALOR') || value.includes('EVALU')) return 'Valoración';
  if (value.includes('INDAG')) return 'Indagación';
  if (value.includes('INVEST')) return 'Investigación';
  if (value.includes('JUZG')) return 'Juzgamiento';
  if (value.includes('FALLO')) return 'Fallo';
  return 'Recepción';
};

const daysUntil = (iso?: string) => {
  if (!iso) return 0;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return 0;
  const now = Date.now();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

export const ensureDataSeeded = async () => {
  return true;
};

export const noticiasService = {
  async getAll(): Promise<any[]> {
    const noticias = await disciplinaryService.getAllNoticias();
    return (noticias || []).map((n: any) => ({
      id: n.id,
      numero: n.radicado || n.id,
      fechaRecepcion: (n.fechaRecepcion || n.createdAt || new Date().toISOString()).split('T')[0],
      fechaRegistro: n.createdAt,
      fechaHechos: n.fechaHechos,
      origen: n.origen || 'ANONIMO',
      denunciante: toUiPersona(n.denunciante),
      denunciado: toUiPersona(n.disciplinable),
      hechos: n.hechos || '',
      estado: 'pendiente',
      prioridad: 'media',
      diasPendientes: 0,
      tipo: 'noticia',
      territorial: n.territorial,
      dependencia: n.dependenciaDenunciado,
    }));
  },

  async create(data: any): Promise<any> {
    return data;
  },

  async update(id: string, data: any): Promise<any> {
    if (data?.estado === 'devuelta') {
      return disciplinaryService.returnNews(id, data?.observaciones || 'Devuelta');
    }
    if (data?.estado === 'archivada') {
      return disciplinaryService.archiveNews(id, data?.motivoArchivo || 'Archivada');
    }
    return disciplinaryService.updateNoticia(id, {
      hechos: data?.hechos,
      territorial: data?.territorial,
      dependenciaDenunciado: data?.dependencia,
    });
  },

  async remove(id: string): Promise<any> {
    return disciplinaryService.archiveNews(id, 'Convertida a proceso');
  },
};

export const procesosService = {
  async getAll(): Promise<any[]> {
    const procesos = await disciplinaryService.getAllProcesos();
    return (procesos || []).map((p: any) => ({
      id: p.id,
      numeroProceso: p.radicadoProceso || p.id,
      noticiaOrigen: p.news?.radicado || p.news?.id || 'Sin noticia',
      denunciante: toUiPersona(p.news?.denunciante),
      denunciado: toUiPersona(p.news?.disciplinable),
      cedula: p.news?.disciplinable?.cedula || '',
      etapaActual: mapStageToUi(p.kanbanStage || p.etapaActual),
      estadoActual: p.estado || 'ACTIVO',
      estadoKanban: mapStageToUi(p.kanbanStage || p.etapaActual),
      profesionalAsignado: p.abogadoAsignadoNombre || 'Sin asignar',
      profesionalAsignadoId: p.abogadoAsignadoId,
      termino: {
        diasRestantes: daysUntil(p.fechaVencimientoEtapa),
        dias: 30,
      },
      borradores: [],
      documentos: [],
      pendienteAprobacion: false,
      ultimaActuacion: p.updatedAt || p.createdAt,
      fechaInicio: (p.createdAt || new Date().toISOString()).split('T')[0],
      fechaCreacion: (p.createdAt || new Date().toISOString()).split('T')[0],
      tipo: 'proceso',
      hechos: p.news?.hechos || '',
      fechaHechos: p.news?.fechaHechos || '',
      cargo: p.news?.disciplinable?.cargo || '',
      dependencia: p.news?.dependenciaDenunciado || '',
      // Campos heredados de la Noticia disciplinaria
      territorial: p.news?.territorial || '',
      conductaSeleccionada: p.news?.conductas?.[0] || '',
      conductaPersonalizada: '',
      conducta: p.news?.conducta || '',
      denunciados: p.news?.disciplinable ? [{
        id: p.news.disciplinable.cedula || p.news.disciplinable.documento || p.id,
        nombre: p.news.disciplinable.nombre || '',
        identificacion: p.news.disciplinable.cedula || p.news.disciplinable.documento || '',
        cargo: p.news.disciplinable.cargo || '',
        lugarHechos: p.news.disciplinable.lugarHechos || p.news?.hechos?.split('Lugar:')[1]?.trim() || '',
        apoderado: p.news.disciplinable.apoderado ? {
          nombre: p.news.disciplinable.apoderado.nombre,
          cedula: p.news.disciplinable.apoderado.cedula,
          correo: p.news.disciplinable.apoderado.correo,
          celular: p.news.disciplinable.apoderado.celular,
        } : undefined,
      }] : [],
      denunciantes: p.news?.denunciante ? [{
        id: p.news.denunciante.cedula || p.news.denunciante.documento || p.id,
        nombre: p.news.denunciante.nombre || '',
        identificacion: p.news.denunciante.cedula || p.news.denunciante.documento || '',
        direccion: p.news.denunciante.direccion || '',
        telefono: p.news.denunciante.telefono || '',
        correo: p.news.denunciante.email || '',
        cargo: p.news.denunciante.cargo || '',
        entidad: p.news.denunciante.entidad || '',
        tipo: p.news.denunciante.tipo || 'Denunciante',
        apoderado: p.news.denunciante.apoderado ? {
          nombre: p.news.denunciante.apoderado.nombre,
          cedula: p.news.denunciante.apoderado.cedula,
          correo: p.news.denunciante.apoderado.correo,
          celular: p.news.denunciante.apoderado.celular,
        } : undefined,
      }] : [],
      hechosSeparados: [],
      archivosAdjuntos: [],
      origenNoticia: p.news?.origen || '',
      fechaRecepcionNoticia: p.news?.fechaRecepcion || p.news?.createdAt || '',
      prioridadNoticia: p.news?.prioridad || 'media',
    }));
  },

  async create(data: any): Promise<any> {
    return data;
  },

  async update(id: string, data: any): Promise<any> {
    return disciplinaryService.updateProcess(id, {
      hechos: data?.hechos,
      disciplinable: {
        nombre: data?.denunciado?.nombre,
        cedula: data?.denunciado?.numeroIdentificacion,
      },
    } as any);
  },
};

export const profesionalesService = {
  async getAll(): Promise<any[]> {
    try {
      const [profesionales, workload] = await Promise.all([
        disciplinaryService.getProfesionales(),
        disciplinaryService.getProfessionalsWorkload().catch(() => []),
      ]);

      const workloadMap = new Map((workload || []).map((w: any) => [String(w.id), w]));

      return (profesionales || []).map((p: any, idx: number) => {
        const load = workloadMap.get(String(p.id));
        const capacidadMaxima = Number(load?.capacidadMaxima || p.capacidadMaxima || 10);
        const procesosAsignados = Number(load?.procesosAsignados || p.procesosAsignados || 0);
        return {
          id: String(p.id ?? `prof-${idx + 1}`),
          nombre: p.nombre || p.fullName || 'Profesional',
          especialidad: p.especialidad || p.rol || 'Control Disciplinario',
          territorial: p.territorial || p.sede || 'Nacional',
          estado: (p.estado || 'activo').toLowerCase(),
          tipoContrato: p.tipoContrato || 'Planta',
          procesosAsignados,
          capacidadMaxima,
        };
      });
    } catch {
      return [];
    }
  },
};
