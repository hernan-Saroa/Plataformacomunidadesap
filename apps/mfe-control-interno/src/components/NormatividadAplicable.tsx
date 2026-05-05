/**
 * ============================================
 * NORMATIVIDAD APLICABLE - CONTROL INTERNO
 * ============================================
 * 
 * Documento maestro de normatividad aplicable al módulo de
 * Control Interno de Gestión para ESAP
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Scale,
  Shield,
  Lock,
  Eye,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Globe,
  Building,
  Users,
  Gavel,
  ListChecks,
  FileCheck,
  Landmark
} from 'lucide-react';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { InputSIGL } from '../gestion-legal/design-system/Input';

// ====================================
// TIPOS
// ====================================

type CategoriaLey = 
  | 'Control Interno'
  | 'Protección de Datos'
  | 'Transparencia'
  | 'Gestión Documental'
  | 'Seguridad de la Información'
  | 'Auditorías'
  | 'Función Pública'
  | 'Accesibilidad'
  | 'Anticorrupción'
  | 'Internacional';

type AmbitoLey = 'Nacional' | 'Internacional' | 'Técnico';

type NivelCumplimiento = 'Obligatorio' | 'Recomendado' | 'Referencia';

interface Normativa {
  id: string;
  categoria: CategoriaLey;
  ambito: AmbitoLey;
  tipo: string; // Ley, Decreto, Resolución, etc.
  numero: string;
  año: string;
  titulo: string;
  descripcion: string;
  objetoRegulacion: string;
  articulosRelevantes?: string[];
  nivelCumplimiento: NivelCumplimiento;
  modulosAfectados: string[];
  requisitosEspecificos: string[];
  urlOficial?: string;
  vigente: boolean;
  fechaPublicacion?: string;
  entidadEmisora?: string;
}

// ====================================
// BASE DE DATOS DE NORMATIVIDAD
// ====================================

const NORMATIVIDAD_APLICABLE: Normativa[] = [
  // ========== CONTROL INTERNO ==========
  {
    id: 'norm-001',
    categoria: 'Control Interno',
    ambito: 'Nacional',
    tipo: 'Ley',
    numero: '87',
    año: '1993',
    titulo: 'Ley 87 de 1993',
    descripcion: 'Por la cual se establecen normas para el ejercicio del control interno en las entidades y organismos del Estado',
    objetoRegulacion: 'Establece las normas generales y principios básicos del Sistema de Control Interno para las entidades del Estado',
    articulosRelevantes: [
      'Art. 1: Sistema de Control Interno',
      'Art. 2: Objetivos del Control Interno',
      'Art. 3: Características del Control Interno',
      'Art. 4: Elementos del Control Interno'
    ],
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Todos los módulos', 'Plan Anual', 'Programa Anual', 'Auditorías', 'Seguimiento'],
    requisitosEspecificos: [
      'Implementar Sistema de Control Interno',
      'Evaluación periódica del sistema',
      'Documentación de procesos',
      'Separación de funciones',
      'Rendición de cuentas'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=301',
    vigente: true,
    fechaPublicacion: '29 de noviembre de 1993',
    entidadEmisora: 'Congreso de la República de Colombia'
  },
  {
    id: 'norm-002',
    categoria: 'Control Interno',
    ambito: 'Nacional',
    tipo: 'Decreto',
    numero: '1499',
    año: '2017',
    titulo: 'Decreto 1499 de 2017 - MECI',
    descripcion: 'Modelo Estándar de Control Interno para el Estado Colombiano',
    objetoRegulacion: 'Modifica y actualiza el Modelo Estándar de Control Interno - MECI',
    articulosRelevantes: [
      'Art. 1: Objeto',
      'Art. 2: Ámbito de aplicación',
      'Art. 3: Módulos del MECI',
      'Art. 4: Componentes'
    ],
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Todos los módulos', 'Roles y Permisos', 'Configuración', 'Auditorías'],
    requisitosEspecificos: [
      'Implementar 3 módulos: Planear, Hacer, Evaluar',
      '7 componentes obligatorios',
      'Talento humano orientado a resultados',
      'Direccionamiento estratégico',
      'Administración de riesgos',
      'Evaluación y seguimiento',
      'Información y comunicación'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=83622',
    vigente: true,
    fechaPublicacion: '11 de septiembre de 2017',
    entidadEmisora: 'Presidencia de la República'
  },
  {
    id: 'norm-003',
    categoria: 'Control Interno',
    ambito: 'Nacional',
    tipo: 'Decreto',
    numero: '648',
    año: '2017',
    titulo: 'Decreto 648 de 2017',
    descripcion: 'Modelo Integrado de Planeación y Gestión - MIPG',
    objetoRegulacion: 'Integra los sistemas de gestión y control interno en las entidades públicas',
    articulosRelevantes: [
      'Art. 3: Políticas de gestión',
      'Art. 4: Dimensiones',
      'Art. 5: Implementación'
    ],
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Plan Anual', 'Programa Anual', 'Seguimiento', 'Reportes'],
    requisitosEspecificos: [
      'Integrar MECI con sistemas de gestión',
      'Implementar política de Gestión Estratégica del Talento Humano',
      'Política de Integridad',
      'Política de Planeación Institucional',
      'Seguimiento y evaluación del desempeño'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=82747',
    vigente: true,
    fechaPublicacion: '19 de abril de 2017',
    entidadEmisora: 'Presidencia de la República'
  },

  // ========== PROTECCIÓN DE DATOS ==========
  {
    id: 'norm-004',
    categoria: 'Protección de Datos',
    ambito: 'Nacional',
    tipo: 'Ley',
    numero: '1581',
    año: '2012',
    titulo: 'Ley 1581 de 2012 - Habeas Data',
    descripcion: 'Régimen general de protección de datos personales',
    objetoRegulacion: 'Protección del derecho constitucional al habeas data y tratamiento de datos personales',
    articulosRelevantes: [
      'Art. 4: Principios',
      'Art. 5: Autorización del titular',
      'Art. 6: Tratamiento de datos sensibles',
      'Art. 17: Deberes de los responsables'
    ],
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Roles y Permisos', 'Usuarios', 'Expediente Digital', 'Base de Datos'],
    requisitosEspecificos: [
      'Política de tratamiento de datos personales',
      'Autorización expresa de los titulares',
      'Medidas de seguridad técnicas y administrativas',
      'Registro de bases de datos (RNBD)',
      'Procedimiento de consultas y reclamos',
      'Designación de oficial de protección de datos',
      'Capacitación del personal'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981',
    vigente: true,
    fechaPublicacion: '17 de octubre de 2012',
    entidadEmisora: 'Congreso de la República de Colombia'
  },
  {
    id: 'norm-005',
    categoria: 'Protección de Datos',
    ambito: 'Nacional',
    tipo: 'Decreto',
    numero: '1377',
    año: '2013',
    titulo: 'Decreto 1377 de 2013',
    descripcion: 'Reglamenta parcialmente la Ley 1581 de 2012',
    objetoRegulacion: 'Reglamentación de aspectos relacionados con la autorización del titular, políticas de tratamiento y registro nacional de bases de datos',
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Gestión de Usuarios', 'Base de Datos', 'Configuración'],
    requisitosEspecificos: [
      'Mecanismos para obtener autorización',
      'Contenido de política de tratamiento',
      'Procedimiento de registro RNBD',
      'Transferencia de datos a terceros'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646',
    vigente: true,
    fechaPublicacion: '27 de junio de 2013',
    entidadEmisora: 'Presidencia de la República'
  },

  // ========== TRANSPARENCIA ==========
  {
    id: 'norm-006',
    categoria: 'Transparencia',
    ambito: 'Nacional',
    tipo: 'Ley',
    numero: '1712',
    año: '2014',
    titulo: 'Ley de Transparencia y Acceso a la Información Pública',
    descripcion: 'Ley de transparencia y del derecho de acceso a la información pública nacional',
    objetoRegulacion: 'Regular el derecho de acceso a la información pública, los procedimientos y las excepciones',
    articulosRelevantes: [
      'Art. 6: Información pública',
      'Art. 7: Información pública clasificada y reservada',
      'Art. 9: Información mínima obligatoria',
      'Art. 11: Publicación de información'
    ],
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Reportes Ejecutivos', 'Expediente Digital', 'Auditorías', 'Planes de Mejoramiento'],
    requisitosEspecificos: [
      'Publicar información mínima obligatoria',
      'Sistema de información en línea',
      'Reportes de gestión públicos',
      'Procedimiento de solicitud de información',
      'Clasificación de información reservada',
      'Índice de información clasificada y reservada'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=56882',
    vigente: true,
    fechaPublicacion: '6 de marzo de 2014',
    entidadEmisora: 'Congreso de la República de Colombia'
  },

  // ========== ANTICORRUPCIÓN ==========
  {
    id: 'norm-007',
    categoria: 'Anticorrupción',
    ambito: 'Nacional',
    tipo: 'Ley',
    numero: '1474',
    año: '2011',
    titulo: 'Estatuto Anticorrupción',
    descripcion: 'Normas orientadas a fortalecer los mecanismos de prevención, investigación y sanción de actos de corrupción',
    objetoRegulacion: 'Establecer mecanismos para prevenir, investigar y sancionar la corrupción en el sector público',
    articulosRelevantes: [
      'Art. 73: Plan Anticorrupción',
      'Art. 74: Mapa de Riesgos de Corrupción',
      'Art. 76: Rendición de cuentas'
    ],
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Plan Anual', 'Gestión de Riesgos', 'Auditorías', 'Seguimiento'],
    requisitosEspecificos: [
      'Plan Anticorrupción y de Atención al Ciudadano',
      'Mapa de riesgos de corrupción',
      'Estrategias antitrámites',
      'Rendición de cuentas periódica',
      'Publicación en portal web institucional'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=43292',
    vigente: true,
    fechaPublicacion: '12 de julio de 2011',
    entidadEmisora: 'Congreso de la República de Colombia'
  },

  // ========== GESTIÓN DOCUMENTAL ==========
  {
    id: 'norm-008',
    categoria: 'Gestión Documental',
    ambito: 'Nacional',
    tipo: 'Ley',
    numero: '594',
    año: '2000',
    titulo: 'Ley General de Archivos',
    descripcion: 'Ley por medio de la cual se dicta la Ley General de Archivos',
    objetoRegulacion: 'Establecer las reglas y principios generales que regulan la función archivística del Estado',
    articulosRelevantes: [
      'Art. 3: Gestión documental',
      'Art. 4: Archivo',
      'Art. 11: Documentos electrónicos',
      'Art. 21: Tabla de Retención Documental'
    ],
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Expediente Digital', 'Gestión Documental', 'Archivo'],
    requisitosEspecificos: [
      'Tabla de Retención Documental (TRD)',
      'Programa de Gestión Documental (PGD)',
      'Sistema Integrado de Conservación',
      'Procedimientos de digitalización',
      'Preservación a largo plazo',
      'Metadatos obligatorios'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4275',
    vigente: true,
    fechaPublicacion: '14 de julio de 2000',
    entidadEmisora: 'Congreso de la República de Colombia'
  },
  {
    id: 'norm-009',
    categoria: 'Gestión Documental',
    ambito: 'Nacional',
    tipo: 'Acuerdo',
    numero: '060',
    año: '2001',
    titulo: 'Acuerdo AGN 060 de 2001',
    descripcion: 'Pautas para la administración de las comunicaciones oficiales',
    objetoRegulacion: 'Establecer pautas para la administración de las comunicaciones oficiales en las entidades públicas y privadas',
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Expediente Digital', 'Comunicaciones Oficiales'],
    requisitosEspecificos: [
      'Radicación de comunicaciones',
      'Control de correspondencia',
      'Clasificación de documentos',
      'Tiempos de respuesta'
    ],
    urlOficial: 'https://normativa.archivogeneral.gov.co/',
    vigente: true,
    fechaPublicacion: '30 de octubre de 2001',
    entidadEmisora: 'Archivo General de la Nación'
  },

  // ========== SEGURIDAD DE LA INFORMACIÓN ==========
  {
    id: 'norm-010',
    categoria: 'Seguridad de la Información',
    ambito: 'Internacional',
    tipo: 'Norma ISO',
    numero: '27001',
    año: '2013',
    titulo: 'ISO/IEC 27001:2013',
    descripcion: 'Sistema de Gestión de Seguridad de la Información (SGSI)',
    objetoRegulacion: 'Especificar los requisitos para establecer, implementar, mantener y mejorar continuamente un SGSI',
    articulosRelevantes: [
      'Contexto de la organización',
      'Liderazgo',
      'Planificación',
      'Soporte',
      'Operación',
      'Evaluación del desempeño',
      'Mejora'
    ],
    nivelCumplimiento: 'Recomendado',
    modulosAfectados: ['Todos los módulos', 'Roles y Permisos', 'Expediente Digital', 'Base de Datos'],
    requisitosEspecificos: [
      'Análisis de contexto organizacional',
      'Política de seguridad de la información',
      'Gestión de activos de información',
      'Control de acceso',
      'Criptografía',
      'Seguridad física y ambiental',
      'Gestión de incidentes',
      'Continuidad del negocio',
      'Cumplimiento normativo'
    ],
    vigente: true,
    entidadEmisora: 'ISO/IEC'
  },
  {
    id: 'norm-011',
    categoria: 'Seguridad de la Información',
    ambito: 'Nacional',
    tipo: 'Decreto',
    numero: '1078',
    año: '2015',
    titulo: 'Decreto 1078 de 2015 - Sector TIC',
    descripción: 'Decreto Único Reglamentario del Sector de Tecnologías de la Información y las Comunicaciones',
    objetoRegulacion: 'Compilar y racionalizar las normas de carácter reglamentario del sector TIC',
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Infraestructura TI', 'Seguridad', 'Interoperabilidad'],
    requisitosEspecificos: [
      'Estrategia de Gobierno en Línea',
      'Seguridad y privacidad de la información',
      'Arquitectura TI',
      'Servicios ciudadanos digitales'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=78555',
    vigente: true,
    fechaPublicacion: '26 de mayo de 2015',
    entidadEmisora: 'Presidencia de la República'
  },

  // ========== AUDITORÍAS ==========
  {
    id: 'norm-012',
    categoria: 'Auditorías',
    ambito: 'Internacional',
    tipo: 'Norma ISO',
    numero: '19011',
    año: '2018',
    titulo: 'ISO 19011:2018',
    descripcion: 'Directrices para la auditoría de sistemas de gestión',
    objetoRegulacion: 'Proporcionar orientación sobre la auditoría de sistemas de gestión, incluidos los principios de auditoría',
    nivelCumplimiento: 'Recomendado',
    modulosAfectados: ['Auditorías', 'Plan Anual', 'Programa Anual', 'Seguimiento'],
    requisitosEspecificos: [
      'Principios de auditoría',
      'Gestión de programas de auditoría',
      'Realización de auditorías',
      'Competencia de auditores',
      'Evaluación de auditores'
    ],
    vigente: true,
    entidadEmisora: 'ISO'
  },
  {
    id: 'norm-013',
    categoria: 'Auditorías',
    ambito: 'Internacional',
    tipo: 'Marco',
    numero: 'COSO',
    año: '2013',
    titulo: 'Marco COSO 2013',
    descripcion: 'Marco Integrado de Control Interno del Committee of Sponsoring Organizations',
    objetoRegulacion: 'Proporcionar un marco conceptual común para el control interno',
    nivelCumplimiento: 'Referencia',
    modulosAfectados: ['Control Interno', 'Gestión de Riesgos', 'Auditorías'],
    requisitosEspecificos: [
      '5 Componentes: Ambiente de control, Evaluación de riesgos, Actividades de control, Información y comunicación, Supervisión',
      '17 Principios fundamentales',
      'Enfoque basado en riesgos'
    ],
    vigente: true,
    entidadEmisora: 'COSO - Committee of Sponsoring Organizations'
  },

  // ========== FUNCIÓN PÚBLICA ==========
  {
    id: 'norm-014',
    categoria: 'Función Pública',
    ambito: 'Nacional',
    tipo: 'Decreto',
    numero: '1083',
    año: '2015',
    titulo: 'Decreto 1083 de 2015',
    descripcion: 'Decreto Único Reglamentario del Sector Función Pública',
    objetoRegulacion: 'Compilar las normas reglamentarias del sector función pública',
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Gestión del Talento Humano', 'Roles y Permisos'],
    requisitosEspecificos: [
      'Sistema de Gestión de Calidad',
      'Código de Integridad',
      'Evaluación del desempeño',
      'Sistema de Control Interno'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=62866',
    vigente: true,
    fechaPublicacion: '26 de mayo de 2015',
    entidadEmisora: 'Presidencia de la República'
  },

  // ========== ACCESIBILIDAD ==========
  {
    id: 'norm-015',
    categoria: 'Accesibilidad',
    ambito: 'Internacional',
    tipo: 'Estándar',
    numero: 'WCAG 2.1',
    año: '2018',
    titulo: 'Web Content Accessibility Guidelines 2.1',
    descripcion: 'Pautas de Accesibilidad para el Contenido Web',
    objetoRegulacion: 'Hacer el contenido web más accesible para personas con discapacidades',
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Todos los módulos - Interfaz Web'],
    requisitosEspecificos: [
      'Nivel AA de conformidad mínimo',
      'Perceptible: Alternativas de texto, contenido adaptable',
      'Operable: Accesible por teclado, tiempo suficiente',
      'Comprensible: Legible, predecible',
      'Robusto: Compatible con tecnologías asistivas'
    ],
    urlOficial: 'https://www.w3.org/TR/WCAG21/',
    vigente: true,
    entidadEmisora: 'W3C - World Wide Web Consortium'
  },
  {
    id: 'norm-016',
    categoria: 'Accesibilidad',
    ambito: 'Nacional',
    tipo: 'Ley',
    numero: '1618',
    año: '2013',
    titulo: 'Ley 1618 de 2013',
    descripcion: 'Ley de inclusión de personas con discapacidad',
    objetoRegulacion: 'Garantizar el ejercicio efectivo de los derechos de las personas con discapacidad',
    nivelCumplimiento: 'Obligatorio',
    modulosAfectados: ['Interfaz de Usuario', 'Accesibilidad Web'],
    requisitosEspecificos: [
      'Accesibilidad en sistemas de información',
      'Diseño universal',
      'Ajustes razonables',
      'Tecnologías de apoyo'
    ],
    urlOficial: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=52081',
    vigente: true,
    fechaPublicacion: '27 de febrero de 2013',
    entidadEmisora: 'Congreso de la República de Colombia'
  },

  // ========== PROTECCIÓN DE DATOS INTERNACIONAL ==========
  {
    id: 'norm-017',
    categoria: 'Protección de Datos',
    ambito: 'Internacional',
    tipo: 'Reglamento',
    numero: 'GDPR',
    año: '2018',
    titulo: 'GDPR - General Data Protection Regulation',
    descripcion: 'Reglamento General de Protección de Datos de la Unión Europea',
    objetoRegulacion: 'Protección de datos personales y privacidad en la Unión Europea',
    nivelCumplimiento: 'Referencia',
    modulosAfectados: ['Gestión de Datos', 'Protección de Datos', 'Privacidad'],
    requisitosEspecificos: [
      'Consentimiento explícito',
      'Derecho al olvido',
      'Portabilidad de datos',
      'Privacy by design',
      'Notificación de brechas en 72 horas',
      'Delegado de Protección de Datos (DPO)'
    ],
    urlOficial: 'https://gdpr.eu/',
    vigente: true,
    fechaPublicacion: '25 de mayo de 2018',
    entidadEmisora: 'Unión Europea'
  }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export function NormatividadAplicable() {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaLey | 'Todas'>('Todas');
  const [ambitoFiltro, setAmbitoFiltro] = useState<AmbitoLey | 'Todos'>('Todos');
  const [normativaExpandida, setNormativaExpandida] = useState<string | null>(null);
  const [vistaActiva, setVistaActiva] = useState<'lista' | 'categorias' | 'matriz'>('categorias');

  // Filtrar normatividad
  const normatividadFiltrada = NORMATIVIDAD_APLICABLE.filter(norm => {
    const cumpleBusqueda = 
      norm.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      norm.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      norm.numero.includes(busqueda);
    const cumpleCategoria = categoriaFiltro === 'Todas' || norm.categoria === categoriaFiltro;
    const cumpleAmbito = ambitoFiltro === 'Todos' || norm.ambito === ambitoFiltro;
    return cumpleBusqueda && cumpleCategoria && cumpleAmbito;
  });

  // Agrupar por categoría
  const normatividadPorCategoria = normatividadFiltrada.reduce((acc, norm) => {
    if (!acc[norm.categoria]) {
      acc[norm.categoria] = [];
    }
    acc[norm.categoria].push(norm);
    return acc;
  }, {} as Record<string, Normativa[]>);

  // Estadísticas
  const stats = {
    total: NORMATIVIDAD_APLICABLE.length,
    obligatorias: NORMATIVIDAD_APLICABLE.filter(n => n.nivelCumplimiento === 'Obligatorio').length,
    recomendadas: NORMATIVIDAD_APLICABLE.filter(n => n.nivelCumplimiento === 'Recomendado').length,
    referencias: NORMATIVIDAD_APLICABLE.filter(n => n.nivelCumplimiento === 'Referencia').length,
    categorias: Object.keys(normatividadPorCategoria).length
  };

  // Mapeo de colores por categoría
  const colorCategoria: Record<CategoriaLey, { bg: string; text: string; icon: any }> = {
    'Control Interno': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Shield },
    'Protección de Datos': { bg: 'bg-purple-100', text: 'text-purple-700', icon: Lock },
    'Transparencia': { bg: 'bg-green-100', text: 'text-green-700', icon: Eye },
    'Gestión Documental': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: FileText },
    'Seguridad de la Información': { bg: 'bg-red-100', text: 'text-red-700', icon: Shield },
    'Auditorías': { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: ListChecks },
    'Función Pública': { bg: 'bg-pink-100', text: 'text-pink-700', icon: Building },
    'Accesibilidad': { bg: 'bg-teal-100', text: 'text-teal-700', icon: Users },
    'Anticorrupción': { bg: 'bg-orange-100', text: 'text-orange-700', icon: Gavel },
    'Internacional': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Globe }
  };

  const toggleExpansion = (id: string) => {
    setNormativaExpandida(normativaExpandida === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#003DA5]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#003DA5] to-[#0052CC] rounded-xl flex items-center justify-center shadow-lg">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                  Normatividad Aplicable
                  <BadgeSIGL variant="default" className="text-xs">
                    {stats.total} Normas
                  </BadgeSIGL>
                </h1>
                <p className="text-sm text-gray-600">
                  Marco normativo completo para el Sistema de Control Interno - ESAP
                </p>
              </div>
            </div>

            <ButtonSIGL variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </ButtonSIGL>
          </div>

          {/* Tabs de vista */}
          <div className="flex gap-2">
            <ButtonSIGL
              variant={vistaActiva === 'categorias' ? 'primary' : 'default'}
              onClick={() => setVistaActiva('categorias')}
              size="sm"
            >
              Por Categorías
            </ButtonSIGL>
            <ButtonSIGL
              variant={vistaActiva === 'lista' ? 'primary' : 'default'}
              onClick={() => setVistaActiva('lista')}
              size="sm"
            >
              Lista Completa
            </ButtonSIGL>
            <ButtonSIGL
              variant={vistaActiva === 'matriz' ? 'primary' : 'default'}
              onClick={() => setVistaActiva('matriz')}
              size="sm"
            >
              Matriz de Cumplimiento
            </ButtonSIGL>
          </div>
        </motion.div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <CardSIGL className="p-5 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-blue-100">
                <FileCheck className="w-6 h-6 text-blue-600" />
              </div>
              <BadgeSIGL variant="info" className="text-xs">Total</BadgeSIGL>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{stats.total}</p>
            <p className="text-xs text-gray-600">Normas Identificadas</p>
          </CardSIGL>

          <CardSIGL className="p-5 bg-gradient-to-br from-red-50 to-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <BadgeSIGL variant="danger" className="text-xs">Crítico</BadgeSIGL>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{stats.obligatorias}</p>
            <p className="text-xs text-gray-600">Obligatorias</p>
          </CardSIGL>

          <CardSIGL className="p-5 bg-gradient-to-br from-yellow-50 to-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-yellow-100">
                <CheckCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <BadgeSIGL variant="warning" className="text-xs">Medio</BadgeSIGL>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{stats.recomendadas}</p>
            <p className="text-xs text-gray-600">Recomendadas</p>
          </CardSIGL>

          <CardSIGL className="p-5 bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-green-100">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <BadgeSIGL variant="success" className="text-xs">Bajo</BadgeSIGL>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{stats.referencias}</p>
            <p className="text-xs text-gray-600">Referencia</p>
          </CardSIGL>

          <CardSIGL className="p-5 bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-purple-100">
                <Landmark className="w-6 h-6 text-purple-600" />
              </div>
              <BadgeSIGL variant="default" className="text-xs">Grupos</BadgeSIGL>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{stats.categorias}</p>
            <p className="text-xs text-gray-600">Categorías</p>
          </CardSIGL>
        </div>

        {/* FILTROS */}
        <CardSIGL className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <InputSIGL
                placeholder="Buscar por número, título o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5]"
            >
              <option value="Todas">Todas las categorías</option>
              {Object.keys(colorCategoria).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={ambitoFiltro}
              onChange={(e) => setAmbitoFiltro(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5]"
            >
              <option value="Todos">Todos los ámbitos</option>
              <option value="Nacional">Nacional</option>
              <option value="Internacional">Internacional</option>
              <option value="Técnico">Técnico</option>
            </select>
          </div>
        </CardSIGL>

        {/* VISTA POR CATEGORÍAS */}
        {vistaActiva === 'categorias' && (
          <div className="space-y-6">
            {Object.entries(normatividadPorCategoria).map(([categoria, normas]) => {
              const config = colorCategoria[categoria as CategoriaLey];
              const Icon = config?.icon || FileText;

              return (
                <motion.div
                  key={categoria}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <CardSIGL className="overflow-hidden">
                    <div className={`${config?.bg} ${config?.text} px-6 py-4 flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6" />
                        <h2 className="text-xl font-bold">{categoria}</h2>
                        <BadgeSIGL variant="outline" className="text-xs">
                          {normas.length} norma{normas.length !== 1 ? 's' : ''}
                        </BadgeSIGL>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      {normas.map(norm => (
                        <div
                          key={norm.id}
                          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <button
                            onClick={() => toggleExpansion(norm.id)}
                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-4 flex-1 text-left">
                              <div className="mt-1">
                                {normativaExpandida === norm.id ? (
                                  <ChevronDown className="w-5 h-5 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-gray-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-bold text-gray-900">{norm.titulo}</h3>
                                  <BadgeSIGL
                                    variant={
                                      norm.nivelCumplimiento === 'Obligatorio' ? 'danger' :
                                      norm.nivelCumplimiento === 'Recomendado' ? 'warning' : 'default'
                                    }
                                    className="text-xs"
                                  >
                                    {norm.nivelCumplimiento}
                                  </BadgeSIGL>
                                  <BadgeSIGL variant="outline" className="text-xs">
                                    {norm.ambito}
                                  </BadgeSIGL>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{norm.descripcion}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>{norm.tipo} {norm.numero} de {norm.año}</span>
                                  {norm.entidadEmisora && (
                                    <>
                                      <span>•</span>
                                      <span>{norm.entidadEmisora}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>

                          {normativaExpandida === norm.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-5 py-4 border-t border-gray-200 bg-gray-50 space-y-4"
                            >
                              <div>
                                <h4 className="font-semibold text-sm text-gray-900 mb-2">
                                  Objeto de Regulación
                                </h4>
                                <p className="text-sm text-gray-700">{norm.objetoRegulacion}</p>
                              </div>

                              {norm.articulosRelevantes && norm.articulosRelevantes.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-sm text-gray-900 mb-2">
                                    Artículos Relevantes
                                  </h4>
                                  <ul className="space-y-1">
                                    {norm.articulosRelevantes.map((art, idx) => (
                                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                        <span className="text-[#003DA5]">•</span>
                                        <span>{art}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div>
                                <h4 className="font-semibold text-sm text-gray-900 mb-2">
                                  Requisitos Específicos
                                </h4>
                                <ul className="space-y-1">
                                  {norm.requisitosEspecificos.map((req, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                      <span>{req}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <h4 className="font-semibold text-sm text-gray-900 mb-2">
                                  Módulos Afectados
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {norm.modulosAfectados.map((modulo, idx) => (
                                    <BadgeSIGL key={idx} variant="outline" className="text-xs">
                                      {modulo}
                                    </BadgeSIGL>
                                  ))}
                                </div>
                              </div>

                              {norm.urlOficial && (
                                <div className="pt-3 border-t border-gray-200">
                                  <a
                                    href={norm.urlOficial}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-[#003DA5] hover:underline"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Ver norma completa
                                  </a>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardSIGL>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* VISTA LISTA COMPLETA */}
        {vistaActiva === 'lista' && (
          <CardSIGL>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Norma</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Cumplimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ámbito</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {normatividadFiltrada.map(norm => (
                    <tr key={norm.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{norm.titulo}</p>
                          <p className="text-xs text-gray-500">
                            {norm.tipo} {norm.numero} / {norm.año}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <BadgeSIGL
                          className={`${colorCategoria[norm.categoria]?.bg} ${colorCategoria[norm.categoria]?.text} text-xs`}
                        >
                          {norm.categoria}
                        </BadgeSIGL>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 line-clamp-2">{norm.descripcion}</p>
                      </td>
                      <td className="px-4 py-3">
                        <BadgeSIGL
                          variant={
                            norm.nivelCumplimiento === 'Obligatorio' ? 'danger' :
                            norm.nivelCumplimiento === 'Recomendado' ? 'warning' : 'default'
                          }
                          className="text-xs"
                        >
                          {norm.nivelCumplimiento}
                        </BadgeSIGL>
                      </td>
                      <td className="px-4 py-3">
                        <BadgeSIGL variant="outline" className="text-xs">
                          {norm.ambito}
                        </BadgeSIGL>
                      </td>
                      <td className="px-4 py-3">
                        <ButtonSIGL
                          size="sm"
                          variant="outline"
                          onClick={() => toggleExpansion(norm.id)}
                        >
                          <Eye className="w-3 h-3" />
                        </ButtonSIGL>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardSIGL>
        )}

        {/* VISTA MATRIZ DE CUMPLIMIENTO */}
        {vistaActiva === 'matriz' && (
          <CardSIGL className="p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-4">
              Matriz de Cumplimiento Normativo
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 border-r">
                      Norma
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 border-r">
                      Cumplimiento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 border-r">
                      Módulos Afectados
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {NORMATIVIDAD_APLICABLE.map(norm => (
                    <tr key={norm.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-r">
                        <p className="font-semibold text-sm text-gray-900">{norm.titulo}</p>
                        <p className="text-xs text-gray-500">{norm.categoria}</p>
                      </td>
                      <td className="px-4 py-3 text-center border-r">
                        <BadgeSIGL
                          variant={
                            norm.nivelCumplimiento === 'Obligatorio' ? 'danger' :
                            norm.nivelCumplimiento === 'Recomendado' ? 'warning' : 'default'
                          }
                          className="text-xs"
                        >
                          {norm.nivelCumplimiento}
                        </BadgeSIGL>
                      </td>
                      <td className="px-4 py-3 border-r">
                        <div className="flex flex-wrap gap-1">
                          {norm.modulosAfectados.slice(0, 3).map((modulo, idx) => (
                            <BadgeSIGL key={idx} variant="outline" className="text-xs">
                              {modulo}
                            </BadgeSIGL>
                          ))}
                          {norm.modulosAfectados.length > 3 && (
                            <BadgeSIGL variant="outline" className="text-xs">
                              +{norm.modulosAfectados.length - 3}
                            </BadgeSIGL>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-gray-700">En cumplimiento</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardSIGL>
        )}

        {/* FOOTER INFORMATIVO */}
        <CardSIGL className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">Importante</h3>
              <p className="text-sm text-gray-700 mb-3">
                Este documento es una guía de referencia de la normatividad aplicable al Sistema de Control Interno de Gestión.
                Es responsabilidad de la entidad verificar la vigencia y aplicabilidad de cada norma según su contexto específico.
              </p>
              <p className="text-xs text-gray-600">
                Última actualización: 22 de diciembre de 2025 • Para consultas específicas, contactar a la Oficina Jurídica de ESAP
              </p>
            </div>
          </div>
        </CardSIGL>
      </div>
    </div>
  );
}

export default NormatividadAplicable;