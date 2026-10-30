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
import { RundExtractionPanel } from './RundExtractionPanel';
import { RundDatosCargaOriginal } from './RundDatosCargaOriginal';
import { canUploadRundField, groupRundEvidenceOptions, hasRundData } from '../../../utils/rundEvidenceData';
import { rundActorName } from '../../../utils/rundActorName';
import { rundReviewStatus } from '../../../utils/rundReviewStatus';
import { canReturnRundBlock } from '../../../utils/rundReturnEligibility';
import { hasRundPermission, RUND_INCORPORATION_SUPPORTS, RUND_PROFILE_PERMISSIONS } from '../../../../../shared/rund-permissions';
import { RundIncorporationPanel } from './RundIncorporationPanel';
import { RundPhotoPanel } from './RundPhotoPanel';
import { RundCheckpointEvidence, RundPdfPicker } from './RundCheckpointEvidence';
import './RundCheckpointEvidence.css';
import { PHOTO_MANAGE, PHOTO_VALIDATE } from '../../../../../shared/profile-photos';
import { rundCheckpointEvidences, rundDocumentDecision, rundEvidenceDecision } from '../../../utils/rundEvidenceRules';

// ============================================================================
// CATALOGO BR-039 / RUND CONSTANTS
// ============================================================================

interface CampoDoc {
  revisionId?: string;
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
      { revisionId: 'DOCUMENTO_IDENTIDAD', campo: 'Tipo y número de documento', documento: 'Documento de identidad (CC/CE/PA/PEP)', tipoSoporte: 'documento_identidad', obligatorio: 'Sí', validacion: 'BR-054: Coherencia tipo↔formato' },
      { revisionId: 'NOMBRE_COMPLETO', campo: 'Nombre completo', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí', validacion: 'BR-040: Debe coincidir con el soporte' },
      { revisionId: 'GENERO', campo: 'Género', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí' },
      { revisionId: 'SEXO_BIOLOGICO', campo: 'Sexo biológico', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí' },
      { revisionId: 'FECHA_NACIMIENTO', campo: 'Fecha de nacimiento', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí', validacion: 'Debe ser < hoy' },
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
      { revisionId: 'CORREO_INSTITUCIONAL', campo: 'Correo institucional', documento: '— (Asignación institucional)', tipoSoporte: '', obligatorio: 'No', validacion: 'Dominio @esap.edu.co' },
      { revisionId: 'CORREO_ALTERNATIVO', campo: 'Correo personal', documento: '— (Autodeclarado)', tipoSoporte: '', obligatorio: 'No', validacion: 'Formato email' },
      { revisionId: 'TELEFONO', campo: 'Teléfono', documento: '— (Autodeclarado)', tipoSoporte: '', obligatorio: 'No', validacion: 'Formato teléfono' },
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
      { campo: 'Título del exterior', documento: 'Reconocimiento del título en Colombia (convalidación)', tipoSoporte: 'convalidacion_men', obligatorio: 'Si aplica', validacion: 'BR-051' },
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
      { revisionId: 'ACTO_ADMINISTRATIVO', campo: 'Acto administrativo', documento: 'Resolución o contrato (el documento mismo)', tipoSoporte: 'contrato', obligatorio: 'Sí', validacion: 'BR-040: Fecha = inicio vinculación' },
      { revisionId: 'FECHAS_VINCULACION', campo: 'Inicio / Fin de vinculación', documento: 'Acto administrativo / contrato', tipoSoporte: 'contrato', obligatorio: 'Sí', validacion: 'Inicio ≤ Fin' },
      { revisionId: 'DEDICACION', campo: 'Dedicación (TC/MT/HC)', documento: 'Acto administrativo', tipoSoporte: 'acto_administrativo_dedicacion', obligatorio: 'Sí' },
      { campo: 'Horas semanales', documento: '— (Derivado de dedicación)', tipoSoporte: '', obligatorio: 'Derivado' },
      { revisionId: 'HORAS_PTA', campo: 'Horas PTA', documento: 'Acto administrativo / PTA', tipoSoporte: 'acto_administrativo_dedicacion', obligatorio: 'Sí' },
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
    subtitle: 'Información transversal y validación del revisor',
    icon: Shield,
    color: '#e11d48',
    bg: '#FFF1F2',
    campos: [
      { campo: 'ID RUND', documento: '— (Sistema)', tipoSoporte: '', obligatorio: 'Derivado' },
      { revisionId: 'OBSERVACIONES', campo: 'Observaciones', documento: '— (Revisión)', tipoSoporte: '', obligatorio: 'No' },
      { campo: 'Autorización de tratamiento de datos', documento: 'Formato Habeas Data firmado', tipoSoporte: 'autorizacion_habeas_data', obligatorio: 'Sí', validacion: 'BR-057: Validación expresa del revisor' },
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
  'Soporte faltante': { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA', icon: ShieldAlert, label: 'Pendiente de revisión' },
};

const getRundEstadoBadge = (estado: string) => RUND_ESTADO_BADGE[estado] || RUND_ESTADO_BADGE['Pendiente'];

export function RundValidationPanel({ docenteId, cleanPersonaId, docente, onUpdated }: { docenteId: string, cleanPersonaId?: string, docente?: any, onUpdated?: () => void }) {
  const [tarjetaRund, setTarjetaRund] = useState<any | null>(null);
  const [rundBloques, setRundBloques] = useState<any[]>([]);
  const [rundAuditLog, setRundAuditLog] = useState<any[]>([]);
  const [auditError, setAuditError] = useState(false);
  const [loadingRund, setLoadingRund] = useState(false);
  const [selectedRundBloque, setSelectedRundBloque] = useState<string>('IDENTIDAD');
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showRundAudit, setShowRundAudit] = useState(false);
  const [documentRevision, setDocumentRevision] = useState(0);
  const [returnSupport, setReturnSupport] = useState<{ support: any; block: string; field: CampoDoc } | null>(null);
  const [supportReason, setSupportReason] = useState('');
  const [returnData,setReturnData] = useState<{block:string;field:CampoDoc}|null>(null);
  const [dataReason,setDataReason] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [rundActionLoading, setRundActionLoading] = useState<string | null>(null);
  const [devolverRundBloque, setDevolverRundBloque] = useState<string | null>(null);
  const [devolverRundObs, setDevolverRundObs] = useState('');
  // review: evidence opened from a checkpoint, so the viewer can admit or return exactly that file.
  const [viewingDoc, setViewingDoc] = useState<{ url: string, nombre: string, campo: string, displayUrl?: string, loading?: boolean, error?: string,
    review?: { support: any; block: string; field: CampoDoc } } | null>(null);

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

  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const revealSelectedTab = () => {
      const selected = tabs.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!selected) return;
      const bounds = tabs.getBoundingClientRect();
      const item = selected.getBoundingClientRect();
      if (item.left < bounds.left) tabs.scrollLeft += item.left - bounds.left;
      else if (item.right > bounds.right) tabs.scrollLeft += item.right - bounds.right;
    };
    revealSelectedTab();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(revealSelectedTab);
    observer?.observe(tabs);
    return () => observer?.disconnect();
  }, [selectedRundBloque, tarjetaRund?.docenteId, rundBloques.length]);

  const canManageDocuments = useMemo(() => {
    return hasRundPermission(auth, 'banco-docentes.rund.documents.manage') || hasRundPermission(auth, 'banco-docentes.rund.manage');
  }, [auth]);

  const canEditRund = useMemo(() => {
    return hasRundPermission(auth, 'banco-docentes.rund.edit') || hasRundPermission(auth, 'banco-docentes.rund.manage');
  }, [auth]);

  const canValidateRund = useMemo(() => {
    return hasRundPermission(auth, 'banco-docentes.rund.validate') || hasRundPermission(auth, 'banco-docentes.rund.manage');
  }, [auth]);

  const canRegisterIncorporation = hasRundPermission(auth, RUND_PROFILE_PERMISSIONS.INCORPORADOR) || hasRundPermission(auth, 'banco-docentes.rund.manage');
  const canManageSupport = (type: string) => canManageDocuments || canRegisterIncorporation && RUND_INCORPORATION_SUPPORTS.includes(type as any);
  const canReadExtraction = canEditRund || canValidateRund || canRegisterIncorporation;
  const expedienteContext = JSON.stringify([docenteId,cleanPersonaId,currentPeriodoCarga,canValidateRund]);
  const activeExpedienteContext = useRef<string|null>(expedienteContext);

  const openDocViewer = async (url: string, nombre: string, campo: string, review?: { support: any; block: string; field: CampoDoc }) => {
    if (tarjetaRund?.proteccion_datos?.acceso_completo === false) {
      toast.error('El documento original está restringido para su rol.');
      return;
    }
    if (!url || url === 'mock') {
      toast.error('No se encontró un archivo guardado para este soporte. Actualice el expediente.');
      return;
    }

    setViewingDoc({ url, nombre, campo, displayUrl: '', loading: true, review });

    try {
      const blob = await apiClient.getBlob(url);
      const extMatch = url.match(/\.([a-zA-Z0-9]+)$/);
      const tipo = extMatch ? extMatch[1].toLowerCase() : 'pdf';
      let mime = 'application/pdf';
      if (['png', 'jpg', 'jpeg'].includes(tipo)) mime = `image/${tipo === 'jpg' ? 'jpeg' : tipo}`;
      
      const typedBlob = blob.type ? blob : blob.slice(0, blob.size, mime);
      const objectUrl = URL.createObjectURL(typedBlob);
      
      setViewingDoc({ url, nombre, campo, displayUrl: objectUrl, loading: false, review });
    } catch (err: any) {
      console.error('[RundValidationPanel] Error cargando documento:', err);
      toast.error('No se pudo cargar el documento para previsualización');
      setViewingDoc({ url, nombre, campo, displayUrl: '', loading: false, error: err.message || 'Error al cargar', review });
    }
  };

  const fetchRundData = useCallback(async () => {
    // A completed action may still hold the callback from the previously opened profile.
    if(activeExpedienteContext.current!==expedienteContext)return;
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
        canValidateRund ? apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${dataId}/auditoria?_t=${Date.now()}`) : Promise.resolve([]),
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
      setDocumentRevision(value => value + 1);
    } catch (err) {
      if (sequence !== requestSequence.current) return;
      console.error('[RundValidationPanel] Error consultando expediente:', err);
      setLoadError(true);
      setTarjetaRund(null);
      setRundBloques([]);
      setRundAuditLog([]);
      setViewingDoc(null);
    } finally {
      if (sequence === requestSequence.current) setLoadingRund(false);
    }
  }, [docenteId, cleanPersonaId, currentPeriodoCarga, canValidateRund, expedienteContext]);

  useEffect(() => {
    activeExpedienteContext.current = expedienteContext;
    setTarjetaRund(null);
    setViewingDoc(null);
    setReturnSupport(null);
    setReturnData(null);setDataReason('');
    setDevolverRundBloque(null);
    setIsEditing(false);
    setSelectedRundBloque('IDENTIDAD');
    void fetchRundData();
    return () => {
      requestSequence.current += 1;
      if(activeExpedienteContext.current===expedienteContext)activeExpedienteContext.current=null;
    };
  }, [fetchRundData]);

  const toggleRundBloque = (bloque: string) => {
    setSelectedRundBloque(bloque);
  };

  /** Without a target the file is added as another evidence; with one, that exact evidence gets a new version. */
  const handleUploadFile = async (file: File, tipoSoporte: string, campo: string, replaceTarget?: any) => {
    if (!canManageSupport(tipoSoporte) || rundActionLoading || loadingRund || loadError) return;
    // Legacy evidences only have a folder file: they are replaced through their review row.
    const replaceDocumentId = replaceTarget?.documento_perfil_id;
    const replaceLegacySupportId = replaceTarget && !replaceDocumentId ? replaceTarget.id : undefined;
    const field = CATALOGO_BR039[selectedRundBloque]?.campos.find(item => item.campo === campo && item.tipoSoporte === tipoSoporte);
    if (!field || !canUploadRundField(selectedRundBloque, field, tarjetaRund)) {
      toast.error('Registre primero el dato de la fila antes de cargar su soporte.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) {
      toast.error('Seleccione un PDF válido de máximo 10 MB.');
      return;
    }
    toast(`Subiendo: ${file.name}...`);
    if (!tarjetaRund?.docenteId || !selectedRundBloque) {
      toast.error('Error: Faltan datos del RUND o bloque seleccionado.');
      return;
    }

    setRundActionLoading(replaceTarget ? `reemplazar-${replaceTarget.id}` : `subir-${campo}`);
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
      formData.append('campo', field.revisionId || field.tipoSoporte);
      if (replaceDocumentId) formData.append('documentoId', replaceDocumentId);
      else if (replaceLegacySupportId) formData.append('soporteHistoricoId', replaceLegacySupportId);
      else formData.append('modo', 'agregar');
      formData.append('file', file);

      // CORRECTO: usar apiClient.upload (multipart/form-data) en vez de apiClient.post (JSON)
      const res = await apiClient.upload<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${selectedRundBloque}/soportes`, formData);

      // apiClient.upload unwraps { success: true, data: {id, bloque, tipoSoporte} } → returns {id, bloque, tipoSoporte}
      // We verify success by checking for the returned id (UUID from RundSoporteCampo insert),
      // or fallback to a truthy res that isn't an error object.
      const isSuccess = !!res?.id;
      if (isSuccess) {
        toast.success(replaceTarget ? `Evidencia reemplazada por "${file.name}". La versión anterior se conserva en el historial.`
          : `Documento "${file.name}" cargado exitosamente en RUND.`);
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
    if (!canValidateRund || rundActionLoading || loadingRund || loadError || !tarjetaRund?.docenteId) return;
    setRundActionLoading(bloque);
    try {
      const res = await apiClient.post<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${bloque}/aprobar`, {
        blockVersion: Number(rundBloques.find(b => b.bloque === bloque)?.version),
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
    if (!canValidateRund || rundActionLoading || loadingRund || loadError || !devolverRundBloque || !devolverRundObs.trim() || !tarjetaRund?.docenteId) return;
    if (!canReturnRundBlock(rundBloques.find(b => b.bloque === devolverRundBloque))) return;
    setRundActionLoading(devolverRundBloque);
    try {
      const res = await apiClient.post<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${devolverRundBloque}/devolver`, {
        observacion: devolverRundObs,
        blockVersion: Number(rundBloques.find(b => b.bloque === devolverRundBloque)?.version),
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

  const canReviewCurrentSupport = (support: any, block: string) => {
    const current = rundBloques.find(b => b.bloque === block)?.soportes?.find((s: any) => s.id === support?.id);
    return !!current && canReturnRundBlock({ bloque: block, soportes: [current] })
      && (current.documento_perfil_id || current.documento_carpeta_id) === (support.documento_perfil_id || support.documento_carpeta_id);
  };

  const reviewSupport = async (support: any, block: string, field: CampoDoc, estado: 'Aprobado' | 'Rechazado', observacion?: string) => {
    if (!canValidateRund || !support || rundActionLoading || loadingRund || loadError) return;
    if (!canReviewCurrentSupport(support, block)) return;
    setRundActionLoading(`review-${support.id}`);
    try {
      await apiClient.post(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${block}/soportes/${support.id}/revision`, {
        estado, observacion, alcance: 'documento', documentoVersionId: support.documento_perfil_id || support.documento_carpeta_id,
        blockVersion: Number(rundBloques.find(b => b.bloque === block)?.version),
      });
      toast.success(estado === 'Aprobado' ? 'Soporte admitido para todos los datos que acredita.' : 'Soporte devuelto para corrección.');
      setReturnSupport(null);
      setSupportReason('');
      setViewingDoc(null);
      await fetchRundData();
      window.dispatchEvent(new CustomEvent('rund:soporte-uploaded', { detail: { docenteId: tarjetaRund.docenteId, accion: 'REVISION' } }));
      onUpdated?.();
    } catch (error: any) { toast.error(error?.message || 'No fue posible registrar la revisión.'); }
    finally { setRundActionLoading(null); }
  };

  /** One decision covers the document and its accredited fields; returns require a reason. */
  const reviewEvidence = (support: any, block: string, field: CampoDoc, estado: 'Aprobado' | 'Rechazado') => {
    if (!support) return;
    if (estado === 'Rechazado') {
      setViewingDoc(null);
      setReturnSupport({ support, block, field });
      setSupportReason('');
    } else { void reviewSupport(support, block, field, estado); }
  };
  const reviewData = async (block:string,field:CampoDoc,estado:'Aprobado'|'Rechazado',observacion?:string) => {
    if(!canValidateRund||rundActionLoading||loadingRund||loadError||!tarjetaRund?.docenteId)return;
    const current=rundBloques.find(item=>item.bloque===block);
    const campo=field.revisionId||field.tipoSoporte;
    const decision=current?.revisionDatos?.[campo];
    if(!decision?.huella)return;
    setRundActionLoading(`data-${campo}`);
    try{
      await apiClient.post(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${block}/datos/${campo}/revision`,{
        estado,observacion,huella:decision.huella,blockVersion:Number(current.version),
      });
      toast.success(estado==='Aprobado'?'Dato validado. La aprobación final del bloque sigue pendiente.':'Dato devuelto para corrección.');
      setReturnData(null);setDataReason('');await fetchRundData();onUpdated?.();
      window.dispatchEvent(new CustomEvent('rund:soporte-uploaded',{detail:{docenteId:tarjetaRund.docenteId,accion:'REVISION'}}));
    }catch(error:any){toast.error(error?.message||'No fue posible revisar el dato.');}
    finally{setRundActionLoading(null);}
  };
  useEffect(()=>{if(!canValidateRund){setReturnData(null);setDataReason('');}},[canValidateRund]);
  const evidenceNumber = (support: any, block: string) => {
    const evidences = rundCheckpointEvidences(rundBloques.find(b => b.bloque === block)?.soportes || [], support?.tipo_soporte);
    return evidences.length > 1 ? { number: evidences.findIndex(item => item.id === support?.id) + 1, total: evidences.length } : null;
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

  const reviewStatus = rundReviewStatus(Object.fromEntries(rundBloques.map(b => [b.bloque, b.estado])));
  const viewerReview = viewingDoc?.review;
  const viewerSupport = viewerReview && rundBloques.find(b => b.bloque === viewerReview.block)?.soportes?.find((s: any) => s.id === viewerReview.support.id);
  // The viewer decides only on the evidence it shows, while that version is current and the row is still pending.
  const viewerCanReview = Boolean(canValidateRund && viewingDoc && !viewingDoc.loading && !viewingDoc.error && viewerReview && viewerSupport
    && canReviewCurrentSupport(viewerReview.support, viewerReview.block)
    && rundDocumentDecision(viewerSupport, CATALOGO_BR039[viewerReview.block].campos.filter(field => field.tipoSoporte === viewerReview.field.tipoSoporte)).estado === 'Pendiente');

  return (
    <div aria-busy={loadingRund} style={{ background: reviewStatus.approved ? '#F0FDF4' : '#FAFBFC', borderRadius: 16, border: `1px solid ${reviewStatus.approved ? '#86EFAC' : '#E5E7EB'}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      
      {loadError && <div role="alert" style={{ padding: 16, background: '#FFFBEB', color: '#92400E' }}>No se pudo verificar el estado vigente. Actualice antes de cargar o revisar documentos. <button onClick={fetchRundData}>Reintentar</button></div>}
      {canValidateRund && <div style={{ padding: '12px 24px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <button onClick={() => setShowRundAudit(v => !v)} style={{ border: 0, background: 'transparent', color: '#003DA5', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><History size={16} /> {showRundAudit ? 'Ocultar trazabilidad' : 'Ver trazabilidad de revisiones y documentos'}</button>
        {showRundAudit && <div role="region" aria-label="Trazabilidad de revisiones y documentos" style={{ maxHeight: 320, overflowY: 'auto', marginTop: 12 }}>
          <p style={{ fontSize: 12, color: '#64748B' }}>Últimas 50 acciones. Se conserva el historial de cargas, versiones y decisiones.</p>
          {auditError ? <p role="alert" style={{ fontSize: 12, color: '#B91C1C' }}>No fue posible consultar la trazabilidad. <button onClick={fetchRundData}>Reintentar</button></p> : rundAuditLog.length === 0 && <p style={{ fontSize: 12 }}>Sin acciones registradas.</p>}
          {rundAuditLog.map((entry: any) => <div key={entry.id} style={{ borderLeft: '2px solid #CBD5E1', padding: '8px 14px', marginBottom: 8, fontSize: 12 }}>
            <strong>{String(entry.accion).replace(/_/g, ' ')} ·{CATALOGO_BR039[entry.bloque]?.label || (entry.bloque === 'DOCUMENTAL' ? 'Expediente documental' : entry.bloque)}</strong>
            <div style={{ color: '#64748B', marginTop: 4 }}>{rundActorName(entry.actorNombre, entry.actorId || entry.actor_id)} · {new Date(entry.createdAt).toLocaleString('es-CO')}</div>
            {Array.isArray(entry.metadata?.campos) && entry.metadata.alcance === 'documento' && <div>Revisión del documento completo · {entry.metadata.campos.length} datos</div>}
            {entry.metadata?.campo && <div>Fila: {CATALOGO_BR039[entry.bloque]?.campos.find(c => (c.revisionId || c.tipoSoporte) === entry.metadata.campo)?.campo || entry.metadata.campo}</div>}
            {Number(entry.metadata?.evidenciasVigentes) > 1 && entry.metadata?.evidencia && <div>Evidencia {entry.metadata.evidencia} de {entry.metadata.evidenciasVigentes}{entry.metadata.evidenciaAdicional ? ' · evidencia adicional' : ''}</div>}
            {entry.accion === 'ELIMINAR_DOCUMENTO' && entry.metadata?.evidenciasVigentes !== undefined && <div>Evidencias vigentes del punto: {entry.metadata.evidenciasVigentes}</div>}
            {Array.isArray(entry.metadata?.orden) && <div>Orden de análisis: {entry.metadata.orden.map((item: any) => `${item.posicion}. ${item.nombreArchivo || 'Documento'}`).join(' · ')}</div>}
            {entry.metadata?.nombreArchivo && <div>{entry.metadata.nombreArchivo}</div>}
            {entry.metadata?.version && <div>Versión {entry.metadata.version}</div>}
            {entry.metadata?.versionNueva && <div>Versión {entry.metadata.versionAnterior} → {entry.metadata.versionNueva}</div>}
            {entry.observacion && <div style={{ marginTop: 4 }}>{entry.observacion}</div>}
          </div>)}
        </div>}
      </div>}
      {returnData&&<div role="dialog" aria-modal="true" aria-label="Devolver dato" className="rund-data-return">
        <div><h3>Devolver dato para corrección</h3><strong>{returnData.field.campo}</strong>
          <p>Indica qué está incorrecto en el dato y qué debe corregirse. Los archivos conservan su revisión independiente.</p>
          <label htmlFor="rund-data-return-reason">Motivo y corrección del dato</label>
          <textarea id="rund-data-return-reason" autoFocus value={dataReason} onChange={event=>setDataReason(event.target.value)} maxLength={2000} rows={4}/>
          <footer><button type="button" disabled={!!rundActionLoading} onClick={()=>setReturnData(null)}>Cancelar</button>
            <button type="button" disabled={!dataReason.trim()||!!rundActionLoading||loadingRund||loadError} onClick={()=>reviewData(returnData.block,returnData.field,'Rechazado',dataReason.trim())}>Confirmar devolución del dato</button></footer>
        </div>
      </div>}
      {returnSupport && <div role="dialog" aria-modal="true" aria-label="Devolver soporte" style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(15,23,42,.6)', display: 'grid', placeItems: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 'min(520px, 90vw)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Devolver soporte</h3><p>{returnSupport.field.documento}</p>
          <p style={{ overflowWrap: 'anywhere' }}>{(() => { const position = evidenceNumber(returnSupport.support, returnSupport.block);
            return position ? `Evidencia ${position.number} de ${position.total} · ` : ''; })()}{returnSupport.support.nombre_archivo}</p>
          <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>La decisión cubre el documento completo y los datos que acredita. La devolución queda registrada; si otra evidencia válida los respalda, podrás aprobar el bloque con ella.</p>
          <label htmlFor="support-return-reason">Motivo y corrección requerida</label>
          <textarea id="support-return-reason" autoFocus value={supportReason} onChange={e => setSupportReason(e.target.value)} maxLength={2000} rows={4} style={{ width: '100%', marginTop: 8, padding: 12, border: '1px solid #CBD5E1', borderRadius: 8 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <button disabled={!!rundActionLoading} onClick={() => setReturnSupport(null)}>Cancelar</button>
            <button disabled={!supportReason.trim() || !!rundActionLoading || !canReviewCurrentSupport(returnSupport.support, returnSupport.block)} onClick={() => reviewSupport(returnSupport.support, returnSupport.block, returnSupport.field, 'Rechazado', supportReason.trim())} style={{ padding: '10px 16px', borderRadius: 8, border: 0, background: '#B91C1C', color: '#fff' }}>Confirmar devolución</button>
          </div>
        </div>
      </div>}
      {/* Header Info */}
      <div style={{ padding: '20px 24px', background: reviewStatus.approved ? '#ECFDF5' : 'linear-gradient(to right, #ffffff, #F8FAFC)', borderBottom: '1px solid #E5E7EB', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div role="status" style={{ fontSize: 12, fontWeight: 700, color: reviewStatus.approved ? '#047857' : reviewStatus.returned ? '#B91C1C' : '#64748B', marginBottom: 6 }}>{reviewStatus.label}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Secciones de datos aprobadas</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
              {reviewStatus.count} / {reviewStatus.total}
            </div>
            <div style={{ width: 140, height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
              {(() => {
                const aprobados = reviewStatus.count;
                const total = reviewStatus.total;
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
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>Contacto no requiere soporte documental.</div>
        </div>
      </div>

      {/* Horizontal Tabs Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 450 }}>
        
        {/* Top Tabs: Categories List */}
        <div ref={tabsRef} role="tablist" aria-label="Secciones del expediente RUND" onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
          const index = tabs.indexOf(event.target as HTMLButtonElement);
          if (index < 0) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          tabs[next].focus();
          tabs[next].click();
        }} style={{ display: 'flex', background: 'white', borderBottom: '1px solid #E5E7EB', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {sortedRundBloques.map(b => {
            const cfg = CATALOGO_BR039[b.bloque];
            if (!cfg) return null;
            const isSelected = selectedRundBloque === b.bloque;
            const est = getRundEstadoBadge(b.estado);
            const EstIcon = est.icon;

            return (
              <button
                type="button" role="tab" aria-selected={isSelected} tabIndex={isSelected ? 0 : -1}
                id={`rund-tab-${tarjetaRund.docenteId}-${b.bloque}`} aria-controls={`rund-panel-${tarjetaRund.docenteId}`}
                key={b.bloque}
                onClick={() => toggleRundBloque(b.bloque)}
                style={{ 
                  border: 0, fontFamily: 'inherit', textAlign: 'left', flex: '1 0 auto',
                  padding: '16px 20px',
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
                    <EstIcon size={10} /> {b.bloque === 'CONTACTO' && ['Pendiente', 'Soporte faltante'].includes(b.estado) ? 'Sin soporte requerido' : est.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <RundDocumentManager
          key={tarjetaRund.docenteId}
          docenteId={tarjetaRund.docenteId}
          canManage={(canManageDocuments || canRegisterIncorporation && selectedRundBloque === 'VINCULACION') && !loadError}
          allowedSupportTypes={canRegisterIncorporation && !canManageDocuments ? [...RUND_INCORPORATION_SUPPORTS] : undefined}
          revision={documentRevision}
          activeBlock={selectedRundBloque}
          activeBlockLabel={CATALOGO_BR039[selectedRundBloque]?.label}
          evidenceOptions={groupRundEvidenceOptions(Object.entries(CATALOGO_BR039).flatMap(([block, config]) => config.campos
            .filter(field => canUploadRundField(block, field, tarjetaRund))
            .map(field => ({ block, type: field.tipoSoporte,
              label: field.tipoSoporte === 'convalidacion_men' ? `${field.campo} (si aplica)` : field.campo,
              fields: [{ label: field.campo, value: String(getDatoExtraido(block, field.campo, tarjetaRund) ?? '') }],
              hint: field.tipoSoporte === 'convalidacion_men'
                ? 'Solo para títulos obtenidos en el exterior. El perfil no informa el país de obtención; adjunta la convalidación del MEN únicamente si corresponde.'
                : field.tipoSoporte === 'autorizacion_habeas_data' ? 'Se acredita con el formato de tratamiento de datos firmado por el docente.' : undefined,
            }))))}
          onView={(url, name, label) => openDocViewer(url, name, label)}
          onChanged={fetchRundData}
        />

        {/* Content Pane: Selected Category Details */}
        {canRegisterIncorporation && tarjetaRund.proteccion_datos?.acceso_completo === true && selectedRundBloque === 'VINCULACION' && !loadError && <RundIncorporationPanel
          key={`incorporacion-${tarjetaRund.docenteId}`}
          docenteId={tarjetaRund.docenteId} block={rundBloques.find(block => block.bloque === 'VINCULACION')}
          fields={tarjetaRund.bloques?.VINCULACION?.campos || []}
          onSaved={async () => { await fetchRundData(); onUpdated?.(); }} />}

        <div role="tabpanel" id={`rund-panel-${tarjetaRund.docenteId}`} aria-labelledby={`rund-tab-${tarjetaRund.docenteId}-${selectedRundBloque}`} style={{ flex: 1, background: '#FAFBFC', position: 'relative' }}>
          {(() => {
            const b = sortedRundBloques.find(x => x.bloque === selectedRundBloque);
            if (!b) return null;
            const cfg = CATALOGO_BR039[b.bloque];
            const canApprove = b.estado !== 'Aprobado' && !loadError;
            const canReturn = canReturnRundBlock(b);
            const supportGroups = cfg.campos.filter((field, index, all) => field.tipoSoporte && all.findIndex(item => item.tipoSoporte === field.tipoSoporte) === index)
              .map(field => ({ field, fields: cfg.campos.filter(item => item.tipoSoporte === field.tipoSoporte),
                evidences: rundCheckpointEvidences(b.soportes || [], field.tipoSoporte).filter((support: any) => canReturnRundBlock({ bloque: b.bloque, soportes: [support] })) }));
            const dataDecisions:any[] = Object.values(b.revisionDatos||{});
            const dataReady = !!b.revisionDatos && dataDecisions.every(decision=>decision.estado!=='Rechazado'&&(!decision.requiereRevision||decision.estado==='Aprobado'&&decision.puedeValidar));
            const isDevolverOpen = devolverRundBloque === b.bloque;

            return (
              <div style={{ padding: 'clamp(12px, 2vw, 32px)', minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {cfg.label}
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B', marginTop: 4 }}>{cfg.subtitle}</p>
                </div>

                {b.bloque === 'IDENTIDAD' && <RundPhotoPanel docenteId={docenteId}
                  name={docente?.nombre_completo || ''} canUpload={hasRundPermission(auth, PHOTO_MANAGE)}
                  canValidate={hasRundPermission(auth, PHOTO_VALIDATE)} onChanged={onUpdated} />}

                {canReadExtraction && tarjetaRund.proteccion_datos?.acceso_completo === true && !loadError && (
                  <RundExtractionPanel key={tarjetaRund.docenteId} docenteId={tarjetaRund.docenteId} revision={documentRevision}
                    activeBlock={b.bloque} activeBlockLabel={cfg.label} activeBlockColor={cfg.color} canEdit={canEditRund} canAnalyze={canEditRund || canValidateRund}
                    onView={openDocViewer} onConfirmed={fetchRundData} />
                )}

                {b.estado === 'Aprobado' && (
                  <div style={{ padding: 16, marginBottom: 20, borderRadius: 12, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <CheckCircle size={24} /><div><strong>Espacio aprobado</strong><div style={{ fontSize: 12, marginTop: 4 }}>Información validada por el revisor{b.fecha_revision ? ` · ${new Date(b.fecha_revision).toLocaleString('es-CO')}` : ''}. Una nueva versión requerirá otra revisión.</div></div>
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

                {supportGroups.length > 0 && <section className="rund-support-review" role="region" aria-label="Selección y revisión de soportes">
                  <header><h5>1. Soportes que se tendrán en cuenta</h5>
                    <p>Revisa cada archivo una sola vez: admite los que respaldan el perfil y devuelve los que no correspondan con su motivo. Después valida cada dato de abajo; admitir el archivo no aprueba los datos ni el bloque.</p></header>
                  {supportGroups.map(group => {
                    const field = group.field;
                    const canUpload = group.fields.some(item => canUploadRundField(b.bloque, item, tarjetaRund));
                    const uploadField = group.fields.find(item => canUploadRundField(b.bloque, item, tarjetaRund)) || field;
                    return <article key={field.tipoSoporte} className="rund-support-review__group">
                      <p className="rund-support-review__covers">Respalda: {group.fields.map(item => item.campo).join(' · ')}</p>
                      {group.evidences.length ? <RundCheckpointEvidence field={field} evidences={group.evidences} reviewFields={group.fields} showTools
                        canManage={canManageSupport(field.tipoSoporte) && canUpload} canValidate={canValidateRund}
                        disabled={!!rundActionLoading || loadingRund || loadError} busy={rundActionLoading}
                        onView={(evidence, number) => openDocViewer(evidence.documento_carpeta_id || evidence.documentoCarpetaId || evidence.url || '',
                          group.evidences.length > 1 ? field.documento + ' · Evidencia ' + number : field.documento, field.campo, { support: evidence, block: b.bloque, field })}
                        onReview={(evidence, estado) => reviewEvidence(evidence, b.bloque, field, estado)}
                        onReplace={(evidence, file) => handleUploadFile(file, field.tipoSoporte, uploadField.campo, evidence)}
                        onAdd={file => handleUploadFile(file, field.tipoSoporte, uploadField.campo)} />
                      : <div className="rund-support-review__missing"><strong>{field.documento}</strong>
                        <span>{canUpload ? 'Sin soporte cargado' : 'Registra primero el dato del perfil cuando corresponda.'}</span>
                        {canManageSupport(field.tipoSoporte) && canUpload && <RundPdfPicker className="rund-checkpoint-upload" label={'Archivo de soporte para ' + uploadField.campo}
                          disabled={!!rundActionLoading || loadingRund || loadError} onFile={file => handleUploadFile(file, field.tipoSoporte, uploadField.campo)}>
                          <UploadCloud size={14} /> Adjuntar soporte
                        </RundPdfPicker>}
                      </div>}
                    </article>;
                  })}
                </section>}

                {/* Unified Validation List */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={18} color="#003DA5" /> Puntos de Control y Evidencia
                  </div>
                  <p style={{ margin: '-8px 0 16px', fontSize: 12, lineHeight: 1.5, color: '#64748B' }}>
                    {b.bloque === 'CONTACTO' ? 'Valida o devuelve cada dato de contacto, sin exigir documentos. Después confirma el bloque.' : 'Valida o devuelve cada dato según tu criterio de revisión. Puedes aprobar sin soportes adjuntos o admitidos; los archivos y el OCR son ayudas opcionales. Después confirma el bloque.'}
                  </p>

                  <div className="rund-checkpoint-grid">
                    {cfg.campos.map((c, idx) => {
                      // Only evidences with a current file are shown and reviewed.
                      const evidences = c.tipoSoporte ? rundCheckpointEvidences(b.soportes || [], c.tipoSoporte)
                        .filter((support: any) => canReturnRundBlock({ bloque: b.bloque, soportes: [support] })) : [];
                      const hasDoc = evidences.length > 0;
                      const dataDecision = b.revisionDatos?.[c.revisionId||c.tipoSoporte];
                      const dataState = dataDecision?.estado || 'Pendiente';
                      const admittedCount = evidences.filter((support: any) => rundEvidenceDecision(support, c).estado === 'Aprobado').length;
                      const isDerived = c.obligatorio === 'Derivado';
                      const rowHasData = canUploadRundField(b.bloque, c, tarjetaRund);
                      const datoExtraido = getDatoExtraido(b.bloque, c.campo, tarjetaRund);

                      return (
                        <div key={idx} className="rund-checkpoint-row" style={{
                          border: `1px solid ${dataState === 'Aprobado' ? '#A7F3D0' : dataState === 'Rechazado' ? '#FCA5A5' : !isDerived&&dataDecision?.requiereRevision ? '#FCD34D' : '#E2E8F0'}`,
                        }}>
                          {/* Col 1: Dato */}
                          <div className="rund-checkpoint-row__data">
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{c.campo}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: datoExtraido !== null ? '#0F172A' : '#64748B', overflowWrap: 'anywhere' }}>{datoExtraido ?? (c.tipoSoporte === 'autorizacion_habeas_data' ? 'Validación a criterio del revisor; soporte opcional' : c.tipoSoporte === 'convalidacion_men' ? 'Origen de los títulos no informado' : 'No registrado')}</div>
                            {c.tipoSoporte === 'convalidacion_men' && <p style={{ margin: '6px 0 0', fontSize: 11, lineHeight: 1.5, color: '#64748B' }}>El perfil no indica si los títulos se obtuvieron en Colombia o en otro país. Tener un título registrado no confirma que sea del exterior.</p>}
                            {hasDoc && !rowHasData && c.tipoSoporte !== 'convalidacion_men' && <p style={{ margin: '6px 0 0', fontSize: 11, lineHeight: 1.5, color: '#92400E' }}>Hay un soporte previo, pero falta registrar el dato del perfil. La revisión del archivo se conserva.</p>}
                          </div>

                          {/* Col 2: Soporte Documental */}
                          <div className="rund-checkpoint-row__evidence">
                            <span className="rund-checkpoint-reference">{!c.tipoSoporte ? c.documento : hasDoc
                              ? admittedCount + (admittedCount===1?' admitido de ':' admitidos de ') + evidences.length + (evidences.length===1?' soporte · ':' soportes · ') + c.documento
                              : 'Sin soporte adjunto · Puedes validar el dato con tu criterio.'}</span>
                            {hasDoc&&<details className="rund-data-sources"><summary>Consultar soportes de este dato ({evidences.length})</summary>
                              {evidences.map((evidence:any)=><div key={evidence.id}><span>{evidence.nombre_archivo||c.documento}</span>
                                <button type="button" onClick={()=>openDocViewer(evidence.documento_carpeta_id||evidence.url||'',evidence.nombre_archivo||c.documento,c.campo)}>Ver soporte</button></div>)}
                            </details>}
                          </div>

                          {/* Data decisions are separate from document admission. */}
                          <div className="rund-checkpoint-row__status" style={{background:'#F8FAFC'}}>
                            {isDerived?<span style={{fontSize:11,color:'#94A3B8'}}>Dato Automático</span>:<div className="rund-data-decision">
                              <strong data-state={dataState}>{dataState==='Aprobado'?'Dato validado':dataState==='Rechazado'?'Dato devuelto':dataDecision?.requiereRevision===false?'Sin dato para revisar':c.tipoSoporte&&!rowHasData?'Sin dato para soportar':'Pendiente de validar el dato'}</strong>
                              {dataDecision?.observacion&&<p>{dataDecision.observacion}</p>}
                              {dataDecision?.revisadoPorNombre&&<small>Revisado por {dataDecision.revisadoPorNombre}</small>}
                              {canValidateRund&&<div>
                                {dataState!=='Aprobado'&&<button type="button" data-variant="approve" disabled={!dataDecision?.puedeValidar||!!rundActionLoading||loadingRund||loadError}
                                  title={!dataDecision?.puedeValidar?'Registra el dato antes de validarlo. Los soportes son opcionales.':undefined}
                                  onClick={()=>reviewData(b.bloque,c,'Aprobado')}>Validar dato</button>}
                                <button type="button" data-variant="return" disabled={!dataDecision?.huella||!!rundActionLoading||loadingRund||loadError}
                                  onClick={()=>{setReturnData({block:b.bloque,field:c});setDataReason('');}}>Devolver dato</button>
                              </div>}
                            </div>}
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
                        <button onClick={handleDevolverRund} disabled={!canReturn || !devolverRundObs.trim() || !!rundActionLoading || loadingRund || loadError} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: canReturn && devolverRundObs.trim() ? '#DC2626' : '#FCA5A5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: canReturn && devolverRundObs.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>Confirmar devolución</button>
                        <button onClick={() => { setDevolverRundBloque(null); setDevolverRundObs(''); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="rund-validation-actions">
                      {b.estado === 'Aprobado' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, background: '#ECFDF5', color: '#059669', fontSize: 13, fontWeight: 700 }}>
                          <Lock size={16} /> Bloque Aprobado
                        </div>
                      )}
                      
                      {canApprove&&!dataReady&&<span style={{fontSize:12,color:'#92400E'}}>Valida cada dato pendiente y corrige los devueltos antes de aprobar el bloque.</span>}
                      {canApprove && (
                        <>
                          {canValidateRund && (
                            <button disabled={!canReturn || !!rundActionLoading || loadingRund || loadError} title={!canReturn ? 'Cargue un soporte de este bloque antes de devolverlo.' : undefined} onClick={() => { if (canReturn) setDevolverRundBloque(b.bloque); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 700, cursor: canReturn ? 'pointer' : 'not-allowed', opacity: canReturn ? 1 : 0.55, transition: 'all 0.2s' }}>
                              <ShieldAlert size={16} /> Devolver bloque
                            </button>
                          )}
                          {canValidateRund && (
                            <button onClick={() => handleAprobarRund(b.bloque)} disabled={!!rundActionLoading || loadingRund || !dataReady || loadError} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', fontSize: 13, fontWeight: 700, cursor: !!rundActionLoading || loadingRund || !dataReady || loadError ? 'not-allowed' : 'pointer', opacity: !!rundActionLoading || loadingRund || !dataReady ? 0.55 : 1, transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0, 61, 165, 0.3)' }}>
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
                 {viewingDoc.review ? 'La decisión cubre el documento completo y todos los datos que acredita.' : <>¿El documento cumple con los requisitos normativos para <strong style={{ color: '#0F172A' }}>{viewingDoc.campo}</strong>?</>}
               </div>
               <div style={{ display: 'flex', gap: 12 }}>
                 {viewerCanReview && (
                   <button disabled={!!rundActionLoading || loadingRund || loadError}
                     onClick={() => {
                       reviewEvidence(viewingDoc.review!.support, viewingDoc.review!.block, viewingDoc.review!.field, 'Rechazado');
                     }}
                     style={{ padding: '10px 20px', borderRadius: 8, background: 'white', border: '1px solid #EF4444', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                   >
                     <ShieldAlert size={16} /> Devolver documento
                   </button>
                 )}
                 {viewerCanReview && (
                   <button disabled={!!rundActionLoading || loadingRund || loadError}
                     onClick={() => {
                       reviewEvidence(viewingDoc.review!.support, viewingDoc.review!.block, viewingDoc.review!.field, 'Aprobado');
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
