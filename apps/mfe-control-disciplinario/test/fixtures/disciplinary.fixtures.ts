import type {
  AssignProcessDto,
  CreateNewsDto,
  DisciplinaryNews,
  DisciplinaryProcess,
} from '../../services/api/disciplinary.service';

export const createNewsDto: CreateNewsDto = {
  origen: 'QUEJOSO',
  fechaHechos: '2026-05-01',
  territorial: 'Territorial Bogota',
  dependenciaDenunciado: 'Direccion Academica',
  hechos: 'Presunto incumplimiento de funciones reportado por la dependencia.',
  conductas: ['Incumplimiento de deberes'],
  adjuntos: ['acta-inicial.pdf'],
  radicadorId: 'user-radicador-1',
  denunciante: {
    nombre: 'Laura Gomez',
    email: 'laura.gomez@example.com',
    cedula: '1000000001',
  },
  disciplinable: {
    nombre: 'Carlos Perez',
    cargo: 'Profesional Universitario',
    cedula: '1000000002',
    dependencia: 'Direccion Academica',
  },
};

export const createdNews: DisciplinaryNews = {
  id: 'news-1',
  radicado: 'ND-2026-0001',
  origen: 'QUEJOSO',
  fechaRecepcion: '2026-05-14T09:00:00.000Z',
  fechaHechos: '2026-05-01',
  territorial: createNewsDto.territorial,
  dependenciaDenunciado: createNewsDto.dependenciaDenunciado,
  hechos: createNewsDto.hechos,
  conductas: createNewsDto.conductas,
  adjuntos: createNewsDto.adjuntos,
  denunciante: createNewsDto.denunciante,
  disciplinable: createNewsDto.disciplinable,
  estado: 'RADICADA',
  radicadorId: createNewsDto.radicadorId,
  createdAt: '2026-05-14T09:00:00.000Z',
  updatedAt: '2026-05-14T09:00:00.000Z',
};

export const assignProcessDto: AssignProcessDto = {
  newsId: createdNews.id,
  abogadoId: 'prof-1',
  abogadoNombre: 'Diana Ruiz',
  observaciones: 'Asignacion inicial por carga disponible.',
};

export const assignedProcess: DisciplinaryProcess = {
  id: 'process-1',
  radicadoProceso: 'PD-2026-0001',
  etapaActual: 'Valoracion inicial',
  kanbanStage: 'valoracion-inicial',
  estado: 'ACTIVO',
  abogadoAsignadoId: assignProcessDto.abogadoId,
  abogadoAsignadoNombre: assignProcessDto.abogadoNombre,
  fechaPrescripcion: '2029-05-14',
  fechaVencimientoEtapa: '2026-06-14',
  news: {
    ...createdNews,
    estado: 'ASIGNADA',
  },
  createdAt: '2026-05-14T09:10:00.000Z',
  updatedAt: '2026-05-14T09:10:00.000Z',
};
