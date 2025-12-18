import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X,
  GraduationCap,
  BookOpen,
  Award,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  Clock,
  Users,
  TrendingUp,
  Star,
  ChevronRight,
  Building2,
  Briefcase,
  CheckCircle,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Megaphone,
  ExternalLink,
  UserCheck,
  Facebook,
  Twitter,
  Linkedin,
  History,
  ThumbsUp,
  Sparkles,
  Zap,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { toast } from 'sonner@2.0.3';

interface Convocatoria {
  id: string;
  titulo: string;
  año: number;
  estado: 'Ganada' | 'Participó' | 'En Proceso';
  tipo: 'Planta' | 'Cátedra' | 'Ocasional';
  departamento: string;
  fechaConvocatoria: string;
  fechaResultado?: string;
  documentos: {
    tipo: string;
    nombre: string;
    fecha: string;
    verificado: boolean;
    url?: string;
  }[];
}

interface Docente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  foto: string;
  departamento: string;
  titulo: string;
  especialidad: string;
  añosExperiencia: number;
  antiguedadEsap: number;
  estado: 'Activo' | 'Licencia' | 'Inactivo' | 'Histórico';
  tipoVinculacion: 'Planta' | 'Cátedra' | 'Ocasional' | 'Desvinculado';
  materiasActuales: string[];
  materiasHistoricas: string[];
  publicaciones: number;
  investigaciones: number;
  calificacionPromedio: number;
  totalEstudiantes: number;
  horarioAtencion: string;
  oficina: string;
  bio: string;
  intereses: string[];
  redesSociales: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  logros: string[];
  documentos: {
    tipo: string;
    nombre: string;
    fecha: string;
    verificado: boolean;
  }[];
  convocatorias: Convocatoria[];
  trazabilidad: {
    fecha: string;
    evento: string;
    detalle: string;
  }[];
  likes: number;
  mensajes: number;
}

// Mock data expandido con docentes actuales e históricos
const mockDocentes: Docente[] = [
  {
    id: '1',
    nombre: 'Dr. Carlos Andrés Martínez',
    email: 'carlos.martinez@esap.edu.co',
    telefono: '+57 301 234 5678',
    foto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    departamento: 'Administración Pública',
    titulo: 'Doctor en Ciencias Políticas',
    especialidad: 'Gestión Pública y Políticas Territoriales',
    añosExperiencia: 15,
    antiguedadEsap: 8,
    estado: 'Activo',
    tipoVinculacion: 'Planta',
    bio: 'Apasionado por transformar la administración pública en Colombia. Me encanta enseñar y compartir conocimiento con las nuevas generaciones de servidores públicos.',
    intereses: ['Políticas Públicas', 'Descentralización', 'Gobernanza Local', 'Innovación Pública'],
    redesSociales: {
      linkedin: 'linkedin.com/in/carlosmartinez',
      twitter: '@carlosmartinezesap'
    },
    logros: [
      '🏆 Premio Nacional de Investigación en Administración Pública 2023',
      '📚 Autor de 3 libros sobre gestión territorial',
      '🎓 Mentor de más de 50 tesis de maestría'
    ],
    materiasActuales: [
      'Administración Pública Territorial',
      'Políticas Públicas Avanzadas',
      'Gestión del Desarrollo Local'
    ],
    materiasHistoricas: [
      'Fundamentos de Administración Pública',
      'Teoría del Estado',
      'Descentralización y Autonomía'
    ],
    publicaciones: 24,
    investigaciones: 8,
    calificacionPromedio: 4.8,
    totalEstudiantes: 342,
    horarioAtencion: 'Lunes a Viernes 2:00 PM - 4:00 PM',
    oficina: 'Edificio A - Oficina 305',
    documentos: [
      { tipo: 'Hoja de Vida', nombre: 'CV_Carlos_Martinez_2024.pdf', fecha: '2024-01-15', verificado: true },
      { tipo: 'Título Doctoral', nombre: 'PhD_Ciencias_Politicas.pdf', fecha: '2015-06-20', verificado: true },
      { tipo: 'Certificado Docente', nombre: 'Cert_Docencia_Universitaria.pdf', fecha: '2016-03-10', verificado: true }
    ],
    convocatorias: [
      {
        id: 'conv-1',
        titulo: 'Convocatoria Docente de Planta 2016',
        año: 2016,
        estado: 'Ganada',
        tipo: 'Planta',
        departamento: 'Administración Pública',
        fechaConvocatoria: '2016-08-15',
        fechaResultado: '2016-11-30',
        documentos: [
          { tipo: 'Propuesta Académica', nombre: 'Propuesta_Martinez_2016.pdf', fecha: '2016-09-10', verificado: true },
          { tipo: 'Acta de Nombramiento', nombre: 'Acta_Nombramiento_001.pdf', fecha: '2016-12-01', verificado: true }
        ]
      }
    ],
    trazabilidad: [
      { fecha: '2024-11-15', evento: 'Inició semestre 2024-2', detalle: 'Asignación de 3 materias - 120 estudiantes' },
      { fecha: '2024-10-20', evento: 'Publicación académica', detalle: 'Artículo en Revista de Administración Pública' },
      { fecha: '2024-09-05', evento: 'Dirección de tesis', detalle: 'Aprobada tesis de maestría - Estudiante: Ana López' }
    ],
    likes: 156,
    mensajes: 42
  },
  {
    id: '2',
    nombre: 'Dra. María Fernanda Rojas',
    email: 'maria.rojas@esap.edu.co',
    telefono: '+57 301 876 5432',
    foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    departamento: 'Economía y Finanzas',
    titulo: 'Doctora en Economía Pública',
    especialidad: 'Finanzas Públicas y Presupuesto',
    añosExperiencia: 12,
    antiguedadEsap: 6,
    estado: 'Activo',
    tipoVinculacion: 'Planta',
    bio: 'Economista con pasión por enseñar finanzas públicas de forma práctica y aplicada. Creo en la educación como motor de cambio social.',
    intereses: ['Presupuesto Público', 'Finanzas Territoriales', 'Economía del Comportamiento', 'Transparencia Fiscal'],
    redesSociales: {
      linkedin: 'linkedin.com/in/mariarojas',
      twitter: '@mfrojaseconomia'
    },
    logros: [
      '💰 Consultora del Banco Mundial en proyectos de transparencia fiscal',
      '📊 Creadora del curso online "Finanzas Públicas para Todos"',
      '✨ Reconocimiento Mejores Docentes ESAP 2022'
    ],
    materiasActuales: [
      'Finanzas Públicas',
      'Presupuesto Público',
      'Economía del Sector Público'
    ],
    materiasHistoricas: [
      'Microeconomía',
      'Macroeconomía',
      'Estadística Aplicada'
    ],
    publicaciones: 18,
    investigaciones: 5,
    calificacionPromedio: 4.6,
    totalEstudiantes: 280,
    horarioAtencion: 'Martes y Jueves 3:00 PM - 5:00 PM',
    oficina: 'Edificio B - Oficina 210',
    documentos: [
      { tipo: 'Hoja de Vida', nombre: 'CV_Maria_Rojas_2024.pdf', fecha: '2024-02-01', verificado: true },
      { tipo: 'Título Doctoral', nombre: 'PhD_Economia_Publica.pdf', fecha: '2017-08-15', verificado: true },
      { tipo: 'Certificaciones', nombre: 'Cert_Finanzas_Publicas.pdf', fecha: '2018-05-20', verificado: true }
    ],
    convocatorias: [
      {
        id: 'conv-2',
        titulo: 'Convocatoria Docente de Planta 2018',
        año: 2018,
        estado: 'Ganada',
        tipo: 'Planta',
        departamento: 'Economía y Finanzas',
        fechaConvocatoria: '2018-06-10',
        fechaResultado: '2018-10-15',
        documentos: [
          { tipo: 'Propuesta de Investigación', nombre: 'Propuesta_Rojas_2018.pdf', fecha: '2018-07-20', verificado: true },
          { tipo: 'Acta de Nombramiento', nombre: 'Acta_Nombramiento_018.pdf', fecha: '2018-10-20', verificado: true }
        ]
      }
    ],
    trazabilidad: [
      { fecha: '2024-11-12', evento: 'Conferencia internacional', detalle: 'Ponencia: "Innovación en Finanzas Públicas"' },
      { fecha: '2024-10-30', evento: 'Actualización curricular', detalle: 'Rediseño del syllabus de Presupuesto Público' },
      { fecha: '2024-09-18', evento: 'Investigación aprobada', detalle: 'Proyecto: Transparencia Fiscal en Colombia' }
    ],
    likes: 203,
    mensajes: 67
  },
  {
    id: '3',
    nombre: 'Mg. Juan Pablo Gómez',
    email: 'juan.gomez@esap.edu.co',
    telefono: '+57 301 456 7890',
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    departamento: 'Derecho Público',
    titulo: 'Magíster en Derecho Administrativo',
    especialidad: 'Contratación Estatal y Regulación',
    añosExperiencia: 10,
    antiguedadEsap: 5,
    estado: 'Activo',
    tipoVinculacion: 'Cátedra',
    bio: 'Abogado litigante y docente. Me apasiona hacer que el derecho administrativo sea comprensible y aplicable para todos.',
    intereses: ['Contratación Estatal', 'Derecho Administrativo', 'Control Fiscal', 'Regulación Económica'],
    redesSociales: {
      linkedin: 'linkedin.com/in/juangomez',
      facebook: 'JuanGomezDerecho'
    },
    logros: [
      '⚖️ Litigante en casos emblemáticos de contratación estatal',
      '📖 Columnista semanal en El Espectador sobre derecho público',
      '🎤 Speaker en más de 30 conferencias nacionales'
    ],
    materiasActuales: [
      'Derecho Administrativo',
      'Contratación Estatal',
      'Régimen Jurídico de lo Público'
    ],
    materiasHistoricas: [
      'Introducción al Derecho',
      'Derecho Constitucional',
      'Control Fiscal'
    ],
    publicaciones: 12,
    investigaciones: 3,
    calificacionPromedio: 4.7,
    totalEstudiantes: 310,
    horarioAtencion: 'Lunes, Miércoles y Viernes 10:00 AM - 12:00 PM',
    oficina: 'Edificio A - Oficina 412',
    documentos: [
      { tipo: 'Hoja de Vida', nombre: 'CV_Juan_Gomez_2024.pdf', fecha: '2024-01-20', verificado: true },
      { tipo: 'Título Maestría', nombre: 'Maestria_Derecho_Admin.pdf', fecha: '2018-12-10', verificado: true },
      { tipo: 'Certificado Docente', nombre: 'Cert_Docencia_2024.pdf', fecha: '2024-01-05', verificado: true }
    ],
    convocatorias: [
      {
        id: 'conv-3',
        titulo: 'Convocatoria Docente Cátedra 2019',
        año: 2019,
        estado: 'Ganada',
        tipo: 'Cátedra',
        departamento: 'Derecho Público',
        fechaConvocatoria: '2019-03-15',
        fechaResultado: '2019-05-20',
        documentos: [
          { tipo: 'Plan de Trabajo Académico', nombre: 'Plan_Gomez_2019.pdf', fecha: '2019-04-10', verificado: true },
          { tipo: 'Contrato Cátedra', nombre: 'Contrato_Catedra_019.pdf', fecha: '2019-06-01', verificado: true }
        ]
      },
      {
        id: 'conv-4',
        titulo: 'Renovación Cátedra 2022',
        año: 2022,
        estado: 'Ganada',
        tipo: 'Cátedra',
        departamento: 'Derecho Público',
        fechaConvocatoria: '2022-01-10',
        fechaResultado: '2022-02-28',
        documentos: [
          { tipo: 'Evaluación de Desempeño', nombre: 'Eval_Gomez_2022.pdf', fecha: '2022-01-25', verificado: true },
          { tipo: 'Renovación Contrato', nombre: 'Renovacion_2022.pdf', fecha: '2022-03-01', verificado: true }
        ]
      }
    ],
    trazabilidad: [
      { fecha: '2024-11-10', evento: 'Asesoría institucional', detalle: 'Consultoría para entidad territorial en contratación' },
      { fecha: '2024-10-25', evento: 'Capacitación docente', detalle: 'Diplomado en Nuevas Tecnologías Educativas' },
      { fecha: '2024-09-12', evento: 'Revisión de programas', detalle: 'Actualización del plan de estudios - Derecho Público' }
    ],
    likes: 189,
    mensajes: 54
  },
  {
    id: '4',
    nombre: 'Dra. Ana María Torres',
    email: 'ana.torres@esap.edu.co',
    telefono: '+57 301 234 9876',
    foto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    departamento: 'Ciencias Sociales',
    titulo: 'Doctora en Sociología',
    especialidad: 'Desarrollo Social y Participación Comunitaria',
    añosExperiencia: 14,
    antiguedadEsap: 7,
    estado: 'Activo',
    tipoVinculacion: 'Planta',
    bio: 'Socióloga comprometida con el desarrollo comunitario. Creo en la investigación participativa y el empoderamiento social.',
    intereses: ['Participación Ciudadana', 'Desarrollo Comunitario', 'Métodos Cualitativos', 'Justicia Social'],
    redesSociales: {
      linkedin: 'linkedin.com/in/anatorres',
      twitter: '@anatorresesap',
      facebook: 'DraAnaTorres'
    },
    logros: [
      '🌟 Premio a la Excelencia Docente ESAP 2024',
      '📕 Autora del libro "Participación Ciudadana en Colombia"',
      '🤝 Fundadora de 5 proyectos de extensión comunitaria'
    ],
    materiasActuales: [
      'Sociología de las Organizaciones',
      'Desarrollo Comunitario',
      'Métodos de Investigación Social'
    ],
    materiasHistoricas: [
      'Teoría Sociológica',
      'Problemas Sociales Contemporáneos',
      'Análisis Cualitativo'
    ],
    publicaciones: 21,
    investigaciones: 6,
    calificacionPromedio: 4.9,
    totalEstudiantes: 295,
    horarioAtencion: 'Martes a Jueves 1:00 PM - 3:00 PM',
    oficina: 'Edificio C - Oficina 108',
    documentos: [
      { tipo: 'Hoja de Vida', nombre: 'CV_Ana_Torres_2024.pdf', fecha: '2024-02-10', verificado: true },
      { tipo: 'Título Doctoral', nombre: 'PhD_Sociologia.pdf', fecha: '2016-11-30', verificado: true },
      { tipo: 'Reconocimientos', nombre: 'Premio_Investigacion_2023.pdf', fecha: '2023-12-05', verificado: true }
    ],
    convocatorias: [
      {
        id: 'conv-5',
        titulo: 'Convocatoria Docente de Planta 2017',
        año: 2017,
        estado: 'Ganada',
        tipo: 'Planta',
        departamento: 'Ciencias Sociales',
        fechaConvocatoria: '2017-05-10',
        fechaResultado: '2017-09-15',
        documentos: [
          { tipo: 'Proyecto de Investigación', nombre: 'Proyecto_Torres_2017.pdf', fecha: '2017-06-20', verificado: true },
          { tipo: 'Acta de Posesión', nombre: 'Acta_Posesion_017.pdf', fecha: '2017-10-01', verificado: true }
        ]
      }
    ],
    trazabilidad: [
      { fecha: '2024-11-08', evento: 'Premio académico', detalle: 'Reconocimiento a la Excelencia Docente 2024' },
      { fecha: '2024-10-15', evento: 'Proyecto de extensión', detalle: 'Alianza con comunidad indígena - Chocó' },
      { fecha: '2024-09-20', evento: 'Publicación libro', detalle: 'Lanzamiento: "Participación Ciudadana en Colombia"' }
    ],
    likes: 312,
    mensajes: 98
  },
  {
    id: '5',
    nombre: 'Mg. Roberto Silva',
    email: 'roberto.silva@esap.edu.co',
    telefono: '+57 301 567 8901',
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    departamento: 'Tecnología y Sistemas',
    titulo: 'Magíster en Gestión de TI',
    especialidad: 'Gobierno Digital y Transformación Tecnológica',
    añosExperiencia: 8,
    antiguedadEsap: 3,
    estado: 'Activo',
    tipoVinculacion: 'Cátedra',
    bio: 'Tech enthusiast y docente innovador. Apasionado por llevar la transformación digital al sector público colombiano.',
    intereses: ['Gobierno Digital', 'Inteligencia Artificial', 'Ciberseguridad', 'Innovación Pública'],
    redesSociales: {
      linkedin: 'linkedin.com/in/robertosilva',
      twitter: '@robertosilvatech'
    },
    logros: [
      '🚀 Organizador del GovTech Challenge ESAP',
      '💻 Desarrollador de 3 plataformas de gobierno digital',
      '🎯 Google Cloud Professional Architect'
    ],
    materiasActuales: [
      'Gobierno Electrónico',
      'Gestión de Proyectos TI',
      'Innovación Digital en el Estado'
    ],
    materiasHistoricas: [
      'Sistemas de Información',
      'Bases de Datos',
      'Seguridad Informática'
    ],
    publicaciones: 9,
    investigaciones: 4,
    calificacionPromedio: 4.5,
    totalEstudiantes: 220,
    horarioAtencion: 'Lunes y Miércoles 4:00 PM - 6:00 PM',
    oficina: 'Edificio B - Oficina 315',
    documentos: [
      { tipo: 'Hoja de Vida', nombre: 'CV_Roberto_Silva_2024.pdf', fecha: '2024-03-01', verificado: true },
      { tipo: 'Título Maestría', nombre: 'Maestria_Gestion_TI.pdf', fecha: '2019-07-20', verificado: true },
      { tipo: 'Certificaciones', nombre: 'Cert_Google_Cloud_Professional.pdf', fecha: '2023-05-15', verificado: true }
    ],
    convocatorias: [
      {
        id: 'conv-6',
        titulo: 'Convocatoria Cátedra Tecnología 2021',
        año: 2021,
        estado: 'Ganada',
        tipo: 'Cátedra',
        departamento: 'Tecnología y Sistemas',
        fechaConvocatoria: '2021-07-15',
        fechaResultado: '2021-09-10',
        documentos: [
          { tipo: 'Propuesta Innovación', nombre: 'Propuesta_Silva_2021.pdf', fecha: '2021-08-05', verificado: true },
          { tipo: 'Contrato Cátedra', nombre: 'Contrato_021.pdf', fecha: '2021-09-20', verificado: true }
        ]
      }
    ],
    trazabilidad: [
      { fecha: '2024-11-05', evento: 'Hackathon universitario', detalle: 'Organización: GovTech Challenge ESAP 2024' },
      { fecha: '2024-10-18', evento: 'Capacitación técnica', detalle: 'Taller: Inteligencia Artificial en el Sector Público' },
      { fecha: '2024-09-22', evento: 'Colaboración empresarial', detalle: 'Convenio con MinTIC - Transformación Digital' }
    ],
    likes: 245,
    mensajes: 73
  },
  {
    id: '6',
    nombre: 'Dra. Claudia Hernández',
    email: 'claudia.hernandez@esap.edu.co',
    telefono: '+57 301 678 9012',
    foto: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
    departamento: 'Planificación y Desarrollo',
    titulo: 'Doctora en Desarrollo Territorial',
    especialidad: 'Ordenamiento Territorial y Planificación Urbana',
    añosExperiencia: 16,
    antiguedadEsap: 9,
    estado: 'Licencia',
    tipoVinculacion: 'Planta',
    bio: 'Urbanista y planificadora territorial. Actualmente en licencia sabática investigando Smart Cities en Barcelona.',
    intereses: ['Ordenamiento Territorial', 'Smart Cities', 'Desarrollo Sostenible', 'Planificación Urbana'],
    redesSociales: {
      linkedin: 'linkedin.com/in/claudiahernandez'
    },
    logros: [
      '🏙️ Investigación postdoctoral en Universidad de Barcelona',
      '🌍 Consultora de la ONU en proyectos de desarrollo urbano',
      '📚 3 libros publicados sobre planificación territorial'
    ],
    materiasActuales: [],
    materiasHistoricas: [
      'Ordenamiento Territorial',
      'Planificación Estratégica',
      'Desarrollo Regional',
      'Análisis Espacial'
    ],
    publicaciones: 28,
    investigaciones: 10,
    calificacionPromedio: 4.8,
    totalEstudiantes: 405,
    horarioAtencion: 'En Licencia Sabática',
    oficina: 'Edificio A - Oficina 220',
    documentos: [
      { tipo: 'Hoja de Vida', nombre: 'CV_Claudia_Hernandez_2024.pdf', fecha: '2024-01-10', verificado: true },
      { tipo: 'Título Doctoral', nombre: 'PhD_Desarrollo_Territorial.pdf', fecha: '2014-09-15', verificado: true },
      { tipo: 'Licencia Sabática', nombre: 'Licencia_Sabatica_2024.pdf', fecha: '2024-08-01', verificado: true }
    ],
    convocatorias: [
      {
        id: 'conv-7',
        titulo: 'Convocatoria Docente de Planta 2015',
        año: 2015,
        estado: 'Ganada',
        tipo: 'Planta',
        departamento: 'Planificación y Desarrollo',
        fechaConvocatoria: '2015-04-20',
        fechaResultado: '2015-08-30',
        documentos: [
          { tipo: 'Tesis Doctoral', nombre: 'Tesis_Hernandez_2015.pdf', fecha: '2015-05-10', verificado: true },
          { tipo: 'Acta de Nombramiento', nombre: 'Acta_015.pdf', fecha: '2015-09-01', verificado: true }
        ]
      }
    ],
    trazabilidad: [
      { fecha: '2024-08-01', evento: 'Licencia sabática aprobada', detalle: 'Investigación postdoctoral en Universidad de Barcelona' },
      { fecha: '2024-07-15', evento: 'Cierre de semestre', detalle: 'Finalización de 4 materias - Semestre 2024-1' },
      { fecha: '2024-06-10', evento: 'Dirección de investigación', detalle: 'Proyecto aprobado: Smart Cities en Colombia' }
    ],
    likes: 278,
    mensajes: 61
  }
];

export function DocentesSection() {
  const [docentes] = useState<Docente[]>(mockDocentes.filter(d => d.estado !== 'Histórico' && d.estado !== 'Inactivo'));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartamento, setFilterDepartamento] = useState<string>('all');
  const [filterTipoVinculacion, setFilterTipoVinculacion] = useState<string>('all');
  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null);
  const [activeTab, setActiveTab] = useState<'perfil' | 'materias' | 'convocatorias' | 'documentos'>('perfil');

  // Filtros
  const filteredDocentes = docentes.filter(docente => {
    const matchesSearch = docente.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         docente.especialidad.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         docente.intereses.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDepartamento = filterDepartamento === 'all' || docente.departamento === filterDepartamento;
    const matchesTipoVinculacion = filterTipoVinculacion === 'all' || docente.tipoVinculacion === filterTipoVinculacion;
    
    return matchesSearch && matchesDepartamento && matchesTipoVinculacion;
  });

  const departamentos = Array.from(new Set(mockDocentes.map(d => d.departamento)));

  // Helper para color de badge según tipo de vinculación
  const getTipoVinculacionColor = (tipo: string) => {
    switch (tipo) {
      case 'Planta':
        return 'bg-blue-500 text-white';
      case 'Cátedra':
        return 'bg-purple-500 text-white';
      case 'Ocasional':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Handler para dar like
  const handleLike = (docenteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success('¡Te gusta este docente! 💙', {
      description: 'Guardado en tus favoritos'
    });
  };

  // Handler para enviar mensaje
  const handleMessage = (docenteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success('Abriendo chat...', {
      description: 'Podrás conversar con el docente'
    });
  };

  // Handler para compartir
  const handleShare = (docente: Docente, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success(`Compartiendo perfil de ${docente.nombre}`, {
      description: 'Enlace copiado al portapapeles'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#1e5da8] via-blue-600 to-blue-700 text-white py-12 lg:py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -ml-48 -mb-48" />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <GraduationCap className="w-12 h-12" />
              <h1 className="text-4xl lg:text-5xl font-black">
                Conoce a Nuestros Docentes
              </h1>
            </div>
            <p className="text-xl text-blue-100 mb-8">
              Expertos apasionados que transforman la educación pública en Colombia
            </p>
            
            {/* Stats sociales */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-3xl font-black">{docentes.length}</p>
                <p className="text-sm text-blue-100">Docentes Activos</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-3xl font-black">{docentes.reduce((sum, d) => sum + d.totalEstudiantes, 0)}</p>
                <p className="text-sm text-blue-100">Estudiantes</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-3xl font-black">{docentes.reduce((sum, d) => sum + d.publicaciones, 0)}</p>
                <p className="text-sm text-blue-100">Publicaciones</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Filtros modernos */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Búsqueda principal */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Busca por nombre, especialidad o intereses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-12 h-12 text-base border-2 border-gray-200 focus:border-[#1e5da8] rounded-xl"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Filtros pills */}
              <div className="flex gap-3">
                <select
                  value={filterDepartamento}
                  onChange={(e) => setFilterDepartamento(e.target.value)}
                  className="px-5 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#1e5da8] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <option value="all">📚 Departamento</option>
                  {departamentos.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <select
                  value={filterTipoVinculacion}
                  onChange={(e) => setFilterTipoVinculacion(e.target.value)}
                  className="px-5 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#1e5da8] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <option value="all">👥 Tipo</option>
                  <option value="Planta">🏢 Planta</option>
                  <option value="Cátedra">📖 Cátedra</option>
                  <option value="Ocasional">⏱️ Ocasional</option>
                </select>
              </div>
            </div>

            {/* Tags de filtros activos */}
            {(searchQuery || filterDepartamento !== 'all' || filterTipoVinculacion !== 'all') && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Filtros activos:</span>
                {searchQuery && (
                  <Badge className="bg-[#1e5da8] text-white px-3 py-1">
                    Búsqueda: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="ml-2 hover:text-gray-200">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filterDepartamento !== 'all' && (
                  <Badge className="bg-purple-500 text-white px-3 py-1">
                    {filterDepartamento}
                    <button onClick={() => setFilterDepartamento('all')} className="ml-2 hover:text-gray-200">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filterTipoVinculacion !== 'all' && (
                  <Badge className="bg-amber-500 text-white px-3 py-1">
                    {filterTipoVinculacion}
                    <button onClick={() => setFilterTipoVinculacion('all')} className="ml-2 hover:text-gray-200">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterDepartamento('all');
                    setFilterTipoVinculacion('all');
                  }}
                  className="text-sm text-gray-600 hover:text-[#1e5da8] font-semibold"
                >
                  Limpiar todos
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Grid de Docentes - Estilo Social */}
        {filteredDocentes.length > 0 ? (
          <motion.div 
            layout
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredDocentes.map((docente) => (
              <motion.div
                key={docente.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <Card 
                  className="overflow-hidden cursor-pointer border-2 border-transparent hover:border-[#1e5da8] transition-all duration-300 group bg-white shadow-md hover:shadow-2xl"
                  onClick={() => setSelectedDocente(docente)}
                >
                  {/* Header con foto grande */}
                  <div className="relative h-48 bg-gradient-to-br from-[#1e5da8] to-blue-600 overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl" />
                    </div>
                    
                    {/* Badge de tipo de vinculación */}
                    <Badge className={`absolute top-4 right-4 ${getTipoVinculacionColor(docente.tipoVinculacion)} border-0 shadow-lg`}>
                      {docente.tipoVinculacion}
                    </Badge>

                    {/* Avatar centrado */}
                    <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
                      <div className="relative">
                        <Avatar className="w-32 h-32 ring-4 ring-white shadow-xl group-hover:ring-[#1e5da8] transition-all">
                          <AvatarImage src={docente.foto} alt={docente.nombre} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-[#1e5da8] to-blue-600 text-white text-2xl">
                            {docente.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Indicador de estado activo */}
                        {docente.estado === 'Activo' && (
                          <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full ring-4 ring-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  <CardContent className="pt-20 px-6 pb-6">
                    {/* Nombre y título */}
                    <div className="text-center mb-4">
                      <h3 className="font-black text-gray-900 text-lg mb-1 group-hover:text-[#1e5da8] transition-colors">
                        {docente.nombre}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{docente.titulo}</p>
                      <Badge variant="secondary" className="text-xs">
                        {docente.departamento}
                      </Badge>
                    </div>

                    {/* Bio corta */}
                    <p className="text-sm text-gray-600 text-center mb-4 line-clamp-2">
                      {docente.bio}
                    </p>

                    <Separator className="mb-4" />

                    {/* Stats en formato social */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        </div>
                        <p className="font-black text-gray-900">{docente.calificacionPromedio}</p>
                        <p className="text-[10px] text-gray-600">Rating</p>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Users className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                        <p className="font-black text-gray-900">{docente.totalEstudiantes}</p>
                        <p className="text-[10px] text-gray-600">Estudiantes</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FileText className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <p className="font-black text-gray-900">{docente.publicaciones}</p>
                        <p className="text-[10px] text-gray-600">Papers</p>
                      </div>
                    </div>

                    {/* Intereses como tags */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {docente.intereses.slice(0, 3).map((interes, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="text-[10px] bg-white hover:bg-[#1e5da8] hover:text-white transition-colors"
                          >
                            {interes}
                          </Badge>
                        ))}
                        {docente.intereses.length > 3 && (
                          <Badge variant="outline" className="text-[10px] bg-gray-100">
                            +{docente.intereses.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Acciones sociales */}
                    <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={(e) => handleLike(docente.id, e)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-500 transition-all group/like"
                      >
                        <Heart className="w-4 h-4 group-hover/like:fill-red-500" />
                        <span className="text-xs font-semibold">{docente.likes}</span>
                      </button>
                      <button
                        onClick={(e) => handleMessage(docente.id, e)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-[#1e5da8] transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs font-semibold">{docente.mensajes}</span>
                      </button>
                      <button
                        onClick={(e) => handleShare(docente, e)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-green-50 text-gray-600 hover:text-green-600 transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="text-xs font-semibold">Share</span>
                      </button>
                    </div>

                    {/* Botón de ver perfil */}
                    <Button 
                      className="w-full mt-4 bg-gradient-to-r from-[#1e5da8] to-blue-600 hover:from-[#174a8a] hover:to-blue-700 text-white shadow-md group-hover:shadow-lg transition-all gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocente(docente);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      Ver Perfil Completo
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-16 text-center">
              <GraduationCap className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 text-xl mb-2">No encontramos docentes</h3>
              <p className="text-gray-600 mb-6">
                Intenta ajustar tus filtros de búsqueda
              </p>
              <Button 
                onClick={() => {
                  setSearchQuery('');
                  setFilterDepartamento('all');
                  setFilterTipoVinculacion('all');
                }}
                className="bg-[#1e5da8] hover:bg-[#174a8a]"
              >
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer del Landing */}
      <footer className="bg-gray-900 text-gray-300 py-16 lg:py-20 mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            {/* Brand */}
            <div>
              <div className="h-12 w-12 mb-6 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-lg tracking-tight">
                ESAP
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Transformando la educación pública en Colombia con tecnología de clase mundial.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-[#1e5da8] rounded-lg flex items-center justify-center transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Enlaces Rápidos */}
            <div>
              <h3 className="text-white font-bold mb-4">Enlaces Rápidos</h3>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nosotros</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Programas Académicos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Investigación</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreras</a></li>
              </ul>
            </div>

            {/* Servicios */}
            <div>
              <h3 className="text-white font-bold mb-4">Servicios</h3>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-white transition-colors">Vinculaciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Verificación de Títulos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Biblioteca Digital</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Campus Virtual</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Soporte Técnico</a></li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-white font-bold mb-4">Contacto</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#1e5da8] flex-shrink-0 mt-1" />
                  <span className="text-sm">Calle 44 No. 53-37 CAN<br />Bogotá, Colombia</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#1e5da8] flex-shrink-0" />
                  <span className="text-sm">+57 (1) 220 0700</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#1e5da8] flex-shrink-0" />
                  <span className="text-sm">info@esap.edu.co</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 ESAP - Escuela Superior de Administración Pública. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de Perfil - SIGUIENTE PARTE */}
      <AnimatePresence>
        {selectedDocente && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedDocente(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full my-8 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal - estilo social */}
              <div className="relative h-64 bg-gradient-to-br from-[#1e5da8] via-blue-600 to-blue-700 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
                </div>
                
                <button
                  onClick={() => setSelectedDocente(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Avatar y nombre centrados */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 text-center">
                  <Avatar className="w-40 h-40 ring-8 ring-white shadow-2xl mx-auto mb-4">
                    <AvatarImage src={selectedDocente.foto} alt={selectedDocente.nombre} />
                    <AvatarFallback className="bg-gradient-to-br from-[#1e5da8] to-blue-600 text-white text-4xl">
                      {selectedDocente.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Badges flotantes */}
                <div className="absolute top-6 left-6 flex flex-col gap-2">
                  <Badge className={`${getTipoVinculacionColor(selectedDocente.tipoVinculacion)} border-0 shadow-lg`}>
                    {selectedDocente.tipoVinculacion}
                  </Badge>
                  {selectedDocente.estado === 'Activo' && (
                    <Badge className="bg-green-500 text-white border-0 shadow-lg flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      En Línea
                    </Badge>
                  )}
                </div>
              </div>

              {/* Info principal */}
              <div className="pt-24 pb-8 px-8 text-center border-b border-gray-100">
                <h2 className="text-3xl font-black text-gray-900 mb-2">{selectedDocente.nombre}</h2>
                <p className="text-lg text-gray-600 mb-3">{selectedDocente.titulo}</p>
                <Badge variant="secondary" className="mb-4">{selectedDocente.departamento}</Badge>
                
                <p className="text-gray-700 max-w-2xl mx-auto mb-6 leading-relaxed">
                  {selectedDocente.bio}
                </p>

                {/* Acciones sociales principales */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <Button className="gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg">
                    <Heart className="w-4 h-4" />
                    Me Gusta ({selectedDocente.likes})
                  </Button>
                  <Button className="gap-2 bg-gradient-to-r from-[#1e5da8] to-blue-600 hover:from-[#174a8a] hover:to-blue-700 text-white shadow-lg">
                    <MessageCircle className="w-4 h-4" />
                    Enviar Mensaje
                  </Button>
                  <Button variant="outline" className="gap-2 border-2">
                    <Share2 className="w-4 h-4" />
                    Compartir
                  </Button>
                </div>

                {/* Stats destacados */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl">
                    <Star className="w-6 h-6 text-amber-500 fill-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-black text-gray-900">{selectedDocente.calificacionPromedio}</p>
                    <p className="text-xs text-gray-600">Calificación</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-black text-gray-900">{selectedDocente.totalEstudiantes}</p>
                    <p className="text-xs text-gray-600">Estudiantes</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
                    <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-black text-gray-900">{selectedDocente.publicaciones}</p>
                    <p className="text-xs text-gray-600">Publicaciones</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-black text-gray-900">{selectedDocente.investigaciones}</p>
                    <p className="text-xs text-gray-600">Investigaciones</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl">
                    <Megaphone className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-black text-gray-900">{selectedDocente.convocatorias.length}</p>
                    <p className="text-xs text-gray-600">Convocatorias</p>
                  </div>
                </div>
              </div>

              {/* Tabs de navegación */}
              <div className="border-b border-gray-200 px-8">
                <div className="flex gap-1 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('perfil')}
                    className={`px-6 py-4 font-semibold transition-all relative ${
                      activeTab === 'perfil'
                        ? 'text-[#1e5da8]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 inline mr-2" />
                    Perfil
                    {activeTab === 'perfil' && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-[#1e5da8] rounded-t"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('materias')}
                    className={`px-6 py-4 font-semibold transition-all relative ${
                      activeTab === 'materias'
                        ? 'text-[#1e5da8]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Materias
                    {activeTab === 'materias' && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-[#1e5da8] rounded-t"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('convocatorias')}
                    className={`px-6 py-4 font-semibold transition-all relative ${
                      activeTab === 'convocatorias'
                        ? 'text-[#1e5da8]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Megaphone className="w-4 h-4 inline mr-2" />
                    Convocatorias
                    {activeTab === 'convocatorias' && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-[#1e5da8] rounded-t"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('documentos')}
                    className={`px-6 py-4 font-semibold transition-all relative ${
                      activeTab === 'documentos'
                        ? 'text-[#1e5da8]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Documentos
                    {activeTab === 'documentos' && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-[#1e5da8] rounded-t"
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Contenido de tabs */}
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <AnimatePresence mode="wait">
                  {activeTab === 'perfil' && (
                    <motion.div
                      key="perfil"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {/* Logros destacados */}
                      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-amber-900">
                            <Award className="w-5 h-5" />
                            Logros Destacados
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedDocente.logros.map((logro, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
                              <p className="text-gray-700 flex-1">{logro}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Intereses */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-[#1e5da8]" />
                            Áreas de Interés
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedDocente.intereses.map((interes, idx) => (
                              <Badge key={idx} className="bg-[#1e5da8] text-white hover:bg-[#174a8a] text-sm px-4 py-2">
                                {interes}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Contacto y Redes */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Mail className="w-4 h-4 text-[#1e5da8]" />
                              Información de Contacto
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <a href={`mailto:${selectedDocente.email}`} className="text-[#1e5da8] hover:underline">
                                {selectedDocente.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{selectedDocente.telefono}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{selectedDocente.oficina}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{selectedDocente.horarioAtencion}</span>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Share2 className="w-4 h-4 text-[#1e5da8]" />
                              Redes Sociales
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {selectedDocente.redesSociales.linkedin && (
                              <a 
                                href={`https://${selectedDocente.redesSociales.linkedin}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                              >
                                <Linkedin className="w-5 h-5 text-blue-600" />
                                <span className="text-blue-700 group-hover:underline">{selectedDocente.redesSociales.linkedin}</span>
                              </a>
                            )}
                            {selectedDocente.redesSociales.twitter && (
                              <a 
                                href={`https://twitter.com/${selectedDocente.redesSociales.twitter.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors group"
                              >
                                <Twitter className="w-5 h-5 text-sky-600" />
                                <span className="text-sky-700 group-hover:underline">{selectedDocente.redesSociales.twitter}</span>
                              </a>
                            )}
                            {selectedDocente.redesSociales.facebook && (
                              <a 
                                href={`https://facebook.com/${selectedDocente.redesSociales.facebook}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                              >
                                <Facebook className="w-5 h-5 text-blue-700" />
                                <span className="text-blue-800 group-hover:underline">{selectedDocente.redesSociales.facebook}</span>
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Actividad Reciente */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-[#1e5da8]" />
                            Actividad Reciente
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {selectedDocente.trazabilidad.slice(0, 5).map((evento, idx) => (
                              <div key={idx} className="flex gap-4">
                                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-[#1e5da8]" />
                                <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                                  <div className="flex items-start justify-between mb-1">
                                    <h4 className="font-semibold text-gray-900 text-sm">{evento.evento}</h4>
                                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{evento.fecha}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{evento.detalle}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {activeTab === 'materias' && (
                    <motion.div
                      key="materias"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {selectedDocente.materiasActuales.length > 0 && (
                        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-900">
                              <Zap className="w-5 h-5" />
                              Materias Actuales (Semestre 2024-2)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid sm:grid-cols-2 gap-4">
                              {selectedDocente.materiasActuales.map((materia, idx) => (
                                <div 
                                  key={idx}
                                  className="p-4 bg-white border-2 border-green-200 rounded-xl flex items-center gap-3 hover:shadow-md transition-all"
                                >
                                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                  <span className="font-semibold text-gray-900">{materia}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {selectedDocente.materiasHistoricas.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <History className="w-5 h-5 text-[#1e5da8]" />
                              Materias que ha Dictado
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {selectedDocente.materiasHistoricas.map((materia, idx) => (
                                <Badge key={idx} variant="outline" className="text-sm px-3 py-1.5">
                                  {materia}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'convocatorias' && (
                    <motion.div
                      key="convocatorias"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {selectedDocente.convocatorias.map((conv) => (
                        <Card key={conv.id} className="border-2 border-[#1e5da8]/20 hover:border-[#1e5da8] transition-all">
                          <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                            <CardTitle className="flex items-center gap-2">
                              <Megaphone className="w-5 h-5 text-[#1e5da8]" />
                              {conv.titulo}
                            </CardTitle>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {conv.estado}
                              </Badge>
                              <Badge className={getTipoVinculacionColor(conv.tipo)}>
                                {conv.tipo}
                              </Badge>
                              <Badge variant="outline">
                                {conv.año}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Building2 className="w-4 h-4" />
                                  <span>{conv.departamento}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Calendar className="w-4 h-4" />
                                  <span>Convocatoria: {conv.fechaConvocatoria}</span>
                                </div>
                                {conv.fechaResultado && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span>Resultado: {conv.fechaResultado}</span>
                                  </div>
                                )}
                              </div>

                              {conv.documentos.length > 0 && (
                                <div className="pt-4 border-t border-gray-200">
                                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Documentos ({conv.documentos.length})
                                  </p>
                                  <div className="space-y-2">
                                    {conv.documentos.map((doc, docIdx) => (
                                      <div
                                        key={docIdx}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                      >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-gray-900 text-sm truncate">{doc.tipo}</p>
                                            <p className="text-xs text-gray-600 truncate">{doc.nombre}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                          <span className="text-xs text-gray-500">{doc.fecha}</span>
                                          {doc.verificado && (
                                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              Verificado
                                            </Badge>
                                          )}
                                          <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 px-2"
                                            onClick={() => {
                                              toast.success('Descargando documento...', {
                                                description: doc.nombre
                                              });
                                            }}
                                          >
                                            <Download className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </motion.div>
                  )}

                  {activeTab === 'documentos' && (
                    <motion.div
                      key="documentos"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#1e5da8]" />
                            Documentos y Certificaciones Personales
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedDocente.documentos.map((doc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-[#1e5da8] hover:shadow-md transition-all group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                  <FileText className="w-6 h-6 text-[#1e5da8]" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{doc.tipo}</p>
                                  <p className="text-sm text-gray-600">{doc.nombre}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500">{doc.fecha}</span>
                                {doc.verificado && (
                                  <Badge className="bg-green-100 text-green-700 border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verificado
                                  </Badge>
                                )}
                                <Button 
                                  variant="outline"
                                  size="sm" 
                                  className="gap-2"
                                  onClick={() => {
                                    toast.success('Descargando documento...', {
                                      description: doc.nombre
                                    });
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                  Descargar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
