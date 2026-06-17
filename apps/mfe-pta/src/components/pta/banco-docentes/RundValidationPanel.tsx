import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle, ShieldAlert, Lock, History, ChevronDown, ChevronRight,
  User, GraduationCap, Briefcase, Phone, BookOpen, CircleCheck, Eye,
  UploadCloud, FileText, FolderOpen, X, Edit2
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../../../shell/src/services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';

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
      { campo: 'Situación administrativa', documento: 'Acto administrativo (encargo, comisión, licencia)', tipoSoporte: 'acto_administrativo_situacion', obligatorio: 'Sí' },
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
      { campo: 'Investigación 2025', documento: 'Acto de convocatoria / certificación de producto', tipoSoporte: 'certificacion_investigacion', obligatorio: 'Si aplica', validacion: 'Coherente con dedicación' },
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
  NIVEL_FORMACION: 'Nivel de formación',
  TITULO_PREGRADO: 'Pregrado',
  TITULO_ESPECIALIZACION: 'Especialización',
  TITULO_MAESTRIA: 'Maestría',
  TITULO_DOCTORADO: 'Doctorado',
  TITULO_POSDOCTORADO: 'Posdoctorado',
  PERFIL_ACADEMICO: 'Perfil académico',
  TIPO_VINCULACION: 'Tipo de vinculación',
  DEDICACION: 'Dedicación',
  CATEGORIA_ESCALAFON: 'Categoría / escalafón',
  TERRITORIAL: 'Territorial',
  REGIMEN_NORMATIVO: 'Régimen normativo',
  ACTO_ADMINISTRATIVO: 'Acto administrativo',
  PUNTAJE_SALARIAL: 'Puntaje salarial',
  SITUACION_ADMINISTRATIVA: 'Situación administrativa',
  NUCLEO_TEMATICO: 'Núcleo temático',
  CORREO_INSTITUCIONAL: 'Correo institucional',
  CORREO_ALTERNATIVO: 'Correo alternativo',
  TELEFONO: 'Teléfono',
};

const OBLIG_BADGE: Record<string, { bg: string, text: string, label: string }> = {
  'Sí': { bg: '#FEF2F2', text: '#DC2626', label: 'Obligatorio' },
  'No': { bg: '#F1F5F9', text: '#64748B', label: 'Opcional' },
  'Si aplica': { bg: '#FFFBEB', text: '#D97706', label: 'Si Aplica' },
  'Derivado': { bg: '#F3F4F6', text: '#4B5563', label: 'Automático' }
};

const getDatoExtraido = (bloqueId: string, campoLabel: string, tarjetaRund: any) => {
  const campos = tarjetaRund?.bloques?.[bloqueId]?.campos || [];
  const lowerLabel = campoLabel.toLowerCase();
  
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
    return found ? found.valor : null;
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

export function RundValidationPanel({ docenteId, cleanPersonaId, docente }: { docenteId: string, cleanPersonaId?: string, docente?: any }) {
  const [tarjetaRund, setTarjetaRund] = useState<any | null>(null);
  const [rundBloques, setRundBloques] = useState<any[]>([]);
  const [rundAuditLog, setRundAuditLog] = useState<any[]>([]);
  const [loadingRund, setLoadingRund] = useState(false);
  const [selectedRundBloque, setSelectedRundBloque] = useState<string>('IDENTIDAD');
  const [showRundAudit, setShowRundAudit] = useState(false);
  const [rundActionLoading, setRundActionLoading] = useState<string | null>(null);
  const [devolverRundBloque, setDevolverRundBloque] = useState<string | null>(null);
  const [devolverRundObs, setDevolverRundObs] = useState('');
  const [docStatus, setDocStatus] = useState<Record<string, 'Aprobado' | 'Rechazado'>>({});
  const [mockUploadedDocs, setMockUploadedDocs] = useState<Record<string, string>>({});
  const [viewingDoc, setViewingDoc] = useState<{ url: string, nombre: string, campo: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const auth = useAuth();

  const currentUserId = useMemo(() => {
    if (typeof window === 'undefined') return 'admin-user';
    const token = sessionStorage.getItem('esap_auth_token');
    if (token) {
      try {
        const payloadPart = token.split('.')[1];
        if (payloadPart) {
          const payload = JSON.parse(atob(payloadPart));
          return payload.id || payload.sub || payload.userId || 'admin-user';
        }
      } catch (e) {}
    }
    return 'admin-user';
  }, []);

  const fetchRundData = useCallback(async () => {
    if (!docenteId && !cleanPersonaId) return;
    setLoadingRund(true);
    try {
      let dataId = docenteId;
      if (cleanPersonaId && !docenteId) {
        const res = await apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/by-persona/${cleanPersonaId}/tarjeta-rund`);
        dataId = res?.data?.docenteId || res?.docenteId;
        if (!dataId) return;
      }
      
      let tarjetaRes, bloquesRes, auditRes;
      try {
        tarjetaRes = await apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${dataId}/tarjeta-rund?_t=${Date.now()}`);
      } catch (e) {
        console.warn('No se pudo cargar tarjeta-rund:', e);
      }
      try {
        bloquesRes = await apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${dataId}/bloques?_t=${Date.now()}`);
      } catch (e) {
        console.warn('No se pudo cargar bloques:', e);
      }
      try {
        auditRes = await apiClient.get<any>(`/pta/api/v1/pta/banco-docentes/${dataId}/auditoria?_t=${Date.now()}`);
      } catch (e) {
        console.warn('No se pudo cargar auditoria:', e);
      }
      
      let tar = tarjetaRes?.data || tarjetaRes;
      let blq = Array.isArray(bloquesRes?.data || bloquesRes) ? (bloquesRes?.data || bloquesRes) : [];
      
      // Fallback a MOCK basado en el docente si no hay datos del backend
      if (!tar || blq.length === 0) {
        if (docente) {
          tar = tar || {
            idRund: `RUND-${docente.documento_identidad || '000'}`,
            docenteId: dataId,
            periodoCarga: '2025-2',
            semaforo: { porcentaje: 60 },
            bloques: {
              IDENTIDAD: {
                campos: [
                  { campo: 'DOCUMENTO_IDENTIDAD', valor: docente.documento_identidad },
                  { campo: 'TIPO_DOCUMENTO', valor: docente.tipo_documento },
                  { campo: 'NOMBRE_COMPLETO', valor: docente.nombre_completo },
                  { campo: 'GENERO', valor: docente.genero },
                  { campo: 'FECHA_NACIMIENTO', valor: docente.nacimiento ? new Date(docente.nacimiento).toLocaleDateString('es-CO') : null },
                ]
              },
              CONTACTO: {
                campos: [
                  { campo: 'CORREO_INSTITUCIONAL', valor: docente.correo_institucional },
                  { campo: 'CORREO_ALTERNATIVO', valor: docente.correo_personal },
                  { campo: 'TELEFONO', valor: docente.telefono },
                ]
              },
              FORMACION: {
                campos: [
                  { campo: 'NIVEL_FORMACION', valor: docente.nivel_formacion },
                  { campo: 'TITULO_PREGRADO', valor: docente.pregrado },
                  { campo: 'TITULO_ESPECIALIZACION', valor: docente.especializacion },
                  { campo: 'TITULO_MAESTRIA', valor: docente.maestria },
                  { campo: 'TITULO_DOCTORADO', valor: docente.doctorado },
                  { campo: 'PERFIL_ACADEMICO', valor: docente.perfil_academico },
                ]
              },
              VINCULACION: {
                campos: [
                  { campo: 'TIPO_VINCULACION', valor: docente.vinculacion },
                  { campo: 'DEDICACION', valor: docente.dedicacion },
                  { campo: 'CATEGORIA_ESCALAFON', valor: docente.categoria },
                  { campo: 'TERRITORIAL', valor: docente.territorial },
                  { campo: 'PUNTAJE_SALARIAL', valor: docente.puntaje_salarial },
                  { campo: 'SITUACION_ADMINISTRATIVA', valor: docente.situacion_administrativa },
                  { campo: 'ACTO_ADMINISTRATIVO', valor: docente.acto_administrativo_vinculacion },
                ]
              },
              ACADEMICO: {
                campos: [
                  { campo: 'NUCLEO_TEMATICO', valor: docente.nucleo_tematico },
                ]
              }
            }
          };
          if (blq.length === 0) {
            blq = [
              { bloque: 'IDENTIDAD', estado: 'Pendiente' },
              { bloque: 'CONTACTO', estado: 'En revisión' },
              { bloque: 'FORMACION', estado: 'Soporte faltante' },
              { bloque: 'VINCULACION', estado: 'Pendiente' },
              { bloque: 'ACADEMICO', estado: 'Pendiente' },
              { bloque: 'TRANSVERSAL', estado: 'Pendiente' }
            ];
          }
        }
      }

      setTarjetaRund(tar);
      setRundBloques(blq);
      setRundAuditLog(Array.isArray(auditRes?.data || auditRes) ? (auditRes?.data || auditRes) : []);

      // Inicializar el estado de validación granular
      if (tar?.validacionDocumental && Array.isArray(tar.validacionDocumental)) {
        const initDocStatus: Record<string, 'Aprobado' | 'Rechazado'> = {};
        const initMockUploadedDocs: Record<string, string> = {};

        tar.validacionDocumental.forEach((val: any) => {
          if (val.estado_documento === 'Aceptado' || val.estado_documento === 'Aprobado') {
            initDocStatus[val.campo_rund] = 'Aprobado';
          } else if (val.estado_documento === 'Rechazado') {
            initDocStatus[val.campo_rund] = 'Rechazado';
          }
          if (val.id_documento_carpeta && val.id_documento_carpeta.startsWith('/pta')) {
            initMockUploadedDocs[val.campo_rund] = val.id_documento_carpeta;
          }
        });
        setDocStatus(initDocStatus);
        setMockUploadedDocs(initMockUploadedDocs);
      }
    } catch (err) {
      console.error(err);
      
      // Mismo fallback en caso de error de red
      if (docente) {
        setTarjetaRund({
          idRund: `RUND-${docente.documento_identidad || '000'}`,
          docenteId: docenteId,
          periodoCarga: '2025-2',
          semaforo: { porcentaje: 60 },
          bloques: {
            IDENTIDAD: {
              campos: [
                { campo: 'DOCUMENTO_IDENTIDAD', valor: docente.documento_identidad },
                { campo: 'TIPO_DOCUMENTO', valor: docente.tipo_documento },
                { campo: 'NOMBRE_COMPLETO', valor: docente.nombre_completo },
                { campo: 'GENERO', valor: docente.genero },
                { campo: 'FECHA_NACIMIENTO', valor: docente.nacimiento ? new Date(docente.nacimiento).toLocaleDateString('es-CO') : null },
              ]
            },
            CONTACTO: {
              campos: [
                { campo: 'CORREO_INSTITUCIONAL', valor: docente.correo_institucional },
                { campo: 'CORREO_ALTERNATIVO', valor: docente.correo_personal },
                { campo: 'TELEFONO', valor: docente.telefono },
              ]
            },
            FORMACION: {
              campos: [
                { campo: 'NIVEL_FORMACION', valor: docente.nivel_formacion },
                { campo: 'TITULO_PREGRADO', valor: docente.pregrado },
                { campo: 'TITULO_ESPECIALIZACION', valor: docente.especializacion },
                { campo: 'TITULO_MAESTRIA', valor: docente.maestria },
                { campo: 'TITULO_DOCTORADO', valor: docente.doctorado },
                { campo: 'PERFIL_ACADEMICO', valor: docente.perfil_academico },
              ]
            },
            VINCULACION: {
              campos: [
                { campo: 'TIPO_VINCULACION', valor: docente.vinculacion },
                { campo: 'DEDICACION', valor: docente.dedicacion },
                { campo: 'CATEGORIA_ESCALAFON', valor: docente.categoria },
                { campo: 'TERRITORIAL', valor: docente.territorial },
                { campo: 'PUNTAJE_SALARIAL', valor: docente.puntaje_salarial },
                { campo: 'SITUACION_ADMINISTRATIVA', valor: docente.situacion_administrativa },
                { campo: 'ACTO_ADMINISTRATIVO', valor: docente.acto_administrativo_vinculacion },
              ]
            },
            ACADEMICO: {
              campos: [
                { campo: 'NUCLEO_TEMATICO', valor: docente.nucleo_tematico },
              ]
            }
          }
        });
        setRundBloques([
          { bloque: 'IDENTIDAD', estado: 'Pendiente' },
          { bloque: 'CONTACTO', estado: 'En revisión' },
          { bloque: 'FORMACION', estado: 'Soporte faltante' },
          { bloque: 'VINCULACION', estado: 'Pendiente' },
          { bloque: 'ACADEMICO', estado: 'Pendiente' },
          { bloque: 'TRANSVERSAL', estado: 'Pendiente' }
        ]);
      }
      
    } finally {
      setLoadingRund(false);
    }
  }, [docenteId, cleanPersonaId, docente]);

  useEffect(() => {
    fetchRundData();
  }, [fetchRundData]);

  const toggleRundBloque = (bloque: string) => {
    setSelectedRundBloque(bloque);
  };

  const handleUploadFile = async (file: File, tipoSoporte: string, campo: string) => {
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
      formData.append('cargadoPor', currentUserId);
      formData.append('file', file);

      // CORRECTO: usar apiClient.upload (multipart/form-data) en vez de apiClient.post (JSON)
      const res = await apiClient.upload<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${selectedRundBloque}/soportes`, formData);

      // apiClient.upload unwraps { success: true, data: {id, bloque, tipoSoporte} } → returns {id, bloque, tipoSoporte}
      // We verify success by checking for the returned id (UUID from RundSoporteCampo insert),
      // or fallback to a truthy res that isn't an error object.
      const isSuccess = !!(res?.id || (res && !res.error && res !== false));
      if (isSuccess) {
        toast.success(`Documento "${file.name}" cargado exitosamente en RUND.`);
        const docenteNombreClean = nombreCompleto.replace(/[^a-zA-Z0-9 -]/g, '').trim().toUpperCase();
        const urlStr = res?.url || res?.documentoCarpetaId || `/pta/api/v1/uploads/carpeta-digital/${docenteNombreClean}/RUND/${file.name}`;
        
        // Actualizar estado local de visualización inmediata
        setMockUploadedDocs(prev => {
          const next = { ...prev };
          const bloqueCfg = CATALOGO_BR039[selectedRundBloque];
          if (bloqueCfg) {
            bloqueCfg.campos.forEach(c => {
              if (c.tipoSoporte === tipoSoporte) {
                next[c.campo] = urlStr;
              }
            });
          }
          return next;
        });
        
        setDocStatus(prev => {
          const next = { ...prev };
          const bloqueCfg = CATALOGO_BR039[selectedRundBloque];
          if (bloqueCfg) {
            bloqueCfg.campos.forEach(c => {
              if (c.tipoSoporte === tipoSoporte) {
                delete next[c.campo];
              }
            });
          }
          return next;
        });

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
    if (!tarjetaRund?.docenteId) return;
    setRundActionLoading(bloque);
    try {
      // 1. Guardar Validaciones Granulares en DB (UPSERT)
      // Construir la lista completa de validaciones incluyendo referencias a archivos reales.
      // Fuentes de id_documento_carpeta (en orden de prioridad):
      //   a) soportes ya guardados en DB (vienen de rundBloques)
      //   b) mockUploadedDocs (estado UI optimista para uploads recientes aún no recargados)
      const bloqueActual = rundBloques.find((b: any) => b.bloque === bloque);
      const soportesEnDB: Record<string, any> = {};
      if (bloqueActual?.soportes) {
        bloqueActual.soportes.forEach((s: any) => {
          if (s.tipo_soporte && (s.documento_carpeta_id || s.nombre_archivo)) {
            soportesEnDB[s.tipo_soporte.toUpperCase()] = s;
          }
        });
      }

      const validaciones = Object.entries(docStatus).map(([campoRund, estadoDocumento]) => {
        const campoUp = campoRund.toUpperCase();
        // Prioridad: URL de la DB > URL local (optimista)
        const soporteDB = soportesEnDB[campoUp];
        const idDocumentoCarpeta = soporteDB?.documento_carpeta_id
          || (mockUploadedDocs[campoRund]?.startsWith('/pta') ? mockUploadedDocs[campoRund] : undefined);
        return {
          campoRund: campoUp,
          estadoDocumento: estadoDocumento === 'Aprobado' ? 'Aceptado' : estadoDocumento,
          idDocumentoCarpeta: idDocumentoCarpeta || null,
          nombreArchivo: soporteDB?.nombre_archivo || null,
          tipoDocumentoSoporte: bloque,
        };
      });

      if (validaciones.length > 0) {
        await apiClient.post(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/validacion-documental/batch`, {
          validaciones,
          validadoPor: currentUserId
        });
      }

      // 2. Aprobar el Bloque en General
      const res = await apiClient.post<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${bloque}/aprobar`, {
        aprobadorId: currentUserId,
      });

      if (res?.success || res) {
        toast.success(`Validaciones y bloque ${bloque} guardados correctamente.`);
        await fetchRundData();
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
    if (!devolverRundBloque || !devolverRundObs.trim() || !tarjetaRund?.docenteId) return;
    setRundActionLoading(devolverRundBloque);
    try {
      const res = await apiClient.post<any>(`/pta/api/v1/pta/banco-docentes/${tarjetaRund.docenteId}/bloques/${devolverRundBloque}/devolver`, {
        aprobadorId: currentUserId,
        observacion: devolverRundObs,
      });
      if (res?.success || res) {
        toast.success(`Bloque ${devolverRundBloque} devuelto.`);
        setDevolverRundBloque(null);
        setDevolverRundObs('');
        await fetchRundData();
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
    soportes?.find((s: any) => s.tipo_soporte === tipo || s.tipo === tipo);

  const sortedRundBloques = useMemo(() => {
    const blockOrder = ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'];
    return [...rundBloques].sort((a, b) => {
      return blockOrder.indexOf(a.bloque) - blockOrder.indexOf(b.bloque);
    });
  }, [rundBloques]);

  if (loadingRund && !tarjetaRund) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>Cargando datos de RUND...</div>;
  }

  if (!tarjetaRund) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>No se encontraron datos RUND para este docente.</div>;
  }

  return (
    <div style={{ background: '#FAFBFC', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      
      {/* Header Info */}
      <div style={{ padding: '20px 24px', background: 'linear-gradient(to right, #ffffff, #F8FAFC)', borderBottom: '1px solid #E5E7EB', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield style={{ color: '#003DA5' }} size={20} />
            Validación Integral RUND
            {auth.hasPermission('banco-docentes.rund.edit') && (
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
            ID RUND: <span style={{ color: '#0F172A' }}>{tarjetaRund.idRund}</span> · Periodo: <span style={{ color: '#0F172A' }}>{tarjetaRund.periodoCarga || '2025-2'}</span>
          </p>
        </div>
        <div style={{ textAlign: 'right', minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Completitud Global</div>
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
                  borderBottom: `3px solid ${isSelected ? cfg.color : 'transparent'}`,
                  background: isSelected ? '#FAFBFC' : 'transparent',
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
                  background: isSelected ? `linear-gradient(135deg, ${cfg.color}, ${cfg.color}DD)` : '#F1F5F9', 
                  color: isSelected ? 'white' : '#64748B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '0.8rem', fontWeight: 800,
                  boxShadow: isSelected ? `0 4px 10px ${cfg.color}40` : 'none'
                }}>
                  {cfg.letra}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#0F172A' : '#475569' }}>{cfg.label}</div>
                  <div style={{ fontSize: '0.65rem', color: isSelected ? cfg.color : '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
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
            const canApprove = b.estado !== 'Aprobado';
            const isDevolverOpen = devolverRundBloque === b.bloque;

            return (
              <div style={{ padding: 32, display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {cfg.label}
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B', marginTop: 4 }}>{cfg.subtitle}</p>
                </div>

                {b.observacion && (
                  <div style={{ padding: '12px 16px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA', fontSize: '0.8rem', color: '#991B1B', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <ShieldAlert size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <strong style={{ display: 'block', marginBottom: 2 }}>Observación de Devolución:</strong> 
                      {b.observacion}
                    </div>
                  </div>
                )}

                {/* Unified Validation List */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={18} color="#003DA5" /> Puntos de Control y Evidencia
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {cfg.campos.map((c, idx) => {
                      const soporte = c.tipoSoporte ? findRundSoporte(b.soportes || [], c.tipoSoporte) : null;
                      if (c.campo === 'Tipo y número de documento') console.log('DEBUG RUND:', { field: c.campo, tipo: c.tipoSoporte, bSoportes: b.soportes, found: soporte });
                      const localDocUrl = c.tipoSoporte ? mockUploadedDocs[c.campo] : null;
                      const hasDoc = !!soporte || !!localDocUrl;
                      const activeUrl = localDocUrl || soporte?.url || 'mock';
                      const isRequired = c.obligatorio === 'Sí';
                      const isDerived = c.obligatorio === 'Derivado';
                      const datoExtraido = getDatoExtraido(b.bloque, c.campo, tarjetaRund);

                      return (
                        <div key={idx} style={{ 
                          background: 'white', 
                          borderRadius: 12, 
                          border: `1px solid ${hasDoc ? '#10B981' : isRequired && c.tipoSoporte ? '#FCA5A5' : '#E2E8F0'}`, 
                          display: 'flex',
                          overflow: 'hidden',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}>
                          {/* Col 1: Dato */}
                          <div style={{ width: '30%', padding: '16px 20px', borderRight: '1px solid #F1F5F9', background: '#FAFBFC' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{c.campo}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: datoExtraido ? '#0F172A' : '#94A3B8' }}>{datoExtraido || 'No registrado / Auto'}</div>
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
                                  </div>
                                  {cfg.campos.findIndex(x => x.tipoSoporte === c.tipoSoporte) === idx && (
                                    <>
                                      <button 
                                        onClick={() => setViewingDoc({ url: activeUrl, nombre: c.documento, campo: c.campo })}
                                        style={{ padding: '6px 12px', borderRadius: 6, background: '#EFF6FF', border: 'none', color: '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                                      >
                                        <Eye size={14}/> Ver
                                      </button>
                                      <button
                                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        title="Modificar documento"
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
                                  </div>
                                  <label style={{ padding: '6px 12px', borderRadius: 6, background: rundActionLoading === `subir-${c.campo}` ? '#E2E8F0' : 'white', border: '1px solid #CBD5E1', color: '#475569', fontSize: 11, fontWeight: 600, cursor: rundActionLoading === `subir-${c.campo}` ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', opacity: rundActionLoading === `subir-${c.campo}` ? 0.7 : 1 }}>
                                    <input 
                                      type="file" 
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
                                  </label>
                               </div>
                            )}
                          </div>

                          {/* Col 3: Estado / Acción individual */}
                          <div style={{ width: '30%', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, background: hasDoc ? '#F8FAFC' : 'transparent' }}>
                            {isDerived ? (
                               <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>Dato Automático</span>
                            ) : hasDoc ? (
                               docStatus[c.campo] === 'Aprobado' ? (
                                 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 800, background: '#10B981', color: 'white' }}><CheckCircle size={14}/> Aprobado</span>
                               ) : docStatus[c.campo] === 'Rechazado' ? (
                                 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 800, background: '#FEF2F2', color: '#DC2626' }}><ShieldAlert size={14}/> Rechazado</span>
                               ) : (
                                 <div style={{ display: 'flex', gap: 8 }}>
                                    {auth.hasPermission('banco-docentes.rund.validate') && (
                                      <button 
                                        onClick={() => setDocStatus(prev => ({ ...prev, [c.campo]: 'Aprobado' }))}
                                        style={{ padding: '6px 12px', borderRadius: 6, background: 'white', border: '1px solid #10B981', color: '#10B981', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}
                                      >
                                        <CheckCircle size={14} /> Aprobar
                                      </button>
                                    )}
                                    {auth.hasPermission('banco-docentes.rund.validate') && (
                                      <button 
                                        onClick={() => setDocStatus(prev => ({ ...prev, [c.campo]: 'Rechazado' }))}
                                        style={{ padding: '6px 12px', borderRadius: 6, background: 'white', border: '1px solid #EF4444', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}
                                      >
                                        <ShieldAlert size={14} /> Rechazar
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
                      
                      {canApprove && (
                        <>
                          {auth.hasPermission('banco-docentes.rund.validate') && (
                            <button onClick={() => setDevolverRundBloque(b.bloque)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                              <ShieldAlert size={16} /> Devolver
                            </button>
                          )}
                          {auth.hasPermission('banco-docentes.rund.validate') && (
                            <button onClick={() => handleAprobarRund(b.bloque)} disabled={rundActionLoading === b.bloque} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0, 61, 165, 0.3)' }}>
                              <CheckCircle size={16} /> Guardar Validaciones
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
               {viewingDoc.url !== 'mock' ? (
                 <iframe 
                   src={viewingDoc.url} 
                   style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12, background: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                   title="Document Viewer"
                 />
               ) : (
                 <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                   <img 
                     src={`https://placehold.co/600x800/FFFFFF/0F172A?text=Vista+Previa+del+Documento%5Cn%5Cn${encodeURIComponent(viewingDoc.nombre)}`}
                     alt="Documento"
                     style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', objectFit: 'contain' }}
                   />
                 </div>
               )}
            </div>

            {/* Modal Footer (Action Buttons) */}
            <div style={{ padding: '20px 24px', background: 'white', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                 ¿El documento cumple con los requisitos normativos para <strong style={{ color: '#0F172A' }}>{viewingDoc.campo}</strong>?
               </div>
               <div style={{ display: 'flex', gap: 12 }}>
                 {auth.hasPermission('banco-docentes.rund.validate') && (
                   <button 
                     onClick={() => {
                       setDocStatus(prev => ({ ...prev, [viewingDoc.campo]: 'Rechazado' }));
                       setViewingDoc(null);
                     }}
                     style={{ padding: '10px 20px', borderRadius: 8, background: 'white', border: '1px solid #EF4444', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                   >
                     <ShieldAlert size={16} /> Rechazar Documento
                   </button>
                 )}
                 {auth.hasPermission('banco-docentes.rund.validate') && (
                   <button 
                     onClick={() => {
                       setDocStatus(prev => ({ ...prev, [viewingDoc.campo]: 'Aprobado' }));
                       setViewingDoc(null);
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
          }}
        />
      )}
    </div>
  );
}
