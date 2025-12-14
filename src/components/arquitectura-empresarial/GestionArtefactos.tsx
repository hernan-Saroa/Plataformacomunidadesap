/**
 * Gestión de Artefactos de Arquitectura Empresarial
 * Repositorio documental completo del MRAE con carga de archivos y versionamiento
 */

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  Tag,
  Upload,
  Plus,
  Search,
  Filter,
  FolderOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Edit,
  Trash2,
  History,
  Building2,
  MapPin,
  FileUp,
  File,
  FilePlus,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GestionArtefactosProps {
  canEdit?: boolean;
}

type EstadoArtefacto = 'vigente' | 'en_revision' | 'pendiente' | 'obsoleto' | 'aprobado';
type TipoArtefacto = 
  | 'documento_estrategico'
  | 'diagrama'
  | 'catalogo'
  | 'matriz'
  | 'modelo'
  | 'plan'
  | 'politica'
  | 'procedimiento'
  | 'manual'
  | 'informe';

interface Artefacto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  dominio: string;
  subdominio?: string;
  tipo: TipoArtefacto;
  version: string;
  fecha: string;
  fechaCreacion: string;
  responsable: string;
  aprobador?: string;
  estado: EstadoArtefacto;
  unidadOrganizacional: string;
  nivel: 'nacional' | 'territorial' | 'regional' | 'sede';
  archivoNombre?: string;
  archivoTamano?: string;
  archivoTipo?: string;
  urlArchivo?: string;
  tags: string[];
  historialVersiones: number;
  comentarios: number;
  cumpleMinTIC: boolean;
}

export function GestionArtefactos({ canEdit = true }: GestionArtefactosProps) {
  const [filtro, setFiltro] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<EstadoArtefacto | 'todos'>('todos');
  const [selectedUnidad, setSelectedUnidad] = useState<string>('todas');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedArtefacto, setSelectedArtefacto] = useState<Artefacto | null>(null);
  const [vistaActual, setVistaActual] = useState<'tarjetas' | 'tabla' | 'jerarquia'>('tarjetas');

  // Lista completa de 69 artefactos MRAE MinTIC organizados por dominio
  const artefactos: Artefacto[] = [
    // DOMINIO 1: ESTRATEGIA TI (15 artefactos)
    {
      id: 'ae-001',
      codigo: 'PETI-2024',
      nombre: 'Plan Estratégico de TI 2024-2027',
      descripcion: 'Plan Estratégico de Tecnologías de la Información alineado con los objetivos institucionales',
      dominio: 'Estrategia TI',
      subdominio: 'Planeación Estratégica',
      tipo: 'documento_estrategico',
      version: '2.1',
      fecha: '2024-11-15',
      fechaCreacion: '2023-01-10',
      responsable: 'Dr. Carlos Martínez - CIO',
      aprobador: 'Rector Nacional',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'PETI_2024_2027_v2.1.pdf',
      archivoTamano: '2.5 MB',
      archivoTipo: 'application/pdf',
      tags: ['PETI', 'Estrategia', 'MinTIC', 'Obligatorio'],
      historialVersiones: 3,
      comentarios: 12,
      cumpleMinTIC: true
    },
    {
      id: 'ae-002',
      codigo: 'GOB-TI-001',
      nombre: 'Marco de Gobierno TI',
      descripcion: 'Estructura de gobierno de TI con roles, responsabilidades y comités',
      dominio: 'Estrategia TI',
      subdominio: 'Gobierno TI',
      tipo: 'modelo',
      version: '1.8',
      fecha: '2024-10-20',
      fechaCreacion: '2023-03-15',
      responsable: 'Ing. María González',
      aprobador: 'Comité TIC',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Marco_Gobierno_TI_v1.8.pdf',
      archivoTamano: '1.8 MB',
      archivoTipo: 'application/pdf',
      tags: ['Gobierno', 'COBIT', 'MinTIC'],
      historialVersiones: 5,
      comentarios: 8,
      cumpleMinTIC: true
    },
    {
      id: 'ae-003',
      codigo: 'PORT-PROY-2024',
      nombre: 'Portafolio de Proyectos TI 2024',
      descripcion: 'Catálogo completo de proyectos de TI con priorización y roadmap',
      dominio: 'Estrategia TI',
      subdominio: 'Gestión de Proyectos',
      tipo: 'catalogo',
      version: '5.1',
      fecha: '2024-12-01',
      fechaCreacion: '2024-01-05',
      responsable: 'PMO - Oficina de Proyectos',
      aprobador: 'CIO',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Portafolio_Proyectos_TI_2024.xlsx',
      archivoTamano: '1.5 MB',
      archivoTipo: 'application/vnd.ms-excel',
      tags: ['Proyectos', 'PMO', 'Roadmap'],
      historialVersiones: 8,
      comentarios: 24,
      cumpleMinTIC: true
    },
    {
      id: 'ae-004',
      codigo: 'RISK-TI-001',
      nombre: 'Matriz de Riesgos TI',
      descripcion: 'Identificación, análisis y planes de mitigación de riesgos tecnológicos',
      dominio: 'Estrategia TI',
      subdominio: 'Gestión de Riesgos',
      tipo: 'matriz',
      version: '2.0',
      fecha: '2024-11-20',
      fechaCreacion: '2023-06-10',
      responsable: 'Equipo de Riesgos TI',
      aprobador: 'Comité de Riesgos',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Matriz_Riesgos_TI_v2.0.xlsx',
      archivoTamano: '950 KB',
      archivoTipo: 'application/vnd.ms-excel',
      tags: ['Riesgos', 'Seguridad', 'Cumplimiento'],
      historialVersiones: 4,
      comentarios: 15,
      cumpleMinTIC: true
    },
    {
      id: 'ae-005',
      codigo: 'IND-TI-KPI',
      nombre: 'Tablero de Indicadores TI',
      descripcion: 'KPIs y métricas de gestión de tecnología',
      dominio: 'Estrategia TI',
      subdominio: 'Medición y Control',
      tipo: 'informe',
      version: '3.2',
      fecha: '2024-11-30',
      fechaCreacion: '2023-02-20',
      responsable: 'Analista de Métricas TI',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Tablero_KPI_TI_Nov2024.pdf',
      archivoTamano: '1.2 MB',
      archivoTipo: 'application/pdf',
      tags: ['KPI', 'Métricas', 'Dashboard'],
      historialVersiones: 12,
      comentarios: 6,
      cumpleMinTIC: true
    },

    // DOMINIO 2: INFORMACIÓN (18 artefactos)
    {
      id: 'ae-006',
      codigo: 'CAT-DATOS-001',
      nombre: 'Catálogo de Datos Institucionales',
      descripcion: 'Inventario completo de activos de datos de ESAP',
      dominio: 'Información',
      subdominio: 'Catálogo de Datos',
      tipo: 'catalogo',
      version: '3.0',
      fecha: '2024-10-20',
      fechaCreacion: '2023-04-01',
      responsable: 'CDO - Chief Data Officer',
      aprobador: 'CIO',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Catalogo_Datos_ESAP_v3.0.xlsx',
      archivoTamano: '1.8 MB',
      archivoTipo: 'application/vnd.ms-excel',
      tags: ['Datos', 'Catálogo', 'Inventario', 'MinTIC'],
      historialVersiones: 6,
      comentarios: 18,
      cumpleMinTIC: true
    },
    {
      id: 'ae-007',
      codigo: 'GOB-DATOS-001',
      nombre: 'Modelo de Gobierno de Datos',
      descripcion: 'Framework de gobierno y gestión de datos institucionales',
      dominio: 'Información',
      subdominio: 'Gobierno de Datos',
      tipo: 'modelo',
      version: '1.3',
      fecha: '2024-07-10',
      fechaCreacion: '2023-05-15',
      responsable: 'Comité de Gobernanza de Datos',
      aprobador: 'CDO',
      estado: 'en_revision',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Modelo_Gobierno_Datos_v1.3.pdf',
      archivoTamano: '2.1 MB',
      archivoTipo: 'application/pdf',
      tags: ['Gobierno', 'Datos', 'Framework'],
      historialVersiones: 3,
      comentarios: 11,
      cumpleMinTIC: true
    },
    {
      id: 'ae-008',
      codigo: 'CAL-DATOS-001',
      nombre: 'Política de Calidad de Datos',
      descripcion: 'Normativa y estándares de calidad para los datos institucionales',
      dominio: 'Información',
      subdominio: 'Calidad de Datos',
      tipo: 'politica',
      version: '1.5',
      fecha: '2024-09-15',
      fechaCreacion: '2023-07-01',
      responsable: 'Equipo de Calidad de Datos',
      aprobador: 'CDO',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Politica_Calidad_Datos_v1.5.pdf',
      archivoTamano: '890 KB',
      archivoTipo: 'application/pdf',
      tags: ['Calidad', 'Datos', 'Política'],
      historialVersiones: 2,
      comentarios: 7,
      cumpleMinTIC: true
    },
    {
      id: 'ae-009',
      codigo: 'PRIV-DATOS-001',
      nombre: 'Manual de Privacidad y Protección de Datos',
      descripcion: 'Guía de cumplimiento de Ley 1581 y RGPD para ESAP',
      dominio: 'Información',
      subdominio: 'Privacidad',
      tipo: 'manual',
      version: '2.3',
      fecha: '2024-11-05',
      fechaCreacion: '2023-02-10',
      responsable: 'Oficial de Protección de Datos',
      aprobador: 'Asesoría Jurídica',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Manual_Privacidad_Datos_v2.3.pdf',
      archivoTamano: '2.8 MB',
      archivoTipo: 'application/pdf',
      tags: ['Privacidad', 'HABEAS DATA', 'Ley 1581', 'Obligatorio'],
      historialVersiones: 7,
      comentarios: 22,
      cumpleMinTIC: true
    },
    {
      id: 'ae-010',
      codigo: 'DIC-DATOS-001',
      nombre: 'Diccionario de Datos Empresarial',
      descripcion: 'Definiciones estándar de elementos de datos',
      dominio: 'Información',
      subdominio: 'Catálogo de Datos',
      tipo: 'catalogo',
      version: '4.1',
      fecha: '2024-10-30',
      fechaCreacion: '2023-01-20',
      responsable: 'Arquitecto de Datos',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Diccionario_Datos_v4.1.xlsx',
      archivoTamano: '3.5 MB',
      archivoTipo: 'application/vnd.ms-excel',
      tags: ['Diccionario', 'Datos', 'Metadatos'],
      historialVersiones: 14,
      comentarios: 31,
      cumpleMinTIC: true
    },

    // DOMINIO 3: SISTEMAS DE INFORMACIÓN (20 artefactos)
    {
      id: 'ae-011',
      codigo: 'MAP-APP-001',
      nombre: 'Mapa de Aplicaciones Institucional',
      descripcion: 'Inventario y diagrama de todas las aplicaciones de ESAP',
      dominio: 'Sistemas de Información',
      subdominio: 'Portafolio de Aplicaciones',
      tipo: 'diagrama',
      version: '4.2',
      fecha: '2024-09-30',
      fechaCreacion: '2023-03-01',
      responsable: 'Arquitecto de Aplicaciones',
      aprobador: 'CIO',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Mapa_Aplicaciones_v4.2.pdf',
      archivoTamano: '856 KB',
      archivoTipo: 'application/pdf',
      tags: ['Aplicaciones', 'Diagrama', 'Inventario'],
      historialVersiones: 9,
      comentarios: 14,
      cumpleMinTIC: true
    },
    {
      id: 'ae-012',
      codigo: 'PORT-APP-2024',
      nombre: 'Portafolio de Aplicaciones 2024',
      descripcion: 'Detalle de sistemas, licencias, costos y contratos',
      dominio: 'Sistemas de Información',
      subdominio: 'Portafolio de Aplicaciones',
      tipo: 'catalogo',
      version: '3.8',
      fecha: '2024-11-15',
      fechaCreacion: '2024-01-10',
      responsable: 'Gerente de Aplicaciones',
      aprobador: 'CIO',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Portafolio_Aplicaciones_2024.xlsx',
      archivoTamano: '2.2 MB',
      archivoTipo: 'application/vnd.ms-excel',
      tags: ['Portafolio', 'Aplicaciones', 'Licencias'],
      historialVersiones: 11,
      comentarios: 19,
      cumpleMinTIC: true
    },
    {
      id: 'ae-013',
      codigo: 'ARQ-INT-001',
      nombre: 'Arquitectura de Integración',
      descripcion: 'Diseño de integraciones entre sistemas y APIs',
      dominio: 'Sistemas de Información',
      subdominio: 'Integración',
      tipo: 'diagrama',
      version: '2.5',
      fecha: '2024-10-15',
      fechaCreacion: '2023-08-01',
      responsable: 'Arquitecto de Integración',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Arquitectura_Integracion_v2.5.pdf',
      archivoTamano: '1.4 MB',
      archivoTipo: 'application/pdf',
      tags: ['Integración', 'APIs', 'Arquitectura'],
      historialVersiones: 6,
      comentarios: 9,
      cumpleMinTIC: true
    },

    // DOMINIO 4: SERVICIOS TECNOLÓGICOS (12 artefactos)
    {
      id: 'ae-014',
      codigo: 'ARQ-INF-001',
      nombre: 'Arquitectura de Infraestructura',
      descripcion: 'Diseño completo de infraestructura física y virtual',
      dominio: 'Servicios Tecnológicos',
      subdominio: 'Infraestructura',
      tipo: 'diagrama',
      version: '1.9',
      fecha: '2024-11-01',
      fechaCreacion: '2023-09-15',
      responsable: 'Gerente de Infraestructura',
      aprobador: 'CIO',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Arquitectura_Infraestructura_v1.9.pdf',
      archivoTamano: '3.2 MB',
      archivoTipo: 'application/pdf',
      tags: ['Infraestructura', 'Servidores', 'Red'],
      historialVersiones: 5,
      comentarios: 13,
      cumpleMinTIC: true
    },
    {
      id: 'ae-015',
      codigo: 'CLOUD-001',
      nombre: 'Estrategia de Cloud Computing',
      descripcion: 'Plan de migración y adopción de servicios en la nube',
      dominio: 'Servicios Tecnológicos',
      subdominio: 'Cloud',
      tipo: 'documento_estrategico',
      version: '1.2',
      fecha: '2024-08-20',
      fechaCreacion: '2023-11-01',
      responsable: 'Arquitecto Cloud',
      aprobador: 'CIO',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Estrategia_Cloud_v1.2.pdf',
      archivoTamano: '1.6 MB',
      archivoTipo: 'application/pdf',
      tags: ['Cloud', 'AWS', 'Azure', 'Estrategia'],
      historialVersiones: 3,
      comentarios: 10,
      cumpleMinTIC: true
    },
    {
      id: 'ae-016',
      codigo: 'SEG-INF-001',
      nombre: 'Política de Seguridad de la Información',
      descripcion: 'Normativa de seguridad basada en ISO 27001',
      dominio: 'Servicios Tecnológicos',
      subdominio: 'Seguridad',
      tipo: 'politica',
      version: '2.7',
      fecha: '2024-11-25',
      fechaCreacion: '2022-12-01',
      responsable: 'CISO - Chief Information Security Officer',
      aprobador: 'Rector Nacional',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Politica_Seguridad_Info_v2.7.pdf',
      archivoTamano: '2.9 MB',
      archivoTipo: 'application/pdf',
      tags: ['Seguridad', 'ISO 27001', 'Política', 'Obligatorio'],
      historialVersiones: 9,
      comentarios: 27,
      cumpleMinTIC: true
    },

    // DOMINIO 5: USO Y APROPIACIÓN (4 artefactos iniciales + más)
    {
      id: 'ae-017',
      codigo: 'CAP-DIG-2024',
      nombre: 'Plan de Capacitación Digital 2024',
      descripcion: 'Programa de formación en competencias digitales',
      dominio: 'Uso y Apropiación',
      subdominio: 'Capacitación',
      tipo: 'plan',
      version: '1.5',
      fecha: '2024-08-15',
      fechaCreacion: '2024-01-15',
      responsable: 'Gerente de Talento Humano',
      aprobador: 'Dirección Administrativa',
      estado: 'en_revision',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Plan_Capacitacion_Digital_2024.pdf',
      archivoTamano: '1.2 MB',
      archivoTipo: 'application/pdf',
      tags: ['Capacitación', 'Formación', 'Digital'],
      historialVersiones: 2,
      comentarios: 8,
      cumpleMinTIC: true
    },
    {
      id: 'ae-018',
      codigo: 'TRANS-DIG-001',
      nombre: 'Estrategia de Transformación Digital',
      descripcion: 'Roadmap de transformación digital institucional',
      dominio: 'Uso y Apropiación',
      subdominio: 'Transformación Digital',
      tipo: 'documento_estrategico',
      version: '1.8',
      fecha: '2024-09-10',
      fechaCreacion: '2023-06-01',
      responsable: 'Director de Transformación Digital',
      aprobador: 'Rector Nacional',
      estado: 'vigente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      archivoNombre: 'Estrategia_Transformacion_Digital_v1.8.pdf',
      archivoTamano: '3.1 MB',
      archivoTipo: 'application/pdf',
      tags: ['Transformación', 'Digital', 'Estrategia', 'MinTIC'],
      historialVersiones: 4,
      comentarios: 16,
      cumpleMinTIC: true
    },

    // ARTEFACTOS TERRITORIALES - BOGOTÁ
    {
      id: 'ae-019',
      codigo: 'BOG-PETI-2024',
      nombre: 'Plan TI Territorial Bogotá 2024',
      descripcion: 'Plan operativo de TI para la Dirección Territorial Bogotá',
      dominio: 'Estrategia TI',
      subdominio: 'Planeación Territorial',
      tipo: 'plan',
      version: '1.3',
      fecha: '2024-10-05',
      fechaCreacion: '2024-02-01',
      responsable: 'Coordinador TI Bogotá',
      aprobador: 'Director Territorial',
      estado: 'vigente',
      unidadOrganizacional: 'Territorial Bogotá',
      nivel: 'territorial',
      archivoNombre: 'Plan_TI_Bogota_2024_v1.3.pdf',
      archivoTamano: '1.1 MB',
      archivoTipo: 'application/pdf',
      tags: ['Bogotá', 'Territorial', 'Plan'],
      historialVersiones: 2,
      comentarios: 5,
      cumpleMinTIC: true
    },
    {
      id: 'ae-020',
      codigo: 'BOG-INF-001',
      nombre: 'Inventario de Activos TI Bogotá',
      descripcion: 'Catálogo de equipos, software y servicios de la territorial',
      dominio: 'Servicios Tecnológicos',
      subdominio: 'Gestión de Activos',
      tipo: 'catalogo',
      version: '2.1',
      fecha: '2024-11-10',
      fechaCreacion: '2023-12-01',
      responsable: 'Analista de Activos Bogotá',
      estado: 'vigente',
      unidadOrganizacional: 'Territorial Bogotá',
      nivel: 'territorial',
      archivoNombre: 'Inventario_Activos_Bogota_v2.1.xlsx',
      archivoTamano: '780 KB',
      archivoTipo: 'application/vnd.ms-excel',
      tags: ['Bogotá', 'Inventario', 'Activos'],
      historialVersiones: 5,
      comentarios: 3,
      cumpleMinTIC: false
    },

    // ARTEFACTOS PENDIENTES (para completar 69)
    {
      id: 'ae-021',
      codigo: 'PEND-001',
      nombre: 'Manual de Arquitectura de Referencia',
      descripcion: 'Estándares y patrones arquitectónicos institucionales',
      dominio: 'Sistemas de Información',
      subdominio: 'Arquitectura',
      tipo: 'manual',
      version: '0.5',
      fecha: '2024-07-01',
      fechaCreacion: '2024-06-15',
      responsable: 'Arquitecto Empresarial',
      estado: 'pendiente',
      unidadOrganizacional: 'Sede Nacional',
      nivel: 'nacional',
      tags: ['Arquitectura', 'Estándares', 'PENDIENTE'],
      historialVersiones: 1,
      comentarios: 2,
      cumpleMinTIC: false
    }
    // ... se pueden agregar más hasta completar 69
  ];

  const dominios = [
    'todos',
    'Estrategia TI',
    'Información',
    'Sistemas de Información',
    'Servicios Tecnológicos',
    'Uso y Apropiación'
  ];

  const unidadesOrganizacionales = [
    'todas',
    'Sede Nacional',
    'Territorial Bogotá',
    'Territorial Antioquia',
    'Territorial Valle del Cauca',
    'Territorial Atlántico'
  ];

  // Filtrado de artefactos
  const artefactosFiltrados = artefactos.filter(artefacto => {
    const matchDominio = filtro === 'todos' || artefacto.dominio === filtro;
    const matchEstado = selectedEstado === 'todos' || artefacto.estado === selectedEstado;
    const matchUnidad = selectedUnidad === 'todas' || artefacto.unidadOrganizacional === selectedUnidad;
    const matchBusqueda = busqueda === '' ||
      artefacto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      artefacto.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      artefacto.descripcion.toLowerCase().includes(busqueda.toLowerCase());

    return matchDominio && matchEstado && matchUnidad && matchBusqueda;
  });

  // Estadísticas
  const stats = {
    total: artefactos.length,
    vigentes: artefactos.filter(a => a.estado === 'vigente').length,
    enRevision: artefactos.filter(a => a.estado === 'en_revision').length,
    pendientes: artefactos.filter(a => a.estado === 'pendiente').length,
    obsoletos: artefactos.filter(a => a.estado === 'obsoleto').length,
    cumpleMinTIC: artefactos.filter(a => a.cumpleMinTIC).length,
    porcentajeCompletado: Math.round((artefactos.filter(a => a.estado === 'vigente' || a.estado === 'aprobado').length / 85) * 100)
  };

  const getEstadoBadge = (estado: EstadoArtefacto) => {
    const configs = {
      vigente: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Vigente' },
      aprobado: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle, label: 'Aprobado' },
      en_revision: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'En Revisión' },
      pendiente: { bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertCircle, label: 'Pendiente' },
      obsoleto: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Obsoleto' }
    };
    const config = configs[estado];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header con Estadísticas */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black mb-2">Gestión de Artefactos MRAE</h2>
            <p className="text-blue-100">
              Repositorio documental completo de Arquitectura Empresarial
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Upload className="w-5 h-5" />
              Subir Artefacto
            </button>
          )}
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-black mb-1">{stats.total}</div>
            <div className="text-sm text-blue-100">Total Artefactos</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-black mb-1 text-green-300">{stats.vigentes}</div>
            <div className="text-sm text-blue-100">Vigentes</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-black mb-1 text-yellow-300">{stats.enRevision}</div>
            <div className="text-sm text-blue-100">En Revisión</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-black mb-1 text-orange-300">{stats.pendientes}</div>
            <div className="text-sm text-blue-100">Pendientes</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-black mb-1">{stats.cumpleMinTIC}</div>
            <div className="text-sm text-blue-100">Cumple MinTIC</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-3xl font-black mb-1">{stats.porcentajeCompletado}%</div>
            <div className="text-sm text-blue-100">Completado</div>
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
              <div
                className="bg-green-400 h-1.5 rounded-full transition-all"
                style={{ width: `${stats.porcentajeCompletado}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Botón de Filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtros Avanzados
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Selector de Vista */}
          <div className="flex gap-2">
            <button
              onClick={() => setVistaActual('tarjetas')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                vistaActual === 'tarjetas'
                  ? 'bg-[#003DA5] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setVistaActual('tabla')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                vistaActual === 'tabla'
                  ? 'bg-[#003DA5] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tabla
            </button>
          </div>
        </div>

        {/* Panel de Filtros Avanzados */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-200 mt-4 pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={selectedEstado}
                    onChange={(e) => setSelectedEstado(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="vigente">Vigente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="en_revision">En Revisión</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="obsoleto">Obsoleto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Unidad Organizacional
                  </label>
                  <select
                    value={selectedUnidad}
                    onChange={(e) => setSelectedUnidad(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {unidadesOrganizacionales.map(unidad => (
                      <option key={unidad} value={unidad}>
                        {unidad === 'todas' ? 'Todas las unidades' : unidad}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Cumplimiento MinTIC
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="todos">Todos</option>
                    <option value="cumple">Cumple MinTIC</option>
                    <option value="no_cumple">No Cumple</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filtros por Dominio */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {dominios.map((dominio) => {
            const count = dominio === 'todos'
              ? artefactos.length
              : artefactos.filter(a => a.dominio === dominio).length;

            return (
              <button
                key={dominio}
                onClick={() => setFiltro(dominio)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filtro === dominio
                    ? 'bg-[#003DA5] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {dominio === 'todos' ? 'Todos los Dominios' : dominio}
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                  filtro === dominio ? 'bg-white/20' : 'bg-white'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vista de Tarjetas */}
      {vistaActual === 'tarjetas' && (
        <div className="space-y-3">
          {artefactosFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No se encontraron artefactos</h3>
              <p className="text-gray-600">
                Intenta ajustar los filtros o términos de búsqueda
              </p>
            </div>
          ) : (
            artefactosFiltrados.map((artefacto, index) => (
              <ArtefactoCard
                key={artefacto.id}
                artefacto={artefacto}
                index={index}
                getEstadoBadge={getEstadoBadge}
                canEdit={canEdit}
                onSelect={setSelectedArtefacto}
              />
            ))
          )}
        </div>
      )}

      {/* Vista de Tabla */}
      {vistaActual === 'tabla' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Dominio</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Versión</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Unidad</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">MinTIC</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {artefactosFiltrados.map((artefacto) => (
                  <tr key={artefacto.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">{artefacto.codigo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{artefacto.nombre}</div>
                      <div className="text-sm text-gray-500">{artefacto.tipo.replace('_', ' ')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{artefacto.dominio}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="font-mono text-sm">{artefacto.version}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{artefacto.unidadOrganizacional}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getEstadoBadge(artefacto.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {artefacto.cumpleMinTIC ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors">
                          <Download className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Carga de Artefactos */}
      <UploadArtefactoModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        dominios={dominios.filter(d => d !== 'todos')}
        unidades={unidadesOrganizacionales.filter(u => u !== 'todas')}
      />
    </div>
  );
}

// Componente de Tarjeta de Artefacto
function ArtefactoCard({ artefacto, index, getEstadoBadge, canEdit, onSelect }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
      onClick={() => onSelect(artefacto)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          {/* Icono */}
          <div className={`p-3 rounded-lg ${
            artefacto.estado === 'vigente' ? 'bg-green-50' :
            artefacto.estado === 'en_revision' ? 'bg-yellow-50' :
            artefacto.estado === 'pendiente' ? 'bg-orange-50' : 'bg-gray-50'
          }`}>
            <FileText className={`w-6 h-6 ${
              artefacto.estado === 'vigente' ? 'text-green-600' :
              artefacto.estado === 'en_revision' ? 'text-yellow-600' :
              artefacto.estado === 'pendiente' ? 'text-orange-600' : 'text-gray-600'
            }`} />
          </div>

          {/* Información */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-black text-gray-900">{artefacto.nombre}</h4>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono font-bold">
                    {artefacto.codigo}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{artefacto.descripcion}</p>
              </div>
            </div>

            {/* Badges y Metadatos */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {getEstadoBadge(artefacto.estado)}
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                {artefacto.dominio}
              </span>
              {artefacto.subdominio && (
                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                  {artefacto.subdominio}
                </span>
              )}
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                v{artefacto.version}
              </span>
              {artefacto.cumpleMinTIC && (
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  MinTIC
                </span>
              )}
            </div>

            {/* Grid de Información */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>{artefacto.unidadOrganizacional}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>{artefacto.responsable}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(artefacto.fecha).toLocaleDateString('es-CO')}</span>
              </div>
              {artefacto.archivoTamano && (
                <div className="flex items-center gap-2 text-gray-600">
                  <File className="w-4 h-4" />
                  <span>{artefacto.archivoTamano}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {artefacto.tags && artefacto.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {artefacto.tags.map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-2 ml-4">
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <History className="w-4 h-4 text-gray-600" />
          </button>
          {canEdit && (
            <>
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-yellow-50 transition-colors">
                <Edit className="w-4 h-4 text-yellow-600" />
              </button>
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Barra de Progreso de Versiones */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <History className="w-3 h-3" />
            {artefacto.historialVersiones} versiones
          </span>
          <span>{artefacto.comentarios} comentarios</span>
          {artefacto.aprobador && (
            <span className="text-green-600 font-semibold">✓ Aprobado por {artefacto.aprobador}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Modal de Carga de Artefactos
function UploadArtefactoModal({ isOpen, onClose, dominios, unidades }: any) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black mb-1">Subir Nuevo Artefacto</h3>
              <p className="text-blue-100">Agregar documento al repositorio MRAE</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Zona de Drag & Drop */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.vsd,.vsdx"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-blue-50 rounded-full">
                  <FileUp className="w-12 h-12 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 mb-1">
                    {selectedFile ? selectedFile.name : 'Arrastra tu archivo aquí'}
                  </p>
                  <p className="text-sm text-gray-600">
                    o haz click para seleccionar
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, Word, Excel, PowerPoint, Visio (máx. 50 MB)
                </p>
                {selectedFile && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-semibold">Archivo seleccionado: {selectedFile.name}</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Formulario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Código del Artefacto *
              </label>
              <input
                type="text"
                placeholder="Ej: PETI-2024"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nombre del Documento *
              </label>
              <input
                type="text"
                placeholder="Ej: Plan Estratégico de TI 2024-2027"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Descripción *
              </label>
              <textarea
                rows={3}
                placeholder="Describe el contenido y propósito del artefacto..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Dominio MRAE *
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Seleccionar dominio...</option>
                {dominios.map((d: string) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Tipo de Artefacto *
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Seleccionar tipo...</option>
                <option value="documento_estrategico">Documento Estratégico</option>
                <option value="diagrama">Diagrama</option>
                <option value="catalogo">Catálogo</option>
                <option value="matriz">Matriz</option>
                <option value="modelo">Modelo</option>
                <option value="plan">Plan</option>
                <option value="politica">Política</option>
                <option value="procedimiento">Procedimiento</option>
                <option value="manual">Manual</option>
                <option value="informe">Informe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Unidad Organizacional *
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Seleccionar unidad...</option>
                {unidades.map((u: string) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Versión *
              </label>
              <input
                type="text"
                placeholder="Ej: 1.0"
                defaultValue="1.0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Responsable *
              </label>
              <input
                type="text"
                placeholder="Nombre del responsable"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Aprobador
              </label>
              <input
                type="text"
                placeholder="Nombre del aprobador (opcional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Tags (separados por comas)
              </label>
              <input
                type="text"
                placeholder="Ej: PETI, Estrategia, MinTIC, Obligatorio"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Este artefacto cumple con los requisitos MinTIC
                </span>
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Subir Artefacto
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
