import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle, ShieldAlert, Lock, History, ChevronDown, ChevronRight,
  User, GraduationCap, Briefcase, Phone, BookOpen, CircleCheck, Eye,
  UploadCloud, FileText, FolderOpen, X, Edit2
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../../../shell/src/services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { sanitizeText } from '../../../utils/textSanitizer';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';
import { RundDocumentManager } from './RundDocumentManager';
import { RundDatosCargaOriginal } from './RundDatosCargaOriginal';

// ============================================================================
// CATALOGO BR-039 / RUND CONSTANTS
// ============================================================================

interface CampoDoc {
  campo: string;
  documento: string;
  tipoSoporte: string;
  obligatorio: 'Sí' | 'Si aplica' | 'Derivado' | 'No';
  validacion?: string;
}

const CATALOGO_BR039: Record<string, {
  label: string;
  letra: string;
  subtitle: string;
  icon: any;
  color: string;
  bg: string;
  campos: CampoDoc[];
}> = {
  IDENTIDAD: {
    label: 'Identidad',
    letra: 'A',
    subtitle: 'Documentos que acreditan la identidad del docente',
    icon: User,
    color: '#3b82f6',
    bg: '#EFF6FF',
    campos: [
      { campo: 'Tipo y número de documento', documento: 'Documento de identidad (CC/CE/PA/PEP)', tipoSoporte: 'documento_identidad', obligatorio: 'Sí', validacion: 'BR-054: Coherencia tipo↔formato' },
      { campo: 'Nombre completo', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí', validacion: 'BR-040: Debe coincidir con el soporte' },
      { campo: 'Género', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí' },
      { campo: 'Sexo biológico', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí' },
      { campo: 'Fecha de nacimiento', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí', validacion: 'Debe ser < hoy' },
      { campo: 'Edad / Rango de edad', documento: '— (Calculado)', tipoSoporte: '', obligatorio: 'Derivado', validacion: 'Calculado desde fecha de nacimiento' },
    ],
  },
  CONTACTO: {
    label: 'Contacto',
    letra: 'B',
    subtitle: 'Datos de contacto — no requiere documentos soporte',
    icon: Phone,
    color: '#10b981',
    bg: '#ECFDF5',
    campos: [
      { campo: 'Correo institucional', documento: '— (Asignación institucional)', tipoSoporte: '', obligatorio: 'No', validacion: 'Dominio @esap.edu.co' },
      { campo: 'Correo personal', documento: '— (Autodeclarado)', tipoSoporte: '', obligatorio: 'No', validacion: 'Formato email' },
      { campo: 'Teléfono', documento: '— (Autodeclarado)', tipoSoporte: '', obligatorio: 'No', validacion: 'Formato teléfono' },
    ],
  },
  FORMACION: {
    label: 'Formación Académica',
    letra: 'C',
    subtitle: 'Títulos académicos y soportes de formación',
    icon: GraduationCap,
    color: '#8b5cf6',
    bg: '#F5F3FF',
    campos: [
      { campo: 'Pregrado', documento: 'Diploma + Acta de grado', tipoSoporte: 'diploma_pregrado', obligatorio: 'Sí', validacion: 'Base mínima requerida' },
      { campo: 'Especialización', documento: 'Diploma + Acta de grado', tipoSoporte: 'diploma_especializacion', obligatorio: 'Si aplica' },
      { campo: 'Maestría', documento: 'Diploma + Acta de grado', tipoSoporte: 'diploma_maestria', obligatorio: 'Si aplica' },
      { campo: 'Doctorado', documento: 'Diploma + Acta de grado', tipoSoporte: 'diploma_doctorado', obligatorio: 'Si aplica' },
      { campo: 'Posdoctorado', documento: 'Certificado de estancia posdoctoral', tipoSoporte: 'certificado_posdoctoral', obligatorio: 'Si aplica' },
      { campo: 'Título del exterior', documento: 'Resolución de convalidación MEN', tipoSoporte: 'convalidacion_men', obligatorio: 'Si aplica', validacion: 'BR-051' },
      { campo: 'Nivel de formación', documento: '— (Derivado)', tipoSoporte: '', obligatorio: 'Derivado', validacion: 'BR-050: Título máximo aprobado' },
      { campo: 'Perfil académico / PRO', documento: 'Hoja de vida soportada por títulos', tipoSoporte: 'hoja_vida_pro', obligatorio: 'Sí', validacion: 'Coherente con bloque C' },
    ],
  },
  VINCULACION: {
    label: 'Vinculación',
    letra: 'D',
    subtitle: 'Documentos administrativos de la vinculación docente',
    icon: Briefcase,
    color: '#f59e0b',
    bg: '#FFFBEB',
    campos: [
      { campo: 'Vinculación (tipo)', documento: 'Acto administrativo de vinculación', tipoSoporte: 'acto_administrativo_vinculacion', obligatorio: 'Sí' },
      { campo: 'Régimen normativo', documento: '— (Derivado)', tipoSoporte: '', obligatorio: 'Derivado', validacion: 'BR-049: Coherencia régimen↔vinculación' },
      { campo: 'Origen de vinculación', documento: 'Acto administrativo / Resolución de convocatoria', tipoSoporte: 'resolucion_convocatoria', obligatorio: 'Sí' },
      { campo: 'Acto administrativo', documento: 'Resolución o contrato (el documento mismo)', tipoSoporte: 'contrato', obligatorio: 'Sí', validacion: 'BR-040: Fecha = inicio vinculación' },
      { campo: 'Inicio / Fin de vinculación', documento: 'Acto administrativo / contrato', tipoSoporte: 'contrato', obligatorio: 'Sí', validacion: 'Inicio ≤ Fin' },
      { campo: 'Dedicación (TC/MT/HC)', documento: 'Acto administrativo', tipoSoporte: 'acto_administrativo_dedicacion', obligatorio: 'Sí' },
      { campo: 'Horas semanales', documento: '— (Derivado de dedicación)', tipoSoporte: '', obligatorio: 'Derivado' },
      { campo: 'Horas PTA', documento: 'Acto administrativo / PTA', tipoSoporte: 'acto_administrativo_dedicacion', obligatorio: 'Sí' },
      { campo: 'Situación administrativa', documento: 'Acto administrativo (encargo, comisión, licencia)', tipoSoporte: 'acto_administrativo_situacion', obligatorio: 'Sí' },
      { campo: 'Situación categoría', documento: '— (Derivado)', tipoSoporte: '', obligatorio: 'Derivado' },
      { campo: 'Estado docente', documento: '— (Sistema)', tipoSoporte: '', obligatorio: 'Derivado' },
      { campo: 'Territorial / Sede', documento: 'Acto administrativo de adscripción', tipoSoporte: 'acto_adscripcion_territorial', obligatorio: 'Sí', validacion: 'CETAP no va aquí' },
      { campo: 'Categoría (escalafón)', documento: 'Resolución de escalafón / ubicación en categoría', tipoSoporte: 'resolucion_escalafon', obligatorio: 'Sí', validacion: 'BR-048: Coherencia categoría↔formación' },
      { campo: 'Puntaje salarial', documento: 'Resolución de ubicación salarial', tipoSoporte: 'resolucion_puntaje_salarial', obligatorio: 'Sí', validacion: 'Rango por categoría' },
    ],
  },
  ACADEMICO: {
    label: 'Académico',
    letra: 'E',
    subtitle: 'Asignaciones académicas, investigación y evaluación',
    icon: BookOpen,
    color: '#06b6d4',
    bg: '#ECFEFF',
    campos: [
      { campo: 'Núcleo temático', documento: 'Acto de asignación / definición institucional GGP', tipoSoporte: 'acto_asignacion_nucleo', obligatorio: 'Sí', validacion: 'Lista controlada' },
      { campo: 'Investigación activa', documento: 'Acto de convocatoria / certificación de producto', tipoSoporte: 'certificacion_investigacion', obligatorio: 'Si aplica', validacion: 'Coherente con dedicación' },
      { campo: 'Última evaluación', documento: 'Acta o certificado de evaluación de desempeño (SEDP)', tipoSoporte: 'acta_evaluacion_desempeno', obligatorio: 'Sí', validacion: 'BR-055: Vigencia / caducidad' },
    ],
  },
  TRANSVERSAL: {
    label: 'Transversal',
    letra: 'F',
    subtitle: 'Documentos obligatorios para activar el registro',
    icon: Shield,
    color: '#e11d48',
    bg: '#FFF1F2',
    campos: [
      { campo: 'ID RUND', documento: '— (Sistema)', tipoSoporte: '', obligatorio: 'Derivado' },
      { campo: 'Observaciones', documento: '— (Revisión)', tipoSoporte: '', obligatorio: 'No' },
      { campo: 'Autorización de tratamiento de datos', documento: 'Formato Habeas Data firmado', tipoSoporte: 'autorizacion_habeas_data', obligatorio: 'Sí', validacion: 'BR-057: Bloquea activación si falta' },
    ],
  },
};

const CAMPO_LABELS: Record<string, string> = {
  NOMBRE_COMPLETO: 'Nombre completo',
  DOCUMENTO_IDENTIDAD: 'Número de documento',
  TIPO_DOCUMENTO: 'Tipo de documento',
  FECHA_NACIMIENTO: 'Fecha de nacimiento',
  GENERO: 'Género',
  SEXO_BIOLOGICO: 'Sexo biológico',
  EDAD: 'Edad',
  RANGO_EDAD: 'Rango de edad',
  NIVEL_FORMACION: 'Nivel de formación',
  TITULO_PREGRADO: 'Pregrado',
  TITULO_ESPECIALIZACION: 'Especialización',
  TITULO_MAESTRIA: 'Maestría',
  TITULO_DOCTORADO: 'Doctorado',
  TITULO_POSDOCTORADO: 'Posdoctorado',
  PERFIL_ACADEMICO_PRO: 'Perfil académico PRO',
  PERFIL_ACADEMICO: 'Perfil académico',
  TIPO_VINCULACION: 'Tipo de vinculación',
  DEDICACION: 'Dedicación',
  DEDICACION_HORAS_SEMANA: 'Horas semanales',
  HORAS_PTA: 'Horas PTA',
  CATEGORIA_ESCALAFON: 'Categoría / escalafón',
  TERRITORIAL: 'Territorial',
  REGIMEN_NORMATIVO: 'Régimen normativo',
  ORIGEN_VINCULACION: 'Origen de vinculación',
  ACTO_ADMINISTRATIVO: 'Acto administrativo',
  INICIO_VINCULACION: 'Inicio de vinculación',
  FIN_VINCULACION: 'Fin de vinculación',
  PUNTAJE_SALARIAL: 'Puntaje salarial',
  SITUACION_ADMINISTRATIVA: 'Situación administrativa',
  SITUACION_CATEGORIA: 'Situación categoría',
  ESTADO_DOCENTE: 'Estado docente',
  NUCLEO_TEMATICO: 'Núcleo temático',
  INVESTIGACION_ACTIVA: 'Investigación activa',
  ULTIMA_EVALUACION: 'Última evaluación',
  CORREO_INSTITUCIONAL: 'Correo institucional',
  CORREO_ALTERNATIVO: 'Correo alternativo',
  TELEFONO: 'Teléfono',
  OBSERVACIONES: 'Observaciones',
  ID_RUND: 'ID RUND',
};

const OBLIG_BADGE: Record<string, { bg: string, text: string, label: string }> = {
  'Sí': { bg: '#FEF2F2', text: '#DC2626', label: 'Obligatorio' },
  'No': { bg: '#F1F5F9', text: '#64748B', label: 'Opcional' },
  'Si aplica': { bg: '#FFFBEB', text: '#D97706', label: 'Si Aplica' },
  'Derivado': { bg: '#F3F4F6', text: '#4B5563', label: 'Automático' }
};

const formatDateForRund = (value: string | Date): string | null => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-CO', { timeZone: 'UTC' });
};

const cleanRundDisplayText = (value: unknown): string => {
  return sanitizeText(String(value))
    .replace(/aÃ±os/g, 'a\u00f1os')
    .replace(/aÃƒÂ±os/g, 'a\u00f1os')
    .replace(/mÃ¡s/g, 'm\u00e1s')
    .replace(/mÃƒÂ¡s/g, 'm\u00e1s');
};

export const getDatoExtraido = (bloqueId: string, campoLabel: string, tarjetaRund: any) => {
  const campos = tarjetaRund?.bloques?.[bloqueId]?.campos || [];
  const lowerLabel = campoLabel.toLowerCase();
  const normalLabel = campoLabel.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const formatValue = (value: any) => {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) return formatDateForRund(value);
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return formatDateForRund(value) || cleanRundDisplayText(value);
    }
    if (typeof value === 'string') return cleanRundDisplayText(value);
    return value;
  };

  const findValue = (key: string) => {
    const field = campos.find((c: any) => c.campo === key);
    if (key === 'PUNTAJE_SALARIAL' && (field?.restringido || tarjetaRund?.proteccion_datos?.acceso_completo !== true)) return 'Información restringida';
    return formatValue(field?.valor);
  };

  if (normalLabel.includes('tipo y numero')) return [findValue('TIPO_DOCUMENTO'), findValue('DOCUMENTO_IDENTIDAD')].filter(Boolean).join(' · ') || null;
  if (normalLabel.includes('nivel de formacion')) return findValue('NIVEL_FORMACION');
  if (normalLabel.includes('regimen')) return findValue('REGIMEN_NORMATIVO');
  if (normalLabel.includes('situacion categoria')) return findValue('SITUACION_CATEGORIA');
  if (normalLabel.includes('investigacion')) return findValue('INVESTIGACION_ACTIVA');
  if (normalLabel.includes('ultima evaluacion')) return findValue('ULTIMA_EVALUACION');

  if (lowerLabel.includes('edad')) {
    const edad = findValue('EDAD');
    const rango = findValue('RANGO_EDAD');
    return [edad ? `${edad} a\u00f1os` : null, rango].filter(Boolean).join(' / ') || null;
  }
  if (lowerLabel.includes('sexo biol')) return findValue('SEXO_BIOLOGICO');
  if (lowerLabel.includes('inicio / fin')) {
    const inicio = findValue('INICIO_VINCULACION');
    const fin = findValue('FIN_VINCULACION');
    return [inicio, fin || 'Indefinido'].filter(Boolean).join(' - ') || null;
  }
  if (lowerLabel.includes('perfil')) {
    const perfilPro = findValue('PERFIL_ACADEMICO_PRO');
    const perfil = findValue('PERFIL_ACADEMICO');
    return [perfilPro, perfil].filter(Boolean).join(' / ') || null;
  }
  if (lowerLabel.includes('regimen') || lowerLabel.includes('rÃ©gimen')) return findValue('REGIMEN_NORMATIVO');
  if (lowerLabel.includes('origen')) return findValue('ORIGEN_VINCULACION');
  if (lowerLabel.includes('horas semanales')) return findValue('DEDICACION_HORAS_SEMANA');
  if (lowerLabel.includes('horas pta')) return findValue('HORAS_PTA');
  if (lowerLabel.includes('situacion categoria') || lowerLabel.includes('situaciÃ³n categorÃ­a')) return findValue('SITUACION_CATEGORIA');
  if (lowerLabel.includes('estado docente')) return findValue('ESTADO_DOCENTE');
  if (lowerLabel.includes('puntaje')) return findValue('PUNTAJE_SALARIAL');
  if (lowerLabel.includes('investigacion') || lowerLabel.includes('investigaciÃ³n')) return findValue('INVESTIGACION_ACTIVA');
  if (lowerLabel.includes('ultima evaluacion') || lowerLabel.includes('Ãºltima evaluaciÃ³n')) return findValue('ULTIMA_EVALUACION');
  if (lowerLabel.includes('id rund')) return findValue('ID_RUND');
  if (lowerLabel.includes('observaciones')) return findValue('OBSERVACIONES');
  if (lowerLabel.includes('posdoctorado')) return findValue('TITULO_POSDOCTORADO');
  
  let keyToFind = '';
  if (lowerLabel.includes('tipo y número') || lowerLabel.includes('documento')) keyToFind = 'DOCUMENTO_IDENTIDAD';
  else if (lowerLabel.includes('nombre')) keyToFind = 'NOMBRE_COMPLETO';
  else if (lowerLabel.includes('género')) keyToFind = 'GENERO';
  else if (lowerLabel.includes('fecha de nacimiento') || lowerLabel.includes('edad')) keyToFind = 'FECHA_NACIMIENTO';
  else if (lowerLabel.includes('correo inst')) keyToFind = 'CORREO_INSTITUCIONAL';
  else if (lowerLabel.includes('correo personal')) keyToFind = 'CORREO_ALTERNATIVO';
  else if (lowerLabel.includes('teléfono')) keyToFind = 'TELEFONO';
  else if (lowerLabel.includes('pregrado')) keyToFind = 'TITULO_PREGRADO';
  else if (lowerLabel.includes('especialización')) keyToFind = 'TITULO_ESPECIALIZACION';
  else if (lowerLabel.includes('maestría')) keyToFind = 'TITULO_MAESTRIA';
  else if (lowerLabel.includes('doctorado')) keyToFind = 'TITULO_DOCTORADO';
  else if (lowerLabel.includes('vinculación (tipo)')) keyToFind = 'TIPO_VINCULACION';
  else if (lowerLabel.includes('dedicación')) keyToFind = 'DEDICACION';
  else if (lowerLabel.includes('categoría')) keyToFind = 'CATEGORIA_ESCALAFON';
  else if (lowerLabel.includes('territorial')) keyToFind = 'TERRITORIAL';
  else if (lowerLabel.includes('situación')) keyToFind = 'SITUACION_ADMINISTRATIVA';
  else if (lowerLabel.includes('acto administrativo')) keyToFind = 'ACTO_ADMINISTRATIVO';
  else if (lowerLabel.includes('núcleo temático')) keyToFind = 'NUCLEO_TEMATICO';

  if (keyToFind) {
    const found = campos.find((c: any) => c.campo === keyToFind);
    return found ? formatValue(found.valor) : null;
  }
  return null;
};

const RUND_ESTADO_BADGE: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  'Aprobado':        { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', icon: CheckCircle, label: 'Aprobado' },
  'Pendiente':       { bg: '#FEFCE8', text: '#CA8A04', border: '#FDE68A', icon: History,        label: 'Pendiente' },
  'En revisión':     { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', icon: Eye,          label: 'En revisión' },
  'Devuelto':        { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', icon: ShieldAlert,      label: 'Devuelto' },
  'Soporte faltante': { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA', icon: ShieldAlert, label: 'Falta soporte' },
};

const getRundEstadoBadge = (estado: string) => RUND_ESTADO_BADGE[estado] || RUND_ESTADO_BADGE['Pendiente'];

function replaceRecordIfChanged<T extends string>(
  previous: Record<string, T>,
  next: Record<string, T>,
): Record<string, T> {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  if (previousKeys.length !== nextKeys.length) return next;
  return nextKeys.every((key) => previous[key] === next[key]) ? previous : next;
}

function mergeRecordValues<T extends string>(
  previous: Record<string, T>,
  incoming: Record<string, T>,
): Record<string, T> {
  const incomingEntries = Object.entries(incoming) as [string, T][];
  if (incomingEntries.length === 0) return previous;

  let changed = false;
  const next = { ...previous };
  incomingEntries.forEach(([key, value]) => {
    if (next[key] !== value) {
      next[key] = value;
      changed = true;
    }
  });

  return changed ? next : previous;
}

export function RundValidationPanel({ docenteId, cleanPersonaId, docente, onUpdated }: { docenteId: string, cleanPersonaId?: string, docente?: any, onUpdated?: () => void }) {
  const [tarjetaRund, setTarjetaRund] = useState<any | null>(null);
  const [rundBloques, setRundBloques] = useState<any[]>([]);
  const [rundAuditLog, setRundAuditLog] = useState<any[]>([]);
  const [auditError, setAuditError] = useState(false);
  const [loadingRund, setLoadingRund] = useState(false);
  const [selectedRundBloque, setSelectedRundBloque] = useState<string>('IDENTIDAD');
  const [showRundAudit, setShowRundAudit] = useState(false);
  const [documentRevision, setDocumentRevision] = useState(0);
  const [returnSupport, setReturnSupport] = useState<{ support: any; block: string } | null>(null);
  const [supportReason, setSupportReason] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [rundActionLoading, setRundActionLoading] = useState<string | null>(null);
  const [devolverRundBloque, setDevolverRundBloque] = useState<string | null>(null);
  const [devolverRundObs, setDevolverRundObs] = useState('');
  const [docStatus, setDocStatus] = useState<Record<string, 'Aprobado' | 'Rechazado'>>({});
  const [supportUrls, setSupportUrls] = useState<Record<string, string>>({});
  const [viewingDoc, setViewingDoc] = useState<{ url: string, nombre: string, campo: string, displayUrl?: string, loading?: boolean, error?: string } | null>(null);

  useEffect(() => {
    const objectUrl = viewingDoc?.displayUrl;
    return () => {
      if (objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
    };
  }, [viewingDoc?.displayUrl]);
  const [isEditing, setIsEditing] = useState(false);
  const auth = useAuth();

  const requestSequence = useRef(0);
  const periodo = docente?.periodoCarga || docente?.periodo_carga;
  const currentPeriodoCarga = periodo ? String(periodo) : null;

  const canManageDocuments = useMemo(() => {
    const role = String(auth.userRole || auth.session?.rol || '').trim().toUpperCase();
    return auth.isSuperUser
      || ['GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN'].includes(role)
      || auth.hasAnyPermission([
        'banco-docentes.rund.documents.manage',
        'banco-docentes.rund.manage',
      ]);
  }, [auth]);

  const canEditRund = useMemo(() => {
    const role = String(auth.userRole || auth.session?.rol || '').trim().toUpperCase();
    return auth.isSuperUser
      || ['GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN'].includes(role)
      || auth.hasAnyPermission(['banco-docentes.rund.edit', 'banco-docentes.rund.manage']);
  }, [auth]);

  const canValidateRund = useMemo(() => {
    const role = String(auth.userRole || auth.session?.rol || '').trim().toUpperCase();
    return auth.isSuperUser
      || ['GESTION_PROFESORAL', 'SUPER_ADMIN'].includes(role)
      || auth.hasAnyPermission(['banco-docentes.rund.validate', 'banco-docentes.rund.manage']);
  }, [auth]);

  const openDocViewer = async (url: string, nombre: string, campo: string, tipoSoporte?: string) => {
    if (tarjetaRund?.proteccion_datos?.acceso_completo === false) {
      toast.error('El documento original está restringido para su rol.');
      return;
    }
    if (!url || url === 'mock') {
      toast.error('No se encontró un archivo guardado para este soporte. Actualice el expediente.');
      return;
    }

    setViewingDoc({ url, nombre, campo, displayUrl: '', loading: true });

    try {
      const blob = await apiClient.getBlob(url);
      const extMatch = url.match(/\.([a-zA-Z0-9]+)$/);
      const tipo = extMatch ? extMatch[1].toLowerCase() : 'pdf';
      let mime = 'application/pdf';
      if (['png', 'jpg', 'jpeg'].includes(tipo)) mime = `image/${tipo === 'jpg' ? 'jpeg' : tipo}`;
      
      const typedBlob = blob.type ? blob : blob.slice(0, blob.size, mime);
      const objectUrl = URL.createObjectURL(typedBlob);
      
      setViewingDoc({ url, nombre, campo, displayUrl: objectUrl, loading: false });
    } catch (err: any) {
      console.error('[RundValidationPanel] Error cargando documento:', err);
      toast.error('No se pudo cargar el documento para previsualización');
      setViewingDoc({ url, nombre, campo, displayUrl: '', loading: false, error: err.message || 'Error al cargar' });
    }
  };

  const fetchRundData = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoadingRund(true);
    setLoadError(false);
    try {
      let dataId = docenteId;
      if (cleanPersonaId && !docenteId) {
        const qs = currentPeriodoCarga ? `?periodoCarga=${encodeURIComponent(currentPeriodoCarga)}` : '';
        const res = await apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/by-persona/${cleanPersonaId}/tarjeta-rund${qs}`);
        dataId = res?.data?.docenteId || res?.docenteId;
      }
      if (!dataId) throw new Error('No se encontró un registro RUND persistido.');
      const [tarjetaResult, bloquesResult, auditResult] = await Promise.allSettled([
        apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${dataId}/tarjeta-rund?_t=${Date.now()}`),
        apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${dataId}/bloques?_t=${Date.now()}`),
        apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${dataId}/auditoria?_t=${Date.now()}`),
      ]);
      if (sequence !== requestSequence.current) return;
      if (tarjetaResult.status === 'rejected' || bloquesResult.status === 'rejected') {
        throw new Error('No fue posible consultar el expediente vigente.');
      }
      const tar = tarjetaResult.value?.data || tarjetaResult.value;
      const blq = bloquesResult.value?.data || bloquesResult.value;
      if (!tar?.docenteId || !Array.isArray(blq) || !blq.length) {
        throw new Error('El servidor no devolvió un expediente válido.');
      }
      const auditRes = auditResult.status === 'fulfilled' ? auditResult.value : null;
      const auditRows = auditRes?.data || auditRes;
      setAuditError(auditResult.status === 'rejected' || !Array.isArray(auditRows));
      setTarjetaRund(tar);
      setRundBloques(blq);
      setRundAuditLog(Array.isArray(auditRows) ? auditRows : []);

      const statuses: Record<string, 'Aprobado' | 'Rechazado'> = {};
      const urls: Record<string, string> = {};
      for (const block of blq) {
        for (const field of CATALOGO_BR039[block.bloque]?.campos || []) {
          const support = (block.soportes || []).find((item: any) => item.tipo_soporte === field.tipoSoporte
            || (field.tipoSoporte === 'documento_identidad' && ['cedula_extranjeria', 'pasaporte'].includes(item.tipo_soporte)));
          if (!support) continue;
          if (support.documento_carpeta_id) urls[field.campo] = support.documento_carpeta_id;
          if (['Aprobado', 'Rechazado'].includes(support.estado)) statuses[field.campo] = support.estado;
        }
      }
      setDocStatus(previous => replaceRecordIfChanged(previous, statuses));
      setSupportUrls(previous => replaceRecordIfChanged(previous, urls));
      setDocumentRevision(value => value + 1);
    } catch (err) {
      if (sequence !== requestSequence.current) return;
      console.error('[RundValidationPanel] Error consultando expediente:', err);
      setLoadError(true);
      setTarjetaRund(null);
      setRundBloques([]);
      setRundAuditLog([]);
      setDocStatus({});
      setSupportUrls({});
      setViewingDoc(null);
    } finally {
      if (sequence === requestSequence.current) setLoadingRund(false);
    }
  }, [docenteId, cleanPersonaId, currentPeriodoCarga]);

  useEffect(() => {
    setTarjetaRund(null);
    setViewingDoc(null);
    setReturnSupport(null);
    setDevolverRundBloque(null);
    setIsEditing(false);
    setSelectedRundBloque('IDENTIDAD');
    void fetchRundData();
    return () => { requestSequence.current += 1; };
  }, [fetchRundData]);

  const toggleRundBloque = (bloque: string) => {
    setSelectedRundBloque(bloque);
  };

  const handleUploadFile = async (file: File, tipoSoporte: string, campo: string) => {
    if (rundActionLoading || loadingRund || loadError) return;
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) {
      toast.error('Seleccione un PDF válido de máximo 10 MB.');
      return;
    }
    toast(`Subiendo: ${file.name}...`);
    if (!tarjetaRund?.docenteId || !selectedRundBloque) {
      toast.error('Error: Faltan datos del RUND o bloque seleccionado.');
      return;
    }

    setRundActionLoading(`subir-${campo}`);
    try {
      const formData = new FormData();
      // Obtener nombre del docente desde: tarjeta RUND → prop docente → fallback
      const p = tarjetaRund?.persona;
      const identidadCampos: any[] = tarjetaRund?.bloques?.IDENTIDAD?.campos || [];
      const nombreDesdeBloque = identidadCampos.find((c: any) => c.campo === 'NOMBRE_COMPLETO')?.valor;
      const docDesdeBloque = identidadCampos.find((c: any) => c.campo === 'DOCUMENTO_IDENTIDAD')?.valor;
      
      const nombreCompleto = p
        ? (p.nombre_completo || p.nom_largo || `${p.primer_nombre || ''} ${p.primer_apellido || ''}`.trim())
        : (nombreDesdeBloque || docente?.nombre_completo || `Docente-${tarjetaRund.docenteId?.substring(0, 8) || 'Desconocido'}`);
      const docIdentidad = p
        ? (p.documento_identidad || p.num_identificacion || '')
        : (docDesdeBloque || docente?.documento_identidad || '');
      
      formData.append('docenteNombre', nombreCompleto);
      formData.append('docenteDocumento', docIdentidad);
      formData.append('tipoSoporte', tipoSoporte);
      formData.append('file', file);

      // CORRECTO: usar apiClient.upload (multipart/form-data) en vez de apiClient.post (JSON)
      const res = await apiClient.upload<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${selectedRundBloque}/soportes`, formData);

      // apiClient.upload unwraps { success: true, data: {id, bloque, tipoSoporte} } → returns {id, bloque, tipoSoporte}
      // We verify success by checking for the returned id (UUID from RundSoporteCampo insert),
      // or fallback to a truthy res that isn't an error object.
      const isSuccess = !!res?.id;
      if (isSuccess) {
        toast.success(`Documento "${file.name}" cargado exitosamente en RUND.`);
        if (res.validacionTipo?.validated && !res.validacionTipo.matched) {
          toast.warning('El contenido podría no corresponder al soporte solicitado. Revíselo antes de aprobar.');
        }
        const urlStr = res?.contenidoUrl || res?.url || res?.documentoCarpetaId;
        // SINCRONIZACION TIEMPO REAL: recargar bloques desde el backend
        // para que la Carpeta Digital refleje inmediatamente el documento subido
        await fetchRundData();

        // Emitir evento de sincronización para que la Carpeta Digital se refresque
        // sin necesidad de recargar la página. Esto funciona para todos los docentes.
        window.dispatchEvent(new CustomEvent('rund:soporte-uploaded', {
          detail: {
            docenteId: tarjetaRund.docenteId,
            bloque: selectedRundBloque,
            tipoSoporte,
            documentoCarpetaId: urlStr,
            nombreArchivo: file.name,
          }
        }));

      } else {
        toast.error('Error al subir el soporte.');
      }
    } catch (err: any) {
      console.error('[RundValidationPanel] Error al subir soporte:', err);
      toast.error(err?.message || 'Error al subir el soporte.');
    } finally {
      setRundActionLoading(null);
    }
  };

  const handleAprobarRund = async (bloque: string) => {
    if (rundActionLoading || loadingRund || loadError || !tarjetaRund?.docenteId) return;
    setRundActionLoading(bloque);
    try {
      const res = await apiClient.post<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${bloque}/aprobar`, {
      });

      if (res && res.success !== false) {
        toast.success(`Bloque ${bloque} aprobado correctamente.`);
        await fetchRundData();
        window.dispatchEvent(new CustomEvent('rund:soporte-uploaded', { detail: { docenteId: tarjetaRund.docenteId, accion: 'REVISION' } }));
        onUpdated?.();
      } else {
        toast.error('No se pudo aprobar el bloque.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar las validaciones.');
    } finally {
      setRundActionLoading(null);
    }
  };

  const handleDevolverRund = async () => {
    if (rundActionLoading || loadingRund || loadError || !devolverRundBloque || !devolverRundObs.trim() || !tarjetaRund?.docenteId) return;
    setRundActionLoading(devolverRundBloque);
    try {
      const res = await apiClient.post<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${devolverRundBloque}/devolver`, {
        observacion: devolverRundObs,
      });
      if (res && res.success !== false) {
        toast.success(`Bloque ${devolverRundBloque} devuelto.`);
        setDevolverRundBloque(null);
        setDevolverRundObs('');
        await fetchRundData();
        window.dispatchEvent(new CustomEvent('rund:soporte-uploaded', { detail: { docenteId: tarjetaRund.docenteId, accion: 'REVISION' } }));
        onUpdated?.();
      } else {
        toast.error('No se pudo devolver el bloque.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al devolver el bloque.');
    } finally {
      setRundActionLoading(null);
    }
  };

  const findRundSoporte = (soportes: any[], tipo: string) =>
    soportes?.find((s: any) => s.tipo_soporte === tipo || s.tipo === tipo
      || (tipo === 'documento_identidad' && ['cedula_extranjeria', 'pasaporte'].includes(s.tipo_soporte)));

  const reviewSupport = async (support: any, block: string, estado: 'Aprobado' | 'Rechazado', observacion?: string) => {
    if (!support || rundActionLoading || loadingRund || loadError) return;
    setRundActionLoading(`review-${support.id}`);
    try {
      await apiClient.post(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${block}/soportes/${support.id}/revision`, {
        estado, observacion, documentoVersionId: support.documento_perfil_id || support.documento_carpeta_id,
        blockVersion: Number(rundBloques.find(b => b.bloque === block)?.version),
      });
      toast.success(estado === 'Aprobado' ? 'Soporte aprobado. Decisión registrada.' : 'Soporte devuelto para corrección.');
      setReturnSupport(null);
      setSupportReason('');
      setViewingDoc(null);
      await fetchRundData();
      window.dispatchEvent(new CustomEvent('rund:soporte-uploaded', { detail: { docenteId: tarjetaRund.docenteId, accion: 'REVISION' } }));
      onUpdated?.();
    } catch (error: any) { toast.error(error?.message || 'No fue posible registrar la revisión.'); }
    finally { setRundActionLoading(null); }
  };

  const reviewField = (fieldName: string, estado: 'Aprobado' | 'Rechazado') => {
    const field = CATALOGO_BR039[selectedRundBloque]?.campos.find(c => c.campo === fieldName);
    const block = rundBloques.find(b => b.bloque === selectedRundBloque);
    const support = field && findRundSoporte(block?.soportes || [], field.tipoSoporte);
    if (!support) return;
    if (estado === 'Rechazado') {
      setViewingDoc(null);
      setReturnSupport({ support, block: selectedRundBloque });
      setSupportReason('');
    } else { void reviewSupport(support, selectedRundBloque, estado); }
  };

  const sortedRundBloques = useMemo(() => {
    const blockOrder = ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'];
    return [...rundBloques].sort((a, b) => {
      return blockOrder.indexOf(a.bloque) - blockOrder.indexOf(b.bloque);
    });
  }, [rundBloques]);

  if (loadingRund && !tarjetaRund) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>Cargando datos de RUND...</div>;
  }

  if (loadError) {
    return <div role="alert" style={{ padding: 20, background: '#FFFBEB', color: '#92400E', borderRadius: 12 }}>
      No se pudo verificar el estado vigente del expediente. <button onClick={fetchRundData}>Reintentar</button>
    </div>;
  }

  if (!tarjetaRund) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>No se encontraron datos RUND para este docente.</div>;
  }

  return (
    <div aria-busy={loadingRund} style={{ background: '#FAFBFC', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      
      {loadError && <div role="alert" style={{ padding: 16, background: '#FFFBEB', color: '#92400E' }}>No se pudo verificar el estado vigente. Actualice antes de cargar o revisar documentos. <button onClick={fetchRundData}>Reintentar</button></div>}
      {canValidateRund && <div style={{ padding: '12px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <button onClick={() => setShowRundAudit(v => !v)} style={{ border: 0, background: 'transparent', color: '#003DA5', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><History size={16} /> {showRundAudit ? 'Ocultar trazabilidad' : 'Ver trazabilidad de revisiones y documentos'}</button>
        {showRundAudit && <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 12 }}>
          <p style={{ fontSize: 12, color: '#64748B' }}>Últimas 50 acciones. Se conserva el historial de cargas, versiones y decisiones.</p>
          {auditError ? <p role="alert" style={{ fontSize: 12, color: '#B91C1C' }}>No fue posible consultar la trazabilidad. <button onClick={fetchRundData}>Reintentar</button></p> : rundAuditLog.length === 0 && <p style={{ fontSize: 12 }}>Sin acciones registradas.</p>}
          {rundAuditLog.map((entry: any) => <div key={entry.id} style={{ borderLeft: '2px solid #CBD5E1', padding: '8px 14px', marginBottom: 8, fontSize: 12 }}>
            <strong>{String(entry.accion).replaceAll('_', ' ')} · {CATALOGO_BR039[entry.bloque]?.label || entry.bloque}</strong>
            <div style={{ color: '#64748B', marginTop: 4 }}>{entry.actorId || entry.actor_id} · {new Date(entry.createdAt).toLocaleString('es-CO')}</div>
            {entry.metadata?.nombreArchivo && <div>{entry.metadata.nombreArchivo}</div>}
            {entry.metadata?.version && <div>Versión {entry.metadata.version}</div>}
            {entry.metadata?.versionNueva && <div>Versión {entry.metadata.versionAnterior} → {entry.metadata.versionNueva}</div>}
            {entry.observacion && <div style={{ marginTop: 4 }}>{entry.observacion}</div>}
          </div>)}
        </div>}
      </div>}
      {returnSupport && <div role="dialog" aria-modal="true" aria-label="Devolver soporte" style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(15,23,42,.6)', display: 'grid', placeItems: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 'min(520px, 90vw)' }}>
          <h3 style={{ marginTop: 0 }}>Devolver soporte</h3><p>{returnSupport.support.nombre_archivo}</p>
          <label htmlFor="support-return-reason">Motivo y corrección requerida</label>
          <textarea id="support-return-reason" autoFocus value={supportReason} onChange={e => setSupportReason(e.target.value)} maxLength={2000} rows={4} style={{ width: '100%', marginTop: 8, padding: 12, border: '1px solid #CBD5E1', borderRadius: 8 }} />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <button disabled={!!rundActionLoading} onClick={() => setReturnSupport(null)}>Cancelar</button>
            <button disabled={!supportReason.trim() || !!rundActionLoading} onClick={() => reviewSupport(returnSupport.support, returnSupport.block, 'Rechazado', supportReason.trim())} style={{ padding: '10px 16px', borderRadius: 8, border: 0, background: '#B91C1C', color: '#fff' }}>Confirmar devolución</button>
          </div>
        </div>
      </div>}
      {/* Header Info */}
      <div style={{ padding: '20px 24px', background: 'linear-gradient(to right, #ffffff, #F8FAFC)', borderBottom: '1px solid #E5E7EB', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield style={{ color: '#003DA5' }} size={20} />
            Validación Integral RUND
            {canEditRund && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{ marginLeft: 16, padding: '4px 12px', borderRadius: 6, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#DBEAFE'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#EFF6FF'}
              >
                <Edit2 size={14} /> Editar Datos
              </button>
            )}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: 500 }}>
            ID RUND: <span style={{ color: '#0F172A' }}>{tarjetaRund.idRund}</span> · Periodo: <span style={{ color: '#0F172A' }}>{tarjetaRund.periodoCarga || currentPeriodoCarga || 'Sin periodo'}</span>
          </p>
          {tarjetaRund.proteccion_datos?.acceso_completo === false && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9A6700', fontWeight: 700 }}>
              Cédula enmascarada y puntaje salarial oculto según su rol.
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right', minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Espacios aprobados</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
              {rundBloques.filter(b => b.estado === 'Aprobado').length} / {rundBloques.length || 6}
            </div>
            <div style={{ width: 140, height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
              {(() => {
                const aprobados = rundBloques.filter(b => b.estado === 'Aprobado').length;
                const total = rundBloques.length || 6;
                const pct = total > 0 ? Math.round((aprobados / total) * 100) : 0;
                return (
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 4,
                    background: pct === 100 ? 'linear-gradient(to right, #10B981, #059669)' : pct >= 50 ? 'linear-gradient(to right, #FCD34D, #F59E0B)' : 'linear-gradient(to right, #FCA5A5, #EF4444)',
                    transition: 'width 0.5s ease-out'
                  }} />
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <RundDocumentManager
        docenteId={tarjetaRund.docenteId}
        canManage={canManageDocuments && !loadError}
        revision={documentRevision}
        evidenceOptions={Object.entries(CATALOGO_BR039).flatMap(([block, config]) => config.campos.filter((field, index, fields) => field.tipoSoporte && fields.findIndex(f => f.tipoSoporte === field.tipoSoporte) === index).map(field => ({ block, type: field.tipoSoporte, label: `${config.label} · ${field.campo}` })))}
        onView={(url, name, label) => openDocViewer(url, name, label)}
        onChanged={fetchRundData}
      />

      {/* Horizontal Tabs Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 450 }}>
        
        {/* Top Tabs: Categories List */}
        <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #E5E7EB', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {sortedRundBloques.map(b => {
            const cfg = CATALOGO_BR039[b.bloque];
            if (!cfg) return null;
            const isSelected = selectedRundBloque === b.bloque;
            const est = getRundEstadoBadge(b.estado);
            const EstIcon = est.icon;

            return (
              <div 
                key={b.bloque} 
                onClick={() => toggleRundBloque(b.bloque)}
                style={{ 
                  padding: '16px 24px', 
                  cursor: 'pointer', 
                  borderBottom: `3px solid ${b.estado === 'Aprobado' ? '#10B981' : isSelected ? cfg.color : 'transparent'}`,
                  background: b.estado === 'Aprobado' ? '#ECFDF5' : isSelected ? '#FAFBFC' : 'transparent',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  whiteSpace: 'nowrap',
                  opacity: isSelected ? 1 : 0.7
                }}
              >
                <div style={{ 
                  width: 28, height: 28, borderRadius: 8, 
                  background: b.estado === 'Aprobado' ? '#10B981' : isSelected ? `linear-gradient(135deg, ${cfg.color}, ${cfg.color}DD)` : '#F1F5F9',
                  color: b.estado === 'Aprobado' || isSelected ? 'white' : '#64748B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '0.8rem', fontWeight: 800,
                  boxShadow: isSelected ? `0 4px 10px ${cfg.color}40` : 'none'
                }}>
                  {b.estado === 'Aprobado' ? <CheckCircle size={18} /> : cfg.letra}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#0F172A' : '#475569' }}>{cfg.label}</div>
                  <div style={{ fontSize: '0.65rem', color: b.estado === 'Aprobado' ? '#047857' : isSelected ? cfg.color : '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <EstIcon size={10} /> {est.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content Pane: Selected Category Details */}
        <div style={{ flex: 1, background: '#FAFBFC', position: 'relative' }}>
          {(() => {
            const b = sortedRundBloques.find(x => x.bloque === selectedRundBloque);
            if (!b) return null;
            const cfg = CATALOGO_BR039[b.bloque];
            const canApprove = b.estado !== 'Aprobado' && !loadError;
            const hasAllRequired = cfg.campos.filter(c => c.obligatorio === 'Sí' || (c.obligatorio === 'Si aplica' && !['', 'no', 'no aplica', 'n/a', 'ninguno', 'ninguna'].includes(String(getDatoExtraido(b.bloque, c.campo, tarjetaRund) ?? '').trim().toLowerCase()))).every(c => !c.tipoSoporte || findRundSoporte(b.soportes || [], c.tipoSoporte));
            const allReviewed = (b.soportes || []).filter((s: any) => !['soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(s.tipo_soporte)).every((s: any) => s.estado === 'Aprobado');
            const isDevolverOpen = devolverRundBloque === b.bloque;

            return (
              <div style={{ padding: 32, display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {cfg.label}
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B', marginTop: 4 }}>{cfg.subtitle}</p>
                </div>

                {b.estado === 'Aprobado' && (
                  <div style={{ padding: 16, marginBottom: 20, borderRadius: 12, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <CheckCircle size={24} /><div><strong>Espacio aprobado</strong><div style={{ fontSize: 12, marginTop: 4 }}>Información y soportes revisados{b.fecha_revision ? ` · ${new Date(b.fecha_revision).toLocaleString('es-CO')}` : ''}. Una nueva versión requerirá otra revisión.</div></div>
                  </div>
                )}
                {b.observacion && (
                  <div style={{ padding: '12px 16px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA', fontSize: '0.8rem', color: '#991B1B', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <ShieldAlert size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <strong style={{ display: 'block', marginBottom: 2 }}>Observación de revisión:</strong>
                      {b.observacion}
                    </div>
                  </div>
                )}

                <RundDatosCargaOriginal
                  bloque={b.bloque}
                  datos={tarjetaRund.datos_carga_masiva}
                  accesoCompleto={tarjetaRund.proteccion_datos?.acceso_completo === true}
                />

                {/* Unified Validation List */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={18} color="#003DA5" /> Puntos de Control y Evidencia
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {cfg.campos.map((c, idx) => {
                      const soporte = c.tipoSoporte ? findRundSoporte(b.soportes || [], c.tipoSoporte) : null;
                      const localDocUrl = c.tipoSoporte ? supportUrls[c.campo] : null;
                      const hasDoc = !!soporte || !!localDocUrl;
                      const activeUrl = soporte?.documento_carpeta_id || localDocUrl || soporte?.documentoCarpetaId || soporte?.url || '';
                      const isRequired = c.obligatorio === 'Sí' || (c.obligatorio === 'Si aplica' && !['', 'no', 'no aplica', 'n/a', 'ninguno', 'ninguna'].includes(String(getDatoExtraido(b.bloque, c.campo, tarjetaRund) ?? '').trim().toLowerCase()));
                      const isDerived = c.obligatorio === 'Derivado';
                      const datoExtraido = getDatoExtraido(b.bloque, c.campo, tarjetaRund);

                      return (
                        <div key={idx} style={{ 
                          background: 'white', 
                          borderRadius: 12, 
                          border: `1px solid ${docStatus[c.campo] === 'Aprobado' ? '#A7F3D0' : docStatus[c.campo] === 'Rechazado' ? '#FCA5A5' : hasDoc ? '#FCD34D' : isRequired && c.tipoSoporte ? '#FCA5A5' : '#E2E8F0'}`,
                          display: 'flex',
                          overflow: 'hidden',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}>
                          {/* Col 1: Dato */}
                          <div style={{ width: '30%', padding: '16px 20px', borderRight: '1px solid #F1F5F9', background: '#FAFBFC' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{c.campo}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: datoExtraido !== null ? '#0F172A' : '#94A3B8', overflowWrap: 'anywhere' }}>{datoExtraido ?? 'No registrado / Auto'}</div>
                          </div>

                          {/* Col 2: Soporte Documental */}
                          <div style={{ width: '45%', padding: '16px 20px', borderRight: '1px solid #F1F5F9', display: 'flex', alignItems: 'center' }}>
                            {!c.tipoSoporte ? (
                               <div style={{ color: '#94A3B8', fontSize: 12, fontStyle: 'italic' }}>{c.documento}</div>
                            ) : hasDoc ? (
                               <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FileText size={18} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{c.documento}</div>
                                    <div style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>Cargado exitosamente</div>
                                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>PDF · Máximo 10 MB por archivo</div>
                                  </div>
                                  {cfg.campos.findIndex(x => x.tipoSoporte === c.tipoSoporte) === idx && (
                                    <>
                                      <button 
                                        onClick={() => openDocViewer(activeUrl, c.documento, c.campo, c.tipoSoporte)}
                                        style={{ padding: '6px 12px', borderRadius: 6, background: '#EFF6FF', border: 'none', color: '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                                      >
                                        <Eye size={14}/> Ver
                                      </button>
                                      {canManageDocuments && (
                                        <>
                                          <button
                                            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            title="Reemplazar documento (PDF, máximo 10 MB)"
                                            onClick={() => {
                                              const el = document.getElementById(`upload-${c.campo}`);
                                              if (el) el.click();
                                            }}
                                          >
                                            <Edit2 size={13} />
                                          </button>
                                          <input
                                            id={`upload-${c.campo}`}
                                            type="file"
                                            accept="application/pdf,.pdf"
                                            style={{ display: 'none' }}
                                            disabled={rundActionLoading === `subir-${c.campo}`}
                                            onChange={(e) => {
                                              if (e.target.files && e.target.files.length > 0) {
                                                const file = e.target.files[0];
                                                handleUploadFile(file, c.tipoSoporte as string, c.campo);
                                              }
                                              e.target.value = '';
                                            }}
                                          />
                                        </>
                                      )}
                                    </>
                                  )}
                               </div>
                            ) : cfg.campos.findIndex(x => x.tipoSoporte === c.tipoSoporte) !== idx ? (
                               <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{c.documento}</div>
                                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Soporte unificado (cargar arriba)</div>
                                  </div>
                               </div>
                            ) : (
                               <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F8FAFC', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px dashed #CBD5E1' }}>
                                    <UploadCloud size={18} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{c.documento}</div>
                                    <div style={{ fontSize: 10, color: isRequired ? '#DC2626' : '#94A3B8', fontWeight: 600 }}>{isRequired ? 'Soporte Obligatorio' : 'Opcional'}</div>
                                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>PDF · Máximo 10 MB por archivo</div>
                                  </div>
                                  {canManageDocuments ? <label style={{ padding: '6px 12px', borderRadius: 6, background: rundActionLoading === `subir-${c.campo}` ? '#E2E8F0' : 'white', border: '1px solid #CBD5E1', color: '#475569', fontSize: 11, fontWeight: 600, cursor: rundActionLoading === `subir-${c.campo}` ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', opacity: rundActionLoading === `subir-${c.campo}` ? 0.7 : 1 }}>
                                    <input 
                                      type="file"
                                      accept="application/pdf,.pdf"
                                      style={{ display: 'none' }} 
                                      disabled={rundActionLoading === `subir-${c.campo}`}
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                          const file = e.target.files[0];
                                          handleUploadFile(file, c.tipoSoporte as string, c.campo);
                                        }
                                        e.target.value = '';
                                      }}
                                    />
                                    <UploadCloud size={14}/> {rundActionLoading === `subir-${c.campo}` ? 'Cargando...' : 'Subir'}
                                  </label> : <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Solo consulta</span>}
                               </div>
                            )}
                          </div>

                          {/* Col 3: Estado / Acción individual */}
                          <div style={{ width: '30%', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, background: hasDoc ? '#F8FAFC' : 'transparent' }}>
                            {soporte?.observacion && <span style={{ fontSize: 11, color: '#B91C1C' }}>{soporte.observacion}</span>}
                            {!canValidateRund && hasDoc && !docStatus[c.campo] && <span style={{ fontSize: 11, color: '#92400E' }}>Pendiente de revisión</span>}
                            {isDerived ? (
                               <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>Dato Automático</span>
                            ) : hasDoc ? (
                               docStatus[c.campo] === 'Aprobado' ? (
                                 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 800, background: '#10B981', color: 'white' }}><CheckCircle size={14}/> Aprobado</span>
                               ) : docStatus[c.campo] === 'Rechazado' ? (
                                 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 800, background: '#FEF2F2', color: '#DC2626' }}><ShieldAlert size={14}/> Devuelto</span>
                               ) : (
                                 <div style={{ display: 'flex', gap: 8 }}>
                                    {canValidateRund && (
                                      <button 
                                        disabled={!!rundActionLoading || loadingRund || loadError}
                                        onClick={() => reviewField(c.campo, 'Aprobado')}
                                        style={{ padding: '6px 12px', borderRadius: 6, background: 'white', border: '1px solid #10B981', color: '#10B981', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}
                                      >
                                        <CheckCircle size={14} /> Aprobar
                                      </button>
                                    )}
                                    {canValidateRund && (
                                      <button 
                                        disabled={!!rundActionLoading || loadingRund || loadError}
                                        onClick={() => reviewField(c.campo, 'Rechazado')}
                                        style={{ padding: '6px 12px', borderRadius: 6, background: 'white', border: '1px solid #EF4444', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}
                                      >
                                        <ShieldAlert size={14} /> Devolver
                                      </button>
                                    )}
                                 </div>
                               )
                            ) : isRequired && c.tipoSoporte ? (
                               <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 800, background: '#FEF2F2', color: '#DC2626' }}><ShieldAlert size={14}/> Falta Soporte</span>
                            ) : (
                               <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>No Requerido</span>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #E2E8F0' }}>
                  {isDevolverOpen ? (
                    <div style={{ background: '#FEF2F2', padding: 20, borderRadius: 12, border: '1px solid #FECACA', animation: 'fadeIn 0.2s' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldAlert size={16} /> Motivo de la Devolución
                      </div>
                      <textarea 
                        value={devolverRundObs} 
                        onChange={e => setDevolverRundObs(e.target.value)} 
                        placeholder="Especifique qué soporte hace falta o por qué la información no coincide..." 
                        rows={3} 
                        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #FCA5A5', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} 
                      />
                      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button onClick={handleDevolverRund} disabled={!devolverRundObs.trim() || rundActionLoading === b.bloque} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: devolverRundObs.trim() ? '#DC2626' : '#FCA5A5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: devolverRundObs.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>Confirmar devolución</button>
                        <button onClick={() => { setDevolverRundBloque(null); setDevolverRundObs(''); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
                      {b.estado === 'Aprobado' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, background: '#ECFDF5', color: '#059669', fontSize: 13, fontWeight: 700 }}>
                          <Lock size={16} /> Bloque Aprobado
                        </div>
                      )}
                      
                      {canApprove && !allReviewed && <span style={{ fontSize: 12, color: '#92400E' }}>Revise los soportes pendientes antes de aprobar el espacio.</span>}
                      {canApprove && !hasAllRequired && <span style={{ fontSize: 12, color: '#B91C1C' }}>Faltan soportes obligatorios.</span>}
                      {canApprove && (
                        <>
                          {canValidateRund && (
                            <button onClick={() => setDevolverRundBloque(b.bloque)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                              <ShieldAlert size={16} /> Devolver
                            </button>
                          )}
                          {canValidateRund && (
                            <button onClick={() => handleAprobarRund(b.bloque)} disabled={!!rundActionLoading || !allReviewed || !hasAllRequired || loadError} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0, 61, 165, 0.3)' }}>
                              <CheckCircle size={16} /> Aprobar bloque
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })()}
        </div>

      </div>

      {/* World-Class Document Viewer Modal */}
      {viewingDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ width: '90%', maxWidth: 1000, height: '90vh', background: '#FAFBFC', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{viewingDoc.nombre}</h2>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B', fontWeight: 600 }}>Visualizador Seguro de Documentos RUND</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingDoc(null)}
                style={{ width: 36, height: 36, borderRadius: 18, background: '#F1F5F9', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content (The Viewer) */}
            <div style={{ flex: 1, background: '#E2E8F0', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
               {viewingDoc.loading ? (
                 <div style={{ textAlign: 'center', color: '#64748B' }}>
                   <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Cargando documento...</div>
                   <div style={{ fontSize: 13 }}>Por favor espera</div>
                 </div>
               ) : viewingDoc.error ? (
                 <div style={{ textAlign: 'center', color: '#DC2626' }}>
                   <ShieldAlert size={48} style={{ margin: '0 auto 12px' }} />
                   <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Error al cargar el documento</div>
                   <div style={{ fontSize: 13 }}>{viewingDoc.error}</div>
                 </div>
               ) : viewingDoc.displayUrl ? (
                 <iframe 
                   src={viewingDoc.displayUrl} 
                   style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12, background: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                   title="Document Viewer"
                 />
               ) : (
                 <p>No se pudo recuperar el archivo guardado.</p>
               )}
            </div>

            {/* Modal Footer (Action Buttons) */}
            <div style={{ padding: '20px 24px', background: 'white', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                 ¿El documento cumple con los requisitos normativos para <strong style={{ color: '#0F172A' }}>{viewingDoc.campo}</strong>?
               </div>
               <div style={{ display: 'flex', gap: 12 }}>
                 {canValidateRund && !viewingDoc.loading && !viewingDoc.error && CATALOGO_BR039[selectedRundBloque]?.campos.some(c => c.campo === viewingDoc.campo && supportUrls[c.campo] === viewingDoc.url) && (
                   <button disabled={!!rundActionLoading || loadingRund || loadError}
                     onClick={() => {
                       reviewField(viewingDoc.campo, 'Rechazado');
                     }}
                     style={{ padding: '10px 20px', borderRadius: 8, background: 'white', border: '1px solid #EF4444', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                   >
                     <ShieldAlert size={16} /> Devolver documento
                   </button>
                 )}
                 {canValidateRund && !viewingDoc.loading && !viewingDoc.error && CATALOGO_BR039[selectedRundBloque]?.campos.some(c => c.campo === viewingDoc.campo && supportUrls[c.campo] === viewingDoc.url) && (
                   <button disabled={!!rundActionLoading || loadingRund || loadError}
                     onClick={() => {
                       reviewField(viewingDoc.campo, 'Aprobado');
                     }}
                     style={{ padding: '10px 24px', borderRadius: 8, background: '#10B981', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}
                   >
                     <CheckCircle size={16} /> Aprobar Documento
                   </button>
                 )}
               </div>
            </div>

          </div>
        </div>
      )}
      {isEditing && (
        <BancoDocenteEditModal
          docente={{
            id: tarjetaRund.docenteId,
            ...docente, // Usar datos del docente para prellenar si están disponibles
          }}
          onClose={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            fetchRundData();
            onUpdated?.();
          }}
        />
      )}
    </div>
  );
}
