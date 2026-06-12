/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  WIZARD NUEVA DEMANDA JUDICIAL - WORLD CLASS ENTERPRISE     ║
 * ║  Gestión Legal - Defensa Judicial - ESAP                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * ✅ VERSIÓN APROBADA 9 DE FEBRERO 2026
 * ✅ DISEÑO BASADO EN MODAL DE COMUNICACIONES DEL PROCESO
 * 
 * 🏆 WORLD CLASS FEATURES:
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Cards por sección con íconos descriptivos
 * ✅ ModalHeaderClean con badges de estado
 * ✅ Validaciones en tiempo real
 * ✅ 35 puntos de verificación
 * 
 * WIZARD DE 7 PASOS:
 * 1. Datos del Proceso Judicial
 * 2. Datos Demandante(s)
 * 3. Datos Demandado(s)
 * 4. Datos de Otros Actores
 * 5. Juzgado y Ubicación
 * 6. Fechas y Asignación
 * 7. Detalles del Proceso
 */

import { useState, useEffect, useMemo, useRef } from 'react';
// @ts-ignore
import { toast } from 'sonner';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { estructuraService } from '../../../../services/api/estructura.service';
import { legalService } from '../../../../services/api/legal.service';
import { authService } from '../../../../services/api/authService';
import {
  Scale, FileText, Users, Building2, User, MapPin, Calendar,
  ChevronRight, ChevronLeft, Plus, Trash2, Check, AlertCircle,
  DollarSign, Clock, Star, Info, Sparkles, Save, X, CheckCircle,
  Zap, Upload, Download
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { ModalHeaderClean } from './ModalHeaderClean';
import type { ExpedienteJudicial, ParteProcesal } from '../core/types';

// ==================== INTERFACES ====================

interface Apoderado {
  nombreCompleto: string;
  cedula: string;
  celular: string;
  correo: string;
}

interface Demandante {
  id: string;
  tipoPersona: 'Natural' | 'Juridica';
  cedula: string;
  nombreCompleto: string;
  telefono: string;
  correo: string;
  direccion: string;
  tieneApoderado: boolean;
  apoderado?: Apoderado;
}

interface Demandado {
  id: string;
  tipoPersona: 'Natural' | 'Juridica';
  cedula: string;
  nombreCompleto: string;
  cargoFuncion?: string;
  telefono: string;
  correo: string;
  direccion: string;
  tieneApoderado: boolean;
  apoderado?: Apoderado;
}

interface OtroActor {
  id: string;
  tipoPersona: 'Natural' | 'Juridica';
  cedula: string;
  nombreCompleto: string;
  rol: string;
  telefono: string;
  correo: string;
  direccion: string;
  tieneApoderado: boolean;
  apoderado?: Apoderado;
}

export interface NuevaDemandaData {
  numeroRadicado: string;
  medioControl: string;
  tipoProcesoJudicial: string;
  etapaProcesal: string;
  cuantia: number;
  nivelRiesgo: string;
  provisionContable: number;
  fechaEstimacionProvision: string;
  observacionesProvision: string;
  demandantes: Demandante[];
  demandados: Demandado[];
  otrosActores: OtroActor[];
  juzgadoTribunal: string;
  departamento: string;
  ciudad: string;
  territorial: string;
  cetap: string;
  dependencia: string;
  tipoPlazo: 'Dias Habiles' | 'Dias Calendario' | 'Horas';
  termino: number;
  fechaNotificacion: string;
  fechaVencimiento: string;
  abogadoResponsable: string;
  pretensiones: string;
  hechos: string;
  observaciones: string;
  esDelitoAdminPublica: boolean;
  esConductaPatrimonioPublico: boolean;
  esOtroDelitoPenal: boolean;
  otroDelitoPenalDescripcion: string;
  camposAdicionales?: Record<string, any>;
}

interface ModalNuevaDemandaRESTAURADOProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NuevaDemandaData, isEdit?: boolean, originalId?: string) => void;
  expedienteEdit?: ExpedienteJudicial;
  tableroSeleccionado?: string;
}

// ==================== DATOS PARAMETRIZABLES ====================
// MEDIOS_CONTROL, TIPOS_PROCESO y ETAPAS_PROCESALES ahora se obtienen
// dinámicamente desde el submodulo de configuración via useConfiguracionModulo


// Departamentos y ciudades se cargan dinámicamente desde auth.geopolitica

// ==================== HELPERS DE VALIDACIÓN ====================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const soloDigitos = (v: string) => v.replace(/[^0-9]/g, '');
const soloLetrasEspacios = (v: string) => v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
const nitFormato = (v: string) => v.replace(/[^0-9.\-]/g, '');

/**
 * Formatea una fecha local (datetime-local YYYY-MM-DDTHH:mm o ISO) al formato visual: DD/MM/YYYY hh:mm a. m. / p. m.
 */
function formatFechaLocal(fechaStr: string): string {
  if (!fechaStr) return '';
  try {
    const normalizada = fechaStr.includes('T') ? fechaStr : fechaStr.replace(' ', 'T');
    const fecha = new Date(normalizada);
    if (isNaN(fecha.getTime())) return fechaStr;
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const dia = pad(fecha.getDate());
    const mes = pad(fecha.getMonth() + 1);
    const anio = fecha.getFullYear();
    
    let horas = fecha.getHours();
    const minutos = pad(fecha.getMinutes());
    const ampm = horas >= 12 ? 'p. m.' : 'a. m.';
    horas = horas % 12;
    horas = horas ? horas : 12;
    
    return `${dia}/${mes}/${anio} ${pad(horas)}:${minutos} ${ampm}`;
  } catch (e) {
    return fechaStr;
  }
}

// ==================== FUNCIONES DE CÁLCULO ====================

/**
 * Verifica si un día es hábil (lunes a viernes).
 */
function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay();
  return dia !== 0 && dia !== 6; // 0=dom, 6=sáb
}

/**
 * Avanza a la próxima fecha hábil si cae en fin de semana.
 */
function siguienteDiaHabil(fecha: Date): Date {
  const f = new Date(fecha);
  while (!esDiaHabil(f)) {
    f.setDate(f.getDate() + 1);
  }
  return f;
}

/**
 * Normaliza una fecha al horario hábil (8:00 AM - 5:00 PM, lun-vie).
 * - Si cae en fin de semana → próximo lunes a las 8:00 AM
 * - Si es antes de las 8:00 AM → mismo día a las 8:00 AM (si es hábil)
 * - Si es después de las 5:00 PM → próximo día hábil a las 8:00 AM
 * - Si está dentro de horario → se deja tal cual
 */
function normalizarAHorarioHabil(fechaStr: string): string {
  if (!fechaStr) return '';
  let fecha = new Date(fechaStr);

  // 1. Si cae en fin de semana, mover al lunes
  if (!esDiaHabil(fecha)) {
    fecha = siguienteDiaHabil(fecha);
    fecha.setHours(8, 0, 0, 0);
    return toLocalISO(fecha);
  }

  const hora = fecha.getHours();
  const minutos = fecha.getMinutes();
  const totalMinutos = hora * 60 + minutos;

  // 2. Antes de las 8:00 AM → mismo día a las 8 AM
  if (totalMinutos < 480) { // 8*60 = 480
    fecha.setHours(8, 0, 0, 0);
    return toLocalISO(fecha);
  }

  // 3. Después de las 5:00 PM → siguiente día hábil a las 8 AM
  if (totalMinutos >= 1020) { // 17*60 = 1020
    fecha.setDate(fecha.getDate() + 1);
    fecha = siguienteDiaHabil(fecha);
    fecha.setHours(8, 0, 0, 0);
    return toLocalISO(fecha);
  }

  // 4. Dentro de horario hábil, se deja tal cual
  return toLocalISO(fecha);
}

/** Formatea Date a string compatible con datetime-local (YYYY-MM-DDTHH:mm) en hora local */
function toLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Calcula la fecha de vencimiento a partir de la fecha de notificación.
 * - Días Hábiles: cuenta sólo lun-vie, vence a las 5:00 PM del último día hábil.
 * - Días Calendario: cuenta todos los días, vence a las 5:00 PM.
 */
function calcularFechaVencimiento(
  fechaNotificacion: string,
  termino: number,
  tipoPlazo: 'Dias Habiles' | 'Dias Calendario',
  horaEspecial?: string,
  unidadTermino: 'dias' | 'horas' = 'dias'
): string {
  if (!fechaNotificacion || !termino) return '';

  const fecha = new Date(fechaNotificacion);

  if (unidadTermino === 'horas') {
    fecha.setHours(fecha.getHours() + termino);
    return toLocalISO(fecha);
  }
  
  // Parsear hora especial (ej: "14:30") o usar 17:00 por defecto
  let horas = 17;
  let minutos = 0;
  if (horaEspecial && horaEspecial.includes(':')) {
    const parts = horaEspecial.split(':');
    horas = parseInt(parts[0], 10) || 17;
    minutos = parseInt(parts[1], 10) || 0;
  }

  if (tipoPlazo === 'Dias Calendario') {
    fecha.setDate(fecha.getDate() + termino);
    fecha.setHours(horas, minutos, 0, 0);
  } else {
    // Días Hábiles: contar solo lun-vie (el día de notificación cuenta como día 1)
    let diasAgregados = 1;
    while (diasAgregados < termino) {
      fecha.setDate(fecha.getDate() + 1);
      if (esDiaHabil(fecha)) {
        diasAgregados++;
      }
    }
    fecha.setHours(horas, minutos, 0, 0);
  }

  return toLocalISO(fecha);
}

// ==================== COMPONENTE PRINCIPAL ====================

export function ModalNuevaDemandaRESTAURADO({ isOpen, onClose, onSave, expedienteEdit, tableroSeleccionado }: ModalNuevaDemandaRESTAURADOProps) {
  // Obtener datos dinámicos del submódulo de configuración
  const { mediosControlActivos, tiposProcesosActivos: allTiposProcesos, estadosActivos, dependenciasActivas } = useConfiguracionModulo('defensa-judicial');

  // Filtrar tipos de procesos activos según los roles del usuario (o si no tiene rol asociado)
  const tiposProcesosActivos = useMemo(() => {
    return (allTiposProcesos || []).filter((tp: any) => {
      if (!tp.rolAsociado) return true;
      return authService.hasRole(tp.rolAsociado) || authService.isSuperAdmin();
    });
  }, [allTiposProcesos]);

  const [pasoActual, setPasoActual] = useState(1);
  const totalPasos = 7;
  const lastTipoProcesoRef = useRef<string>('');

  const [formData, setFormData] = useState<NuevaDemandaData>({
    numeroRadicado: '',
    medioControl: '',
    tipoProcesoJudicial: '',
    etapaProcesal: '',
    cuantia: 0,
    nivelRiesgo: '',
    provisionContable: 0,
    fechaEstimacionProvision: '',
    observacionesProvision: '',
    demandantes: [],
    demandados: [],
    otrosActores: [],
    juzgadoTribunal: '',
    departamento: '',
    ciudad: '',
    territorial: '',
    cetap: '',
    dependencia: '',
    tipoPlazo: 'Dias Habiles',
    termino: 30,
    fechaNotificacion: '',
    fechaVencimiento: '',
    abogadoResponsable: '',
    pretensiones: '',
    hechos: '',
    observaciones: '',
    esDelitoAdminPublica: false,
    esConductaPatrimonioPublico: false,
    esOtroDelitoPenal: false,
    otroDelitoPenalDescripcion: '',
    camposAdicionales: {}
  });

  const activeTipoProceso = tiposProcesosActivos.find(tp => tp.nombre === formData.tipoProcesoJudicial);
  const etapasDelProceso = (activeTipoProceso?.estados && activeTipoProceso.estados.length > 0)
    ? activeTipoProceso.estados.filter((e: any) => e.activo).sort((a: any, b: any) => a.orden - b.orden)
    : estadosActivos;

  const isFieldVisible = (fieldName: string, defaultVisible: boolean): boolean => {
    if (activeTipoProceso && activeTipoProceso.camposVisibles) {
      const configured = activeTipoProceso.camposVisibles[fieldName];
      if (configured !== undefined) return configured;
    }
    return defaultVisible;
  };

  const isFieldRequired = (fieldName: string, defaultRequired: boolean): boolean => {
    if (!isFieldVisible(fieldName, true)) return false;

    if (activeTipoProceso && activeTipoProceso.camposObligatorios) {
      const configured = activeTipoProceso.camposObligatorios[fieldName];
      if (configured !== undefined) return configured;
    }
    return defaultRequired;
  };

  const renderCamposAdicionales = (stepNum: number) => {
    if (!activeTipoProceso?.camposAdicionalesConfig) return null;
    const campos = activeTipoProceso.camposAdicionalesConfig.filter(c => (c.paso || 1) === stepNum);
    if (campos.length === 0) return null;

    return (
      <Card className="p-4 sm:p-6 border border-blue-100 bg-gradient-to-br from-blue-50/20 to-white shadow-sm mt-6">
        <div className="flex items-center gap-2 mb-4 border-b border-blue-50 pb-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900">Información Específica del Proceso</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campos.map((c) => {
            const fieldId = c.id;
            const currentVal = formData.camposAdicionales?.[fieldId] ?? '';

            const handleValueChange = (val: any) => {
              setFormData(prev => ({
                ...prev,
                camposAdicionales: {
                  ...(prev.camposAdicionales || {}),
                  [fieldId]: val
                }
              }));
            };

            return (
              <div key={fieldId} className={`space-y-2 ${c.tipo === 'opciones-multiple' ? 'md:col-span-2' : ''}`}>
                <Label htmlFor={fieldId} className={`text-sm font-bold flex items-center ${erroresCampos[fieldId] ? 'text-red-600' : 'text-gray-700'}`}>
                  {c.nombre}
                  {c.obligatorio && <span className="text-red-500 ml-1">*</span>}
                </Label>

                {(c.tipo === 'texto' || c.tipo === 'alfanumerico' || c.tipo === 'unico') && (
                  <div className="space-y-1 w-full">
                    <Input
                      id={fieldId}
                      type="text"
                      placeholder={`Ingrese ${c.nombre.toLowerCase()}...`}
                      value={currentVal}
                      onChange={(e) => {
                        handleValueChange(e.target.value);
                        if (erroresCampos[fieldId]) {
                          setErroresCampos(prev => {
                            const copy = { ...prev };
                            delete copy[fieldId];
                            return copy;
                          });
                        }
                      }}
                      className={`bg-white ${erroresCampos[fieldId] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {erroresCampos[fieldId] && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {erroresCampos[fieldId]}
                      </p>
                    )}
                    {c.tipo === 'alfanumerico' && !erroresCampos[fieldId] && (
                      <p className="text-[10px] text-gray-400 font-medium ml-1">Solo se permiten letras y números.</p>
                    )}
                    {c.tipo === 'unico' && !erroresCampos[fieldId] && (
                      <p className="text-[10px] text-gray-400 font-medium ml-1">Este valor debe ser único en el sistema.</p>
                    )}
                  </div>
                )}

                {c.tipo === 'numero' && (
                  <div className="space-y-1 w-full">
                    <Input
                      id={fieldId}
                      type="number"
                      placeholder="0"
                      value={currentVal}
                      onChange={(e) => {
                        handleValueChange(e.target.value === '' ? '' : Number(e.target.value));
                        if (erroresCampos[fieldId]) {
                          setErroresCampos(prev => {
                            const copy = { ...prev };
                            delete copy[fieldId];
                            return copy;
                          });
                        }
                      }}
                      className={`bg-white ${erroresCampos[fieldId] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {erroresCampos[fieldId] && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {erroresCampos[fieldId]}
                      </p>
                    )}
                  </div>
                )}

                {c.tipo === 'fecha' && (
                  <div className="space-y-1 w-full">
                    <Input
                      id={fieldId}
                      type="date"
                      value={currentVal}
                      onChange={(e) => {
                        handleValueChange(e.target.value);
                        if (erroresCampos[fieldId]) {
                          setErroresCampos(prev => {
                            const copy = { ...prev };
                            delete copy[fieldId];
                            return copy;
                          });
                        }
                      }}
                      className={`bg-white ${erroresCampos[fieldId] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {erroresCampos[fieldId] && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {erroresCampos[fieldId]}
                      </p>
                    )}
                  </div>
                )}

                {c.tipo === 'booleano' && (
                  <div className="space-y-1 w-full">
                    <div className="flex items-center gap-2 pt-2 h-[38px]">
                      <input
                        id={fieldId}
                        type="checkbox"
                        checked={!!currentVal}
                        onChange={(e) => {
                          handleValueChange(e.target.checked);
                          if (erroresCampos[fieldId]) {
                            setErroresCampos(prev => {
                              const copy = { ...prev };
                              delete copy[fieldId];
                              return copy;
                            });
                          }
                        }}
                        className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer ${erroresCampos[fieldId] ? 'border-red-500' : ''}`}
                      />
                      <label htmlFor={fieldId} className={`text-xs font-medium cursor-pointer select-none ${erroresCampos[fieldId] ? 'text-red-600' : 'text-gray-600'}`}>
                        {c.nombre}
                      </label>
                    </div>
                    {erroresCampos[fieldId] && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {erroresCampos[fieldId]}
                      </p>
                    )}
                  </div>
                )}

                {c.tipo === 'opciones-multiple' && (
                  <div className={`space-y-2 w-full ${(c.opciones || []).length > 2 ? 'md:col-span-2' : ''}`}>
                    <div className="flex flex-col gap-2">
                      {(c.opciones || []).map((opcion, optIdx) => {
                        const selected: string[] = Array.isArray(currentVal) ? currentVal : [];
                        const isChecked = selected.includes(opcion);
                        return (
                          <label key={optIdx} className="flex items-center gap-2.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const prev: string[] = Array.isArray(formData.camposAdicionales?.[fieldId]) ? [...(formData.camposAdicionales![fieldId] as string[])] : [];
                                const next = e.target.checked ? [...prev, opcion] : prev.filter(o => o !== opcion);
                                handleValueChange(next);
                                if (erroresCampos[fieldId]) {
                                  setErroresCampos(p => { const cp = { ...p }; delete cp[fieldId]; return cp; });
                                }
                              }}
                              className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer ${erroresCampos[fieldId] ? 'border-red-500' : ''}`}
                            />
                            <span className={`text-sm font-medium group-hover:text-blue-700 ${erroresCampos[fieldId] ? 'text-red-600' : 'text-gray-700'}`}>{opcion}</span>
                          </label>
                        );
                      })}
                      {(c.opciones || []).length === 0 && (
                        <p className="text-xs text-gray-400 italic">Sin opciones configuradas.</p>
                      )}
                    </div>
                    {erroresCampos[fieldId] && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {erroresCampos[fieldId]}
                      </p>
                    )}
                  </div>
                )}

                {c.tipo === 'lista' && (
                  <div className="space-y-1 w-full">
                    <select
                      id={fieldId}
                      value={typeof currentVal === 'string' ? currentVal : ''}
                      onChange={(e) => {
                        handleValueChange(e.target.value);
                        if (erroresCampos[fieldId]) {
                          setErroresCampos(p => { const cp = { ...p }; delete cp[fieldId]; return cp; });
                        }
                      }}
                      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-800 ${erroresCampos[fieldId] ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Seleccione una opción...</option>
                      {(c.opciones || []).map((opcion, optIdx) => (
                        <option key={optIdx} value={opcion}>{opcion}</option>
                      ))}
                    </select>
                    {erroresCampos[fieldId] && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {erroresCampos[fieldId]}
                      </p>
                    )}
                  </div>
                )}

                {c.tipo === 'documento' && (
                  <div className="space-y-2 w-full">
                    {currentVal && typeof currentVal === 'object' && currentVal.nombre ? (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/30">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div className="text-xs truncate">
                            <span className="font-semibold text-gray-800 block truncate" title={currentVal.nombre}>
                              {currentVal.nombre}
                            </span>
                            {currentVal.tamano && (
                              <span className="text-gray-500 text-[10px]">
                                {(currentVal.tamano / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {currentVal.base64 && (
                            <a
                              href={currentVal.base64}
                              download={currentVal.nombre}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 rounded transition-colors"
                              title="Descargar documento"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              handleValueChange(null);
                              if (erroresCampos[fieldId]) {
                                setErroresCampos(prev => {
                                  const copy = { ...prev };
                                  delete copy[fieldId];
                                  return copy;
                                });
                              }
                            }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100/50 rounded transition-colors"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl bg-white hover:bg-blue-50/10 hover:border-blue-300 transition-all cursor-pointer group ${erroresCampos[fieldId] ? 'border-red-500 bg-red-50/10' : 'border-gray-300'}`}>
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                            <Upload className={`w-8 h-8 group-hover:text-blue-500 transition-colors mb-2 ${erroresCampos[fieldId] ? 'text-red-500' : 'text-gray-400'}`} />
                            <p className={`text-xs font-bold group-hover:text-blue-600 transition-colors ${erroresCampos[fieldId] ? 'text-red-600' : 'text-gray-700'}`}>
                              Haga clic para cargar documento
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">
                              {c.tiposDocumento && c.tiposDocumento.length > 0
                                ? `Formatos permitidos: ${c.tiposDocumento.map(ext => ext.toUpperCase()).join(', ')}`
                                : 'Cualquier formato de archivo permitido'}
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept={c.tiposDocumento && c.tiposDocumento.length > 0 ? c.tiposDocumento.join(',') : '*'}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              if (c.tiposDocumento && c.tiposDocumento.length > 0) {
                                const ext = '.' + file.name.split('.').pop()?.toLowerCase();
                                if (!c.tiposDocumento.includes(ext)) {
                                  toast.error('⚠️ Archivo no permitido', {
                                    description: `El tipo de archivo "${ext}" no está permitido. Formatos admitidos: ${c.tiposDocumento.join(', ')}`
                                  });
                                  e.target.value = '';
                                  return;
                                }
                              }

                              const reader = new FileReader();
                              reader.onload = () => {
                                handleValueChange({
                                  nombre: file.name,
                                  base64: reader.result as string,
                                  tamano: file.size,
                                  tipoMime: file.type,
                                  esNuevo: true
                                });
                                if (erroresCampos[fieldId]) {
                                  setErroresCampos(prev => {
                                    const copy = { ...prev };
                                    delete copy[fieldId];
                                    return copy;
                                  });
                                }
                              };
                              reader.onerror = () => {
                                toast.error('Error al leer el archivo');
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                    )}
                    {erroresCampos[fieldId] && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {erroresCampos[fieldId]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([]);
  const [departamentosAPI, setDepartamentosAPI] = useState<{ id: number; nombre: string }[]>([]);
  const [cargandoCiudades, setCargandoCiudades] = useState(false);
  const [abogadosAPI, setAbogadosAPI] = useState<{ id: string; nombre: string }[]>([]);
  const [seccionales, setSeccionales] = useState<{ idSeccional: number; nomSeccional: string }[]>([]);
  const [sedesFiltradas, setSedesFiltradas] = useState<{ idSede: number; nomSede: string }[]>([]);
  const [cargandoSedes, setCargandoSedes] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [todosLosExpedientes, setTodosLosExpedientes] = useState<any[]>([]);
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>({});

  // Resetear o pre-llenar el formulario al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setErroresCampos({});
      // Cargar expedientes para validación de campos únicos
      legalService.getExpedientes()
        .then(res => {
          console.log('🔍 [DEBUG] todosLosExpedientes cargados para validación única:', res ? res.length : 0, res);
          setTodosLosExpedientes(res || []);
        })
        .catch(err => {
          console.error('Error al cargar expedientes para validación única:', err);
        });

      if (expedienteEdit) {
        setPasoActual(1);

        // Mapear Partes Procesales a los tipos del formulario
        const mapDemandante = (p: ParteProcesal): Demandante => ({
          id: p.id,
          tipoPersona: p.tipoPersona === 'juridica' ? 'Juridica' : 'Natural',
          cedula: p.identificacion,
          nombreCompleto: p.nombre,
          telefono: p.telefono || '',
          correo: p.email || '',
          direccion: p.direccion || '',
          tieneApoderado: !!p.apoderado,
          apoderado: p.apoderado ? { nombreCompleto: p.apoderado, cedula: '', celular: '', correo: '' } : undefined
        });

        const mapDemandado = (p: ParteProcesal): Demandado => ({
          id: p.id,
          tipoPersona: p.tipoPersona === 'juridica' ? 'Juridica' : 'Natural',
          cedula: p.identificacion,
          nombreCompleto: p.nombre,
          cargoFuncion: p.cargo || '',
          telefono: p.telefono || '',
          correo: p.email || '',
          direccion: p.direccion || '',
          tieneApoderado: !!p.apoderado,
          apoderado: p.apoderado ? { nombreCompleto: p.apoderado, cedula: '', celular: '', correo: '' } : undefined
        });

        const mapOtroActor = (p: ParteProcesal): OtroActor => ({
          id: p.id,
          tipoPersona: p.tipoPersona === 'juridica' ? 'Juridica' : 'Natural',
          cedula: p.identificacion,
          nombreCompleto: p.nombre,
          rol: p.rol || '',
          telefono: p.telefono || '',
          correo: p.email || '',
          direccion: p.direccion || '',
          tieneApoderado: !!p.apoderado,
          apoderado: p.apoderado ? { nombreCompleto: p.apoderado, cedula: '', celular: '', correo: '' } : undefined
        });

        setFormData({
          numeroRadicado: expedienteEdit.radicado || expedienteEdit.id,
          medioControl: expedienteEdit.medioControl as string || '',
          tipoProcesoJudicial: expedienteEdit.tipoProceso || expedienteEdit.tipo || '',
          etapaProcesal: expedienteEdit.etapa as string || '',
          cuantia: typeof expedienteEdit.cuantia === 'string' ? parseFloat(expedienteEdit.cuantia.replace(/[^0-9.-]+/g, "")) : (expedienteEdit.cuantia || 0),
          nivelRiesgo: (expedienteEdit as any).nivelRiesgo || '',
          provisionContable: typeof (expedienteEdit as any).provisionContable === 'string' ? parseInt(String((expedienteEdit as any).provisionContable).replace(/[^0-9]/g, ''), 10) || 0 : Math.floor(Number((expedienteEdit as any).provisionContable) || 0),
          fechaEstimacionProvision: (expedienteEdit as any).fechaEstimacionProvision ? new Date((expedienteEdit as any).fechaEstimacionProvision).toISOString().split('T')[0] : '',
          observacionesProvision: (expedienteEdit as any).observacionProvision || '',
          demandantes: expedienteEdit.demandantes ? expedienteEdit.demandantes.map(mapDemandante) : [],
          demandados: expedienteEdit.demandados ? expedienteEdit.demandados.map(mapDemandado) : [],
          otrosActores: expedienteEdit.otrosActores ? expedienteEdit.otrosActores.map(mapOtroActor) : [],
          juzgadoTribunal: expedienteEdit.juzgadoConocimiento || expedienteEdit.juzgado || '',
          departamento: expedienteEdit.ubicacionFisica ? (expedienteEdit.ubicacionFisica.includes('-') ? expedienteEdit.ubicacionFisica.split('-')[1].trim() : '') : '',
          ciudad: expedienteEdit.ubicacionFisica ? (expedienteEdit.ubicacionFisica.includes('-') ? expedienteEdit.ubicacionFisica.split('-')[0].trim() : expedienteEdit.ubicacionFisica) : '',
          territorial: (expedienteEdit as any).territorial || '',
          cetap: (expedienteEdit as any).cetap || '',
          dependencia: (expedienteEdit as any).dependencia || '',
          tipoPlazo: expedienteEdit.tipoConteoTermino === 'HORAS' ? 'Horas' : expedienteEdit.tipoConteoTermino === 'CALENDARIO' ? 'Dias Calendario' : 'Dias Habiles',
          termino: expedienteEdit.terminoProcesalDias || expedienteEdit.diasTotales || (tiposProcesosActivos.find(tp => tp.nombre === (expedienteEdit.tipoProceso || expedienteEdit.tipo || ''))?.plazo) || 30,
          fechaNotificacion: expedienteEdit.fechaNotificacion ?
            (typeof expedienteEdit.fechaNotificacion === 'string' ? new Date(expedienteEdit.fechaNotificacion).toISOString().slice(0, 16) :
              toLocalISO(expedienteEdit.fechaNotificacion)) : '',
          fechaVencimiento: expedienteEdit.fechaVencimientoTerminos ?
            (typeof expedienteEdit.fechaVencimientoTerminos === 'string' ? new Date(expedienteEdit.fechaVencimientoTerminos).toISOString().slice(0, 16) :
              toLocalISO(expedienteEdit.fechaVencimientoTerminos)) : '',
          abogadoResponsable: expedienteEdit.abogadoSustanciador || expedienteEdit.abogadoAsignado || '',
          pretensiones: expedienteEdit.pretensiones || '',
          hechos: expedienteEdit.hechos || '',
          observaciones: '',
          esDelitoAdminPublica: (expedienteEdit as any).esDelitoAdminPublica || false,
          esConductaPatrimonioPublico: (expedienteEdit as any).esConductaPatrimonioPublico || false,
          esOtroDelitoPenal: (expedienteEdit as any).esOtroDelitoPenal || false,
          otroDelitoPenalDescripcion: (expedienteEdit as any).otroDelitoPenalDescripcion || '',
          camposAdicionales: expedienteEdit.camposAdicionales || {}
        });
        setCiudadesDisponibles([]);
      } else {
        setPasoActual(1);
        lastTipoProcesoRef.current = '';

        let defaultTipoProceso = '';
        let defaultTipoPlazo: 'Dias Habiles' | 'Dias Calendario' | 'Horas' = 'Dias Habiles';
        let defaultTermino = 30;

        if (tableroSeleccionado && tableroSeleccionado !== 'TODOS') {
          const tp = allTiposProcesos?.find((t: any) => t.id === tableroSeleccionado);
          if (tp) {
            defaultTipoProceso = tp.nombre;
            defaultTipoPlazo = 'Dias Habiles';
            if (tp.unidadTermino === 'Horas' || tp.unidadTermino === 'horas') defaultTipoPlazo = 'Horas';
            else if (tp.unidadTermino === 'Dias Calendario') defaultTipoPlazo = 'Dias Calendario';
            defaultTermino = tp.plazo ?? 30;
          }
        }

        setFormData({
          numeroRadicado: '',
          medioControl: '',
          tipoProcesoJudicial: defaultTipoProceso,
          etapaProcesal: '',
          cuantia: 0,
          nivelRiesgo: '',
          provisionContable: 0,
          fechaEstimacionProvision: '',
          observacionesProvision: '',
          demandantes: [],
          demandados: [],
          otrosActores: [],
          juzgadoTribunal: '',
          departamento: '',
          ciudad: '',
          territorial: '',
          cetap: '',
          dependencia: '',
          tipoPlazo: defaultTipoPlazo,
          termino: defaultTermino,
          fechaNotificacion: '',
          fechaVencimiento: '',
          abogadoResponsable: '',
          pretensiones: '',
          hechos: '',
          observaciones: '',
          esDelitoAdminPublica: false,
          esConductaPatrimonioPublico: false,
          esOtroDelitoPenal: false,
          otroDelitoPenalDescripcion: '',
          camposAdicionales: {}
        });
        setCiudadesDisponibles([]);
      }
    }
  }, [isOpen, expedienteEdit]);

  // Auto-poblar termino y etapa inicial desde el plazo configurado al seleccionar tipo de proceso (solo en creación)
  useEffect(() => {
    if (expedienteEdit) return;
    if (!formData.tipoProcesoJudicial) {
      lastTipoProcesoRef.current = '';
      return;
    }

    // Solo auto-poblar si el tipo de proceso realmente cambió
    if (formData.tipoProcesoJudicial === lastTipoProcesoRef.current) {
      return;
    }
    lastTipoProcesoRef.current = formData.tipoProcesoJudicial;

    const tp = tiposProcesosActivos.find(t => t.nombre === formData.tipoProcesoJudicial);
    if (tp) {
      const customStages = (tp.estados && tp.estados.length > 0)
        ? tp.estados.filter((e: any) => e.activo).sort((a: any, b: any) => a.orden - b.orden)
        : estadosActivos;
      const firstStage = customStages.length > 0 ? customStages[0].id : 'RADICACION';

      setFormData(prev => {
        const newTermino = tp.plazo ?? 30;
        let newTipoPlazo = 'Dias Habiles';
        if (tp.unidadTermino === 'Horas' || tp.unidadTermino === 'horas') newTipoPlazo = 'Horas';
        else if (tp.unidadTermino === 'Dias Calendario') newTipoPlazo = 'Dias Calendario';
        return {
          ...prev,
          termino: newTermino,
          tipoPlazo: newTipoPlazo as any,
          etapaProcesal: firstStage
        };
      });
    }
  }, [formData.tipoProcesoJudicial, tiposProcesosActivos, estadosActivos, expedienteEdit]);

  // Calcular fecha de vencimiento automáticamente
  useEffect(() => {
    if (formData.fechaNotificacion && formData.termino) {
      const activeTipo = tiposProcesosActivos.find(t => t.nombre === formData.tipoProcesoJudicial);
      const fechaVenc = calcularFechaVencimiento(
        formData.fechaNotificacion,
        formData.termino,
        formData.tipoPlazo === 'Horas' ? 'Dias Calendario' : formData.tipoPlazo,
        activeTipo?.horaEspecial,
        formData.tipoPlazo === 'Horas' ? 'horas' : 'dias'
      );
      setFormData(prev => {
        if (prev.fechaVencimiento === fechaVenc) return prev;
        return { ...prev, fechaVencimiento: fechaVenc };
      });
    }
  }, [formData.fechaNotificacion, formData.termino, formData.tipoPlazo, formData.tipoProcesoJudicial, tiposProcesosActivos]);

  // Cargar departamentos desde auth.geopolitica al montar
  useEffect(() => {
    estructuraService.geopolitica.listarDepartamentos()
      .then(res => {
        const deps = (res.data || []).map((d: any) => ({
          id: d.idGeopolitica,
          nombre: d.nomDivGeopolitica,
        }));
        setDepartamentosAPI(deps);
      })
      .catch(() => {
        // Fallback silencioso: se queda con array vacío
      });
  }, []);

  // Cargar territoriales (seccionales) desde estructura organizacional
  useEffect(() => {
    estructuraService.seccionales.listar()
      .then(res => {
        setSeccionales((res.data || []).map((s: any) => ({
          idSeccional: s.idSeccional,
          nomSeccional: s.nomSeccional,
        })));
      })
      .catch(() => {});
  }, []);

  // Cargar CETAPs (sedes) cuando cambia la territorial seleccionada
  useEffect(() => {
    if (!formData.territorial) {
      setSedesFiltradas([]);
      return;
    }
    setCargandoSedes(true);
    estructuraService.sedes.listar({ idSeccional: Number(formData.territorial) })
      .then(res => {
        setSedesFiltradas((res.data || []).map((s: any) => ({
          idSede: s.idSede,
          nomSede: s.nomSede,
        })));
      })
      .catch(() => { setSedesFiltradas([]); })
      .finally(() => setCargandoSedes(false));
  }, [formData.territorial]);

  // Cargar abogados con rol resuelve desde el servicio de auth
  useEffect(() => {
    legalService.getAbogados()
      .then((data: any[]) => {
        const activos = (data || []).map((a: any) => ({ id: a.id, nombre: a.nombreCompleto || a.nombre }));
        setAbogadosAPI(activos);
      })
      .catch(() => { });
  }, []);

  // Actualizar ciudades cuando cambia el departamento
  useEffect(() => {
    if (formData.departamento) {
      const dep = departamentosAPI.find(d => d.nombre === formData.departamento);
      if (dep) {
        setCargandoCiudades(true);
        estructuraService.geopolitica.listarCiudades(dep.id)
          .then(res => {
            const ciudades = (res.data || []).map((c: any) => c.nomDivGeopolitica as string);
            setCiudadesDisponibles(ciudades);
            // Solo borrar la ciudad si no está entre las disponibles o no existe
            const isCityValid = formData.ciudad && ciudades.includes(formData.ciudad);
            if (!formData.ciudad || !isCityValid) {
              setFormData(prev => ({ ...prev, ciudad: '' }));
            }
          })
          .catch(() => setCiudadesDisponibles([]))
          .finally(() => setCargandoCiudades(false));
      } else {
        setCiudadesDisponibles([]);
        setFormData(prev => ({ ...prev, ciudad: '' }));
      }
    }
  }, [formData.departamento, departamentosAPI]);

  // ==================== FUNCIONES DEMANDANTES ====================

  const agregarDemandante = () => {
    const nuevoDemandante: Demandante = {
      id: `DEM-${Date.now()}`,
      tipoPersona: 'Natural',
      cedula: '',
      nombreCompleto: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false
    };
    setFormData(prev => ({
      ...prev,
      demandantes: [...prev.demandantes, nuevoDemandante]
    }));
    toast.success('Demandante agregado');
  };

  const eliminarDemandante = (id: string) => {
    setFormData(prev => ({
      ...prev,
      demandantes: prev.demandantes.filter(d => d.id !== id)
    }));
    toast.info('Demandante eliminado');
  };

  const actualizarDemandante = (id: string, campo: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      demandantes: prev.demandantes.map(d =>
        d.id === id ? { ...d, [campo]: valor } : d
      )
    }));
  };

  // ==================== FUNCIONES DEMANDADOS ====================

  const agregarDemandado = () => {
    const nuevoDemandado: Demandado = {
      id: `DEMA-${Date.now()}`,
      tipoPersona: 'Natural',
      cedula: '',
      nombreCompleto: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false
    };
    setFormData(prev => ({
      ...prev,
      demandados: [...prev.demandados, nuevoDemandado]
    }));
    toast.success('Demandado agregado');
  };

  const eliminarDemandado = (id: string) => {
    setFormData(prev => ({
      ...prev,
      demandados: prev.demandados.filter(d => d.id !== id)
    }));
    toast.info('Demandado eliminado');
  };

  const actualizarDemandado = (id: string, campo: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      demandados: prev.demandados.map(d =>
        d.id === id ? { ...d, [campo]: valor } : d
      )
    }));
  };

  // ==================== FUNCIONES OTROS ACTORES ====================

  const agregarOtroActor = () => {
    const nuevoActor: OtroActor = {
      id: `ACT-${Date.now()}`,
      tipoPersona: 'Natural',
      cedula: '',
      nombreCompleto: '',
      rol: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false
    };
    setFormData(prev => ({
      ...prev,
      otrosActores: [...prev.otrosActores, nuevoActor]
    }));
    toast.success('Actor agregado');
  };

  const eliminarOtroActor = (id: string) => {
    setFormData(prev => ({
      ...prev,
      otrosActores: prev.otrosActores.filter(a => a.id !== id)
    }));
    toast.info('Actor eliminado');
  };

  const actualizarOtroActor = (id: string, campo: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      otrosActores: prev.otrosActores.map(a =>
        a.id === id ? { ...a, [campo]: valor } : a
      )
    }));
  };

  // ==================== VALIDACIONES POR PASO ====================

  const validarPasoActual = (): boolean => {
    // Validar campos adicionales dinámicos para el paso actual
    if (activeTipoProceso?.camposAdicionalesConfig) {
      const camposDelPaso = activeTipoProceso.camposAdicionalesConfig.filter(c => (c.paso || 1) === pasoActual);
      
      // Clear previous custom errors for this step
      setErroresCampos(prev => {
        const copy = { ...prev };
        camposDelPaso.forEach(c => {
          delete copy[c.id];
        });
        return copy;
      });

      let hasCustomError = false;
      const newCustomErrors: Record<string, string> = {};

      for (const campo of camposDelPaso) {
        const val = formData.camposAdicionales?.[campo.id];
        
        // 1. Validar obligatoriedad
        if (campo.obligatorio) {
          if (val === undefined || val === null || val === '' || val === false) {
            newCustomErrors[campo.id] = `El campo "${campo.nombre}" es obligatorio.`;
            hasCustomError = true;
          }
        }

        // 2. Validar formato alfanumérico (solo si hay un valor ingresado)
        if (campo.tipo === 'alfanumerico' && val && !newCustomErrors[campo.id]) {
          const alphanumericRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]*$/;
          if (!alphanumericRegex.test(String(val))) {
            newCustomErrors[campo.id] = `El campo "${campo.nombre}" debe ser alfanumérico (solo letras y números).`;
            hasCustomError = true;
          }
        }

        // 3. Validar valor único (solo si hay un valor ingresado)
        if (campo.tipo === 'unico' && val && !newCustomErrors[campo.id]) {
          const isEdit = !!expedienteEdit;
          const currentId = expedienteEdit?.uuid || expedienteEdit?.id;
          const duplicado = todosLosExpedientes.some(exp => {
            const expId = exp.uuid || exp.id;
            if (isEdit && expId === currentId) return false;
            
            const expCampos = exp.camposAdicionales || {};
            return String(expCampos[campo.id]).trim().toLowerCase() === String(val).trim().toLowerCase();
          });
          if (duplicado) {
            newCustomErrors[campo.id] = `El valor "${val}" ya existe para el campo único "${campo.nombre}".`;
            hasCustomError = true;
          }
        }
      }

      if (hasCustomError) {
        setErroresCampos(prev => ({ ...prev, ...newCustomErrors }));
        toast.error('⚠️ Campos obligatorios o incorrectos', {
          description: 'Por favor complete y verifique los campos dinámicos marcados en rojo.'
        });
        return false;
      }
    }

    switch (pasoActual) {
      case 1: {
        const medioControlReq = isFieldRequired('medioControl', true);
        const cuantiaReq = isFieldRequired('cuantia', false);

        // Reset anterior de errores para este paso
        setErroresCampos(prev => {
          const copy = { ...prev };
          delete copy.numeroRadicado;
          delete copy.medioControl;
          delete copy.tipoProcesoJudicial;
          delete copy.etapaProcesal;
          delete copy.cuantia;
          return copy;
        });

        let hasError = false;
        const newErrors: Record<string, string> = {};

        if (!formData.numeroRadicado) {
          newErrors.numeroRadicado = 'El número de radicado es obligatorio';
          hasError = true;
        } else if (formData.numeroRadicado.length < 11 || formData.numeroRadicado.length > 23) {
          newErrors.numeroRadicado = 'El radicado debe tener entre 11 y 23 dígitos';
          hasError = true;
        }

        if (medioControlReq && !formData.medioControl) {
          newErrors.medioControl = 'El medio de control es obligatorio';
          hasError = true;
        }

        if (!formData.tipoProcesoJudicial) {
          newErrors.tipoProcesoJudicial = 'El tipo de proceso es obligatorio';
          hasError = true;
        }

        if (!formData.etapaProcesal) {
          newErrors.etapaProcesal = 'La etapa procesal es obligatoria';
          hasError = true;
        }

        if (cuantiaReq && (formData.cuantia === undefined || formData.cuantia === null || formData.cuantia === 0)) {
          newErrors.cuantia = 'La cuantía es obligatoria y debe ser mayor a 0';
          hasError = true;
        }

        // Validar campos adicionales obligatorios del paso 1
        if (activeTipoProceso?.camposAdicionalesConfig) {
          for (const campo of activeTipoProceso.camposAdicionalesConfig.filter(c => (c.paso || 1) === 1 && c.obligatorio)) {
            const val = formData.camposAdicionales?.[campo.id];
            const isEmpty = campo.tipo === 'opciones-multiple'
              ? !Array.isArray(val) || (val as string[]).length === 0
              : campo.tipo === 'booleano'
                ? false
                : val === undefined || val === null || val === '';
            if (isEmpty) {
              newErrors[campo.id] = `${campo.nombre} es obligatorio`;
              hasError = true;
            }
          }
        }

        if (hasError) {
          setErroresCampos(prev => ({ ...prev, ...newErrors }));
          toast.error('⚠️ Campos obligatorios incompletos', {
            description: 'Por favor complete y verifique los campos marcados en rojo.'
          });
          return false;
        }

        // Validar si el radicado ya existe en la plataforma (evitar duplicados antes de avanzar en el wizard)
        const isEdit = !!expedienteEdit;
        const currentId = expedienteEdit?.uuid || expedienteEdit?.id;
        const radicadoDuplicado = todosLosExpedientes.some(exp => {
          const expId = exp.uuid || exp.id;
          if (isEdit && expId === currentId) return false;
          
          const expRadicado = exp.radicado || exp.numeroRadicado || exp.id;
          return expRadicado && String(expRadicado).trim().toLowerCase() === String(formData.numeroRadicado).trim().toLowerCase();
        });

        console.log('🔍 [DEBUG] validarPasoActual Case 1:', {
          numeroRadicado: formData.numeroRadicado,
          totalExpedientes: todosLosExpedientes.length,
          isEdit,
          currentId,
          radicadoDuplicado
        });

        if (radicadoDuplicado) {
          setErroresCampos(prev => ({ ...prev, numeroRadicado: 'Este número de radicado ya está registrado en el sistema' }));
          toast.error('⚠️ Radicado duplicado', {
            description: `El número de radicado "${formData.numeroRadicado}" ya está registrado en la plataforma. Use un número único.`
          });
          return false;
        }

        return true;
      }

      case 2: {
        if (formData.demandantes.length === 0) {
          toast.error('⚠️ Demandantes requeridos', {
            description: 'Debe agregar al menos un demandante'
          });
          return false;
        }

        const demTipoPersonaReq = isFieldRequired('demandanteTipoPersona', true);
        const demIdentificacionReq = isFieldRequired('demandanteIdentificacion', true);
        const demNombreReq = isFieldRequired('demandanteNombre', true);
        const demTelefonoReq = isFieldRequired('demandanteTelefono', false);
        const demCorreoReq = isFieldRequired('demandanteCorreo', true);
        const demDireccionReq = isFieldRequired('demandanteDireccion', false);

        for (const dem of formData.demandantes) {
          if (demTipoPersonaReq && !dem.tipoPersona) {
            toast.error('⚠️ Tipo de persona obligatorio', {
              description: 'El tipo de persona es obligatorio para todos los demandantes.'
            });
            return false;
          }
          if (demIdentificacionReq && !dem.cedula) {
            toast.error('⚠️ Identificación obligatoria', {
              description: `La identificación es obligatoria para el demandante ${dem.nombreCompleto || ''}.`
            });
            return false;
          }
          if (demNombreReq && !dem.nombreCompleto) {
            toast.error('⚠️ Nombre obligatorio', {
              description: 'El nombre o razón social es obligatorio para todos los demandantes.'
            });
            return false;
          }
          if (demTelefonoReq && !dem.telefono) {
            toast.error('⚠️ Teléfono obligatorio', {
              description: `El teléfono es obligatorio para el demandante ${dem.nombreCompleto || ''}.`
            });
            return false;
          }
          if (dem.telefono && dem.telefono.length < 7) {
            toast.error('⚠️ Teléfono inválido', {
              description: `El teléfono del demandante ${dem.nombreCompleto || ''} debe tener al menos 7 dígitos`
            });
            return false;
          }
          if (demCorreoReq && !dem.correo) {
            toast.error('⚠️ Correo obligatorio', {
              description: `El correo electrónico es obligatorio para el demandante ${dem.nombreCompleto || ''}.`
            });
            return false;
          }
          if (dem.correo && !EMAIL_REGEX.test(dem.correo)) {
            toast.error('⚠️ Correo inválido', {
              description: `El correo "${dem.correo}" del demandante ${dem.nombreCompleto || ''} no es válido`
            });
            return false;
          }
          if (demDireccionReq && !dem.direccion) {
            toast.error('⚠️ Dirección obligatoria', {
              description: `La dirección es obligatoria para el demandante ${dem.nombreCompleto || ''}.`
            });
            return false;
          }
        }
        return true;
      }

      case 3: {
        if (!formData.territorial) {
          toast.error('⚠️ Territorial requerida', {
            description: 'Debe seleccionar la territorial del proceso'
          });
          return false;
        }

        if (formData.demandados.length === 0) {
          toast.error('⚠️ Demandados requeridos', {
            description: 'Debe agregar al menos un demandado'
          });
          return false;
        }

        const ddTipoPersonaReq = isFieldRequired('demandadoTipoPersona', true);
        const ddIdentificacionReq = isFieldRequired('demandadoIdentificacion', true);
        const ddNombreReq = isFieldRequired('demandadoNombre', true);
        const ddCargoReq = isFieldRequired('demandadoCargo', false);
        const ddTelefonoReq = isFieldRequired('demandadoTelefono', false);
        const ddCorreoReq = isFieldRequired('demandadoCorreo', true);
        const ddDireccionReq = isFieldRequired('demandadoDireccion', false);

        for (const dem of formData.demandados) {
          if (ddTipoPersonaReq && !dem.tipoPersona) {
            toast.error('⚠️ Tipo de persona obligatorio', {
              description: 'El tipo de persona es obligatorio para todos los demandados.'
            });
            return false;
          }
          if (ddIdentificacionReq && !dem.cedula) {
            toast.error('⚠️ Identificación obligatoria', {
              description: `La identificación es obligatoria para el demandado ${dem.nombreCompleto || ''}.`
            });
            return false;
          }
          if (ddNombreReq && !dem.nombreCompleto) {
            toast.error('⚠️ Nombre obligatorio', {
              description: 'El nombre o razón social es obligatorio para todos los demandados.'
            });
            return false;
          }
          if (ddCargoReq && !dem.cargoFuncion) {
            toast.error('⚠️ Cargo obligatorio', {
              description: `El cargo es obligatorio para el demandado ${dem.nombreCompleto || ''}.`
            });
            return false;
          }
          if (ddTelefonoReq && !dem.telefono) {
            toast.error('⚠️ Teléfono obligatorio', {
              description: `El teléfono es obligatorio para el demandado ${dem.nombreCompleto || ''}.`
            });
            return false;
          }
          if (dem.telefono && dem.telefono.length < 7) {
            toast.error('⚠️ Teléfono inválido', {
              description: `El teléfono del demandado ${dem.nombreCompleto || ''} debe tener al menos 7 dígitos`
            });
            return false;
          }
          if (ddCorreoReq && !dem.correo) {
            toast.error('⚠️ Correo obligatorio', {
              description: `El correo electrónico es obligatorio para el demandado ${dem.nombreCompleto || ''}.`
            });
            return false;
          }
          if (dem.correo && !EMAIL_REGEX.test(dem.correo)) {
            toast.error('⚠️ Correo inválido', {
              description: `El correo "${dem.correo}" del demandado ${dem.nombreCompleto || ''} no es válido`
            });
            return false;
          }
          if (ddDireccionReq && !dem.direccion) {
            toast.error('⚠️ Dirección obligatoria', {
              description: `La dirección es obligatoria para el demandado ${dem.nombreCompleto || ''}.`
            });
            return false;
          }
        }
        return true;
      }

      case 4: {
        const oaTipoPersonaReq = isFieldRequired('otroActorTipoPersona', false);
        const oaIdentificacionReq = isFieldRequired('otroActorIdentificacion', false);
        const oaNombreReq = isFieldRequired('otroActorNombre', true);
        const oaRolReq = isFieldRequired('otroActorRol', true);
        const oaTelefonoReq = isFieldRequired('otroActorTelefono', false);
        const oaCorreoReq = isFieldRequired('otroActorCorreo', false);
        const oaDireccionReq = isFieldRequired('otroActorDireccion', false);

        for (const actor of formData.otrosActores) {
          if (oaTipoPersonaReq && !actor.tipoPersona) {
            toast.error('⚠️ Tipo de persona obligatorio', {
              description: `El tipo de persona es obligatorio para el actor ${actor.nombreCompleto || ''}.`
            });
            return false;
          }
          if (oaIdentificacionReq && !actor.cedula) {
            toast.error('⚠️ Identificación obligatoria', {
              description: `La identificación es obligatoria para el actor ${actor.nombreCompleto || ''}.`
            });
            return false;
          }
          if (oaNombreReq && !actor.nombreCompleto) {
            toast.error('⚠️ Nombre obligatorio', {
              description: 'El nombre completo o razón social es obligatorio para los otros actores'
            });
            return false;
          }
          if (oaRolReq && !actor.rol) {
            toast.error('⚠️ Rol obligatorio', {
              description: `Debe especificar el rol para el actor ${actor.nombreCompleto || ''}`
            });
            return false;
          }
          if (oaTelefonoReq && !actor.telefono) {
            toast.error('⚠️ Teléfono obligatorio', {
              description: `El teléfono es obligatorio para el actor ${actor.nombreCompleto || ''}.`
            });
            return false;
          }
          if (actor.telefono && actor.telefono.length < 7) {
            toast.error('⚠️ Teléfono inválido', {
              description: `El teléfono de ${actor.nombreCompleto || ''} debe tener al menos 7 dígitos`
            });
            return false;
          }
          if (oaCorreoReq && !actor.correo) {
            toast.error('⚠️ Correo obligatorio', {
              description: `El correo electrónico es obligatorio para el actor ${actor.nombreCompleto || ''}.`
            });
            return false;
          }
          if (actor.correo && !EMAIL_REGEX.test(actor.correo)) {
            toast.error('⚠️ Correo inválido', {
              description: `El correo "${actor.correo}" de ${actor.nombreCompleto || ''} no es válido`
            });
            return false;
          }
          if (oaDireccionReq && !actor.direccion) {
            toast.error('⚠️ Dirección obligatoria', {
              description: `La dirección es obligatoria para el actor ${actor.nombreCompleto || ''}.`
            });
            return false;
          }
        }
        return true;
      }

      case 5: {
        const juzgadoReq = isFieldRequired('juzgadoTribunal', true);
        const ubicacionReq = isFieldRequired('departamentoCiudad', true);

        if (juzgadoReq && !formData.juzgadoTribunal) {
          toast.error('⚠️ Juzgado obligatorio', {
            description: 'El campo Juzgado / Tribunal es obligatorio.'
          });
          return false;
        }
        if (ubicacionReq && (!formData.departamento || !formData.ciudad)) {
          toast.error('⚠️ Ubicación obligatoria', {
            description: 'Debe seleccionar Departamento y Ciudad.'
          });
          return false;
        }
        return true;
      }

      case 6: {
        const abogadoReq = isFieldRequired('abogadoResponsable', false);
        if (!formData.fechaNotificacion || (abogadoReq && (!formData.abogadoResponsable || formData.abogadoResponsable === 'Sin asignar (Temporal)'))) {
          toast.error('⚠️ Información obligatoria incompleta', {
            description: 'Verifique los campos obligatorios del paso de fechas y asignación'
          });
          return false;
        }

        // NUEVA REGLA DE NEGOCIO: La fecha de estimación contable no puede ser anterior a la notificación
        if (formData.fechaEstimacionProvision && new Date(formData.fechaEstimacionProvision) < new Date(formData.fechaNotificacion)) {
          toast.error('⚠️ Inconsistencia de fechas', {
            description: 'La Fecha de Estimación de la Provisión no puede ser anterior a la Fecha de Notificación de la demanda.'
          });
          return false;
        }

        return true;
      }

      case 7: {
        const pretensionesReq = isFieldRequired('pretensiones', true);
        const hechosReq = isFieldRequired('hechos', false);
        if ((pretensionesReq && (!formData.pretensiones || formData.pretensiones.length < 20)) || (hechosReq && !formData.hechos)) {
          toast.error('⚠️ Detalles del proceso obligatorios', {
            description: 'Complete todos los campos obligatorios de la sección detalles del proceso'
          });
          return false;
        }
        return true;
      }

      default:
        return true;
    }
  };

  const siguiente = () => {
    if (validarPasoActual()) {
      setPasoActual(prev => Math.min(prev + 1, totalPasos));
    }
  };

  const anterior = () => {
    setPasoActual(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validarPasoActual()) return;

    // Validación transversal: El número de radicado debe ser único
    const isEdit = !!expedienteEdit;
    const currentId = expedienteEdit?.uuid || expedienteEdit?.id;
    const radicadoDuplicado = todosLosExpedientes.some(exp => {
      const expId = exp.uuid || exp.id;
      if (isEdit && expId === currentId) return false;
      
      const expRadicado = exp.radicado || exp.numeroRadicado || exp.id;
      return expRadicado && String(expRadicado).trim().toLowerCase() === String(formData.numeroRadicado).trim().toLowerCase();
    });

    if (radicadoDuplicado) {
      setErroresCampos(prev => ({ ...prev, numeroRadicado: 'Este número de radicado ya está registrado en el sistema' }));
      setPasoActual(1);
      toast.error('⚠️ Radicado duplicado', {
        description: `El número de radicado "${formData.numeroRadicado}" ya está registrado en la plataforma. Use un número único.`
      });
      return;
    }

    // Validación transversal: La fecha de estimación contable no puede ser anterior a la notificación
    if (formData.fechaEstimacionProvision && formData.fechaNotificacion) {
      if (new Date(formData.fechaEstimacionProvision) < new Date(formData.fechaNotificacion)) {
        toast.error('⚠️ Inconsistencia de fechas', {
          description: 'La Fecha de Estimación de la Provisión no puede ser anterior a la Fecha de Notificación de la demanda. Corríjala en el Paso 1 o Paso 6.'
        });
        return;
      }
    }

    setEnviando(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const isEdit = !!expedienteEdit;
      const idStr = expedienteEdit?.uuid || expedienteEdit?.id;

      let finalPayload: any;

      if (isEdit) {
        // Build payload explicitly with only the scalar columns allowed by the Expediente entity
        finalPayload = {
          radicado: formData.numeroRadicado,
          medioControl: formData.medioControl || undefined,
          tipoProceso: formData.tipoProcesoJudicial || undefined,
          etapaProcesal: formData.etapaProcesal || undefined,
          cuantia: formData.cuantia || undefined,
          nivelRiesgo: formData.nivelRiesgo || undefined,
          provisionContable: formData.provisionContable || undefined,
          fechaEstimacionProvision: formData.fechaEstimacionProvision ? new Date(formData.fechaEstimacionProvision).toISOString() : undefined,
          observacionProvision: formData.observacionesProvision || undefined,
          juzgadoConocimiento: formData.juzgadoTribunal || undefined,
          ubicacionFisica: formData.ciudad && formData.departamento
            ? `${formData.ciudad} - ${formData.departamento}`
            : formData.ciudad || formData.departamento || undefined,
          fechaNotificacion: formData.fechaNotificacion ? new Date(formData.fechaNotificacion).toISOString() : undefined,
          fechaVencimientoTermino: formData.fechaVencimiento ? new Date(formData.fechaVencimiento).toISOString() : undefined,
          abogadoSustanciador: formData.abogadoResponsable === 'Sin asignar (Temporal)' ? null : (formData.abogadoResponsable || undefined),
          pretensionDemandante: formData.pretensiones || undefined,
          hechos: formData.hechos || undefined,
          tipoConteoTermino: formData.tipoPlazo === 'Horas' ? 'HORAS' : formData.tipoPlazo === 'Dias Calendario' ? 'CALENDARIO' : 'HABILES',
          terminoProcesalDias: formData.termino || undefined,
          camposAdicionales: formData.camposAdicionales || undefined,
          // Demandantes, Demandados, and Otros Actores arrays are NOT saved sequentially by updateExpediente
        };
      } else {
        // For creations, the parent component strictly expects the full NuevaDemandaData signature
        // to properly construct the complex CreateExpedienteDto payload.
        finalPayload = { ...formData };
      }

      onSave(finalPayload, isEdit, idStr);

      const consecutivo = isEdit ? formData.numeroRadicado : `ESAP-DN-OCID-DJ-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-2026`;

      toast.success(isEdit ? '✅ Cambios Guardados' : '✅ Demanda Registrada', {
        description: isEdit ? `Expediente actualizado exitosamente` : `${consecutivo} - ${formData.numeroRadicado}`,
        duration: 4000
      });

      onClose();
    } catch (error: any) {
      toast.error(expedienteEdit ? '❌ Error al actualizar demanda' : '❌ Error al registrar demanda', {
        description: error.message || 'Por favor intente nuevamente'
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleCancel = (e?: any) => {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }

    if (expedienteEdit) {
      // Check if any fields were modified from their initial loaded values
      const hasChanges =
        formData.numeroRadicado !== (expedienteEdit.radicado || expedienteEdit.id) ||
        formData.medioControl !== (expedienteEdit.medioControl || '') ||
        formData.tipoProcesoJudicial !== (expedienteEdit.tipoProceso || expedienteEdit.tipo || '') ||
        formData.etapaProcesal !== (expedienteEdit.etapa || '') ||
        formData.pretensiones !== (expedienteEdit.pretensiones || '') ||
        formData.hechos !== (expedienteEdit.hechos || '') ||
        formData.juzgadoTribunal !== (expedienteEdit.juzgadoConocimiento || expedienteEdit.juzgado || '');

      if (hasChanges) {
        setShowCancelConfirm(true);
      } else {
        onClose();
      }
    } else {
      // Creation mode: warn if any data has been typed
      if (formData.numeroRadicado || formData.pretensiones) {
        setShowCancelConfirm(true);
      } else {
        onClose();
      }
    }
  };

  const handleConfirmCancel = (e?: any) => {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }
    setShowCancelConfirm(false);
    onClose();
  };

  const porcentajeProgreso = (pasoActual / totalPasos) * 100;

  const getBadgesPorPaso = () => {
    const badges: Array<{ texto: string; color: 'azul' | 'verde' | 'rojo' }> = [
      { texto: `Paso ${pasoActual} de ${totalPasos}`, color: 'azul' },
      { texto: `${Math.round(porcentajeProgreso)}% Completado`, color: 'verde' }
    ];
    return badges;
  };

  // ==================== RENDER ====================

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent 
          hideCloseButton 
          className="!w-[80vw] !max-w-[80vw] h-[95vh] !max-h-[95vh] flex flex-col p-0 overflow-hidden"
          style={{ width: '80vw', maxWidth: '80vw' }}
        >
          <div style={{ transform: 'scale(0.9)', transformOrigin: 'top left', width: '111.11%', height: '111.11%', minWidth: '111.11%', minHeight: '111.11%' }} className="flex flex-col p-0 m-0">
            <DialogTitle className="sr-only">{expedienteEdit ? "Editar Proceso Judicial" : "Nuevo Proceso Judicial"}</DialogTitle>
          <DialogDescription className="sr-only">
            Wizard para {expedienteEdit ? 'edición' : 'registro'} de proceso judicial - Paso {pasoActual} de {totalPasos}
          </DialogDescription>

          {/* ==================== HEADER LIMPIO Y USABLE ==================== */}
          <ModalHeaderClean
            icono={Scale}
            titulo={expedienteEdit ? "Editar Proceso Judicial" : "Nuevo Proceso Judicial"}
            subtitulo={
              pasoActual === 1 ? 'Datos del Proceso Judicial' :
                pasoActual === 2 ? 'Datos del/los Demandante(s)' :
                  pasoActual === 3 ? 'Datos del/los Demandado(s)' :
                    pasoActual === 4 ? 'Datos de Otros Actores (Opcional)' :
                      pasoActual === 5 ? 'Juzgado y Ubicación' :
                        pasoActual === 6 ? 'Fechas y Asignación' :
                          'Detalles del Proceso'
            }
            colorIcono="blue"
            badges={getBadgesPorPaso()}
            onClose={handleCancel}
          />

        {/* Progress Bar */}
        <div className="flex-shrink-0 px-6 pt-2">
          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${porcentajeProgreso}%` }}
            />
          </div>

          {/* Breadcrumb de pasos */}
          <div className="flex items-center justify-between mt-3 mb-2 text-xs">
            {[
              { num: 1, label: 'Proceso' },
              { num: 2, label: 'Demandantes' },
              { num: 3, label: 'Demandados' },
              { num: 4, label: 'Otros' },
              { num: 5, label: 'Juzgado' },
              { num: 6, label: 'Fechas' },
              { num: 7, label: 'Detalles' }
            ].map((paso) => (
              <div key={paso.num} className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${pasoActual === paso.num
                  ? 'bg-blue-600 text-white'
                  : pasoActual > paso.num
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                  }`}>
                  {pasoActual > paso.num ? <Check className="w-4 h-4" /> : paso.num}
                </div>
                <span className={`text-[10px] mt-1 ${pasoActual === paso.num ? 'text-blue-600 font-bold' : 'text-gray-500'
                  }`}>
                  {paso.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CONTENIDO - flex-1 overflow-y-auto (solo esto hace scroll) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <div className="space-y-6">
            {/* PASO 1: DATOS DEL PROCESO JUDICIAL */}
            {pasoActual === 1 && (
              <>
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900">Información del Proceso</h3>
                      <p className="text-sm text-gray-600">Complete los datos básicos del proceso judicial</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="numeroRadicado" className={`text-sm font-bold ${erroresCampos.numeroRadicado ? 'text-red-600' : 'text-gray-700'}`}>
                        Número de Radicado <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-gray-400 ml-1">(23 dígitos)</span>
                      </Label>
                      <Input
                        id="numeroRadicado"
                        placeholder="Ej: 66001233300020260012300"
                        value={formData.numeroRadicado}
                        maxLength={23}
                        className={erroresCampos.numeroRadicado ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        onChange={(e) => {
                          // Solo permitir dígitos, máximo 23
                          const valor = e.target.value.replace(/[^0-9]/g, '').slice(0, 23);
                          setFormData({ ...formData, numeroRadicado: valor });
                          if (erroresCampos.numeroRadicado) {
                            setErroresCampos(prev => {
                              const copy = { ...prev };
                              delete copy.numeroRadicado;
                              return copy;
                            });
                          }
                        }}
                      />
                      {erroresCampos.numeroRadicado && (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {erroresCampos.numeroRadicado}
                        </p>
                      )}
                      {!erroresCampos.numeroRadicado && formData.numeroRadicado && formData.numeroRadicado.length !== 23 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {formData.numeroRadicado.length}/23 dígitos
                        </p>
                      )}
                      {!erroresCampos.numeroRadicado && formData.numeroRadicado && formData.numeroRadicado.length === 23 && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Radicado completo
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isFieldVisible('medioControl', true) && (
                        <div className="space-y-2">
                          <Label htmlFor="medioControl" className={`text-sm font-bold ${erroresCampos.medioControl ? 'text-red-600' : 'text-gray-700'}`}>
                            Medio de Control {isFieldRequired('medioControl', true) && <span className="text-red-500">*</span>}
                          </Label>
                          <Select
                            value={formData.medioControl}
                            onValueChange={(value: string) => {
                              setFormData({ ...formData, medioControl: value });
                              if (erroresCampos.medioControl) {
                                setErroresCampos(prev => {
                                  const copy = { ...prev };
                                  delete copy.medioControl;
                                  return copy;
                                });
                              }
                            }}
                          >
                            <SelectTrigger id="medioControl" className={`bg-white ${erroresCampos.medioControl ? 'border-red-500 focus:ring-red-500' : ''}`}>
                              <SelectValue placeholder="Seleccione medio de control..." />
                            </SelectTrigger>
                            <SelectContent className="z-[100000]">
                              {mediosControlActivos.map(mc => (
                                <SelectItem key={mc.id} value={mc.nombre}>{mc.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {erroresCampos.medioControl && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {erroresCampos.medioControl}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="tipoProcesoJudicial" className={`text-sm font-bold ${erroresCampos.tipoProcesoJudicial ? 'text-red-600' : 'text-gray-700'}`}>
                          Tipo de Proceso Judicial <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.tipoProcesoJudicial}
                          onValueChange={(value: string) => {
                            const tp = tiposProcesosActivos.find(t => t.nombre === value);
                            setFormData({ ...formData, tipoProcesoJudicial: value, ...(tp?.plazo ? { termino: tp.plazo } : {}) });
                            if (erroresCampos.tipoProcesoJudicial) {
                              setErroresCampos(prev => {
                                const copy = { ...prev };
                                delete copy.tipoProcesoJudicial;
                                return copy;
                              });
                            }
                          }}
                        >
                          <SelectTrigger id="tipoProcesoJudicial" className={`bg-white ${erroresCampos.tipoProcesoJudicial ? 'border-red-500 focus:ring-red-500' : ''}`}>
                            <SelectValue placeholder="Seleccione tipo de proceso..." />
                          </SelectTrigger>
                          <SelectContent className="z-[100000]">
                            {tiposProcesosActivos.map(tp => (
                              <SelectItem key={tp.id} value={tp.nombre}>{tp.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {erroresCampos.tipoProcesoJudicial && (
                          <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {erroresCampos.tipoProcesoJudicial}
                          </p>
                        )}
                      </div>


                      <div className="space-y-2">
                        <Label htmlFor="etapaProcesal" className={`text-sm font-bold ${erroresCampos.etapaProcesal ? 'text-red-600' : 'text-gray-700'}`}>
                          Etapa Procesal <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.etapaProcesal}
                          onValueChange={(value: string) => {
                            setFormData({ ...formData, etapaProcesal: value });
                            if (erroresCampos.etapaProcesal) {
                              setErroresCampos(prev => {
                                const copy = { ...prev };
                                delete copy.etapaProcesal;
                                return copy;
                              });
                            }
                          }}
                        >
                          <SelectTrigger id="etapaProcesal" className={`bg-white ${erroresCampos.etapaProcesal ? 'border-red-500 focus:ring-red-500' : ''}`}>
                            <SelectValue placeholder="Seleccione etapa procesal..." />
                          </SelectTrigger>
                          <SelectContent className="z-[100000]">
                            {etapasDelProceso.map(estado => (
                              <SelectItem key={estado.id} value={estado.id}>{estado.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {erroresCampos.etapaProcesal && (
                          <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {erroresCampos.etapaProcesal}
                          </p>
                        )}
                      </div>

                      {isFieldVisible('cuantia', true) && (
                        <div className="space-y-2">
                          <Label htmlFor="cuantia" className={`text-sm font-bold ${erroresCampos.cuantia ? 'text-red-600' : 'text-gray-700'}`}>
                            Cuantía (COP) {isFieldRequired('cuantia', false) && <span className="text-red-500">*</span>}
                            <span className="text-xs font-normal text-gray-400 ml-1">(máx. 12 dígitos)</span>
                          </Label>
                          <Input
                            id="cuantia"
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={formData.cuantia === 0 ? '' : String(formData.cuantia)}
                            className={erroresCampos.cuantia ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              // Si está vacío, poner 0
                              if (!raw) {
                                setFormData({ ...formData, cuantia: 0 });
                                return;
                              }
                              // Si empieza con 0, solo permitir "0" exacto
                              if (raw.startsWith('0')) {
                                setFormData({ ...formData, cuantia: 0 });
                                return;
                              }
                              // Máximo 12 dígitos
                              const limitado = raw.slice(0, 12);
                              setFormData({ ...formData, cuantia: parseInt(limitado, 10) });
                              if (erroresCampos.cuantia) {
                                setErroresCampos(prev => {
                                  const copy = { ...prev };
                                  delete copy.cuantia;
                                  return copy;
                                });
                              }
                            }}
                          />
                          {erroresCampos.cuantia && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {erroresCampos.cuantia}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
                {renderCamposAdicionales(1)}
              </>
            )}

            {/* PASO 2: DATOS DEMANDANTES */}
            {pasoActual === 2 && (
              <>
                <Card className="p-4 bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-3 mb-4">
                    <Users className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Demandantes</h3>
                      <p className="text-sm text-gray-600">Personas o entidades que presentan la demanda</p>
                    </div>
                    <Button
                      type="button"
                      onClick={agregarDemandante}
                      size="sm"
                      style={{ background: '#10b981', color: '#FFFFFF' }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>

                  {formData.demandantes.length === 0 && (
                    <div className="text-center py-8 bg-white rounded border border-dashed border-amber-300">
                      <Users className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-bold">No hay demandantes agregados</p>
                      <p className="text-xs text-gray-500 mt-1">Haga clic en "Agregar" para comenzar</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {formData.demandantes.map((demandante, index) => (
                      <Card key={demandante.id} className="p-4 bg-white border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900">Demandante #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarDemandante(demandante.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {isFieldVisible('demandanteTipoPersona', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Tipo de Persona {isFieldRequired('demandanteTipoPersona', true) && <span className="text-red-500">*</span>}
                              </Label>
                              <Select
                                value={demandante.tipoPersona}
                                onValueChange={(value: 'Natural' | 'Juridica') => actualizarDemandante(demandante.id, 'tipoPersona', value)}
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[100000]">
                                  <SelectItem value="Natural">Natural</SelectItem>
                                  <SelectItem value="Juridica">Jurídica</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {isFieldVisible('demandanteIdentificacion', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                {demandante.tipoPersona === 'Natural' ? 'Cédula' : 'NIT'} {isFieldRequired('demandanteIdentificacion', true) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder={demandante.tipoPersona === 'Natural' ? '1234567890' : '900123456-7'}
                                value={demandante.cedula}
                                maxLength={demandante.tipoPersona === 'Natural' ? 10 : 15}
                                onChange={(e) => {
                                  const val = demandante.tipoPersona === 'Natural'
                                    ? soloDigitos(e.target.value)
                                    : nitFormato(e.target.value);
                                  actualizarDemandante(demandante.id, 'cedula', val);
                                }}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandanteNombre', true) && (
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                {demandante.tipoPersona === 'Natural' ? 'Nombre Completo' : 'Razón Social'} {isFieldRequired('demandanteNombre', true) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder={demandante.tipoPersona === 'Natural' ? 'Juan Pérez García' : 'Empresa S.A.S.'}
                                value={demandante.nombreCompleto}
                                onChange={(e) => {
                                  const val = demandante.tipoPersona === 'Natural'
                                    ? soloLetrasEspacios(e.target.value)
                                    : e.target.value;
                                  actualizarDemandante(demandante.id, 'nombreCompleto', val);
                                }}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandanteTelefono', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Teléfono {isFieldRequired('demandanteTelefono', false) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder="3001234567"
                                value={demandante.telefono}
                                maxLength={10}
                                onChange={(e) => actualizarDemandante(demandante.id, 'telefono', soloDigitos(e.target.value).slice(0, 10))}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandanteCorreo', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Correo Electrónico {isFieldRequired('demandanteCorreo', true) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                type="email"
                                placeholder="correo@ejemplo.com"
                                value={demandante.correo}
                                onChange={(e) => actualizarDemandante(demandante.id, 'correo', e.target.value)}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandanteDireccion', true) && (
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Dirección {isFieldRequired('demandanteDireccion', false) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder="Calle 123 #45-67"
                                value={demandante.direccion}
                                onChange={(e) => actualizarDemandante(demandante.id, 'direccion', e.target.value)}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandanteTieneApoderado', true) && (
                            <div className="md:col-span-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`apoderado-dem-${demandante.id}`}
                                  checked={demandante.tieneApoderado}
                                  onChange={(e) => actualizarDemandante(demandante.id, 'tieneApoderado', e.target.checked)}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`apoderado-dem-${demandante.id}`} className="text-sm font-bold text-gray-700 cursor-pointer">
                                  Tiene Apoderado
                                </Label>
                              </div>
                            </div>
                          )}

                          {demandante.tieneApoderado && (
                            <div className="md:col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
                              <h5 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Datos del Apoderado
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Nombre Completo</Label>
                                  <Input
                                    placeholder="Nombre del apoderado"
                                    value={demandante.apoderado?.nombreCompleto || ''}
                                    onChange={(e) => actualizarDemandante(demandante.id, 'apoderado', {
                                      ...demandante.apoderado,
                                      nombreCompleto: soloLetrasEspacios(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Cédula</Label>
                                  <Input
                                    placeholder="Cédula"
                                    value={demandante.apoderado?.cedula || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarDemandante(demandante.id, 'apoderado', {
                                      ...demandante.apoderado,
                                      cedula: soloDigitos(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Celular</Label>
                                  <Input
                                    placeholder="3001234567"
                                    value={demandante.apoderado?.celular || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarDemandante(demandante.id, 'apoderado', {
                                      ...demandante.apoderado,
                                      celular: soloDigitos(e.target.value).slice(0, 10)
                                    })}
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Correo Electrónico</Label>
                                  <Input
                                    type="email"
                                    placeholder="apoderado@ejemplo.com"
                                    value={demandante.apoderado?.correo || ''}
                                    onChange={(e) => actualizarDemandante(demandante.id, 'apoderado', {
                                      ...demandante.apoderado,
                                      correo: e.target.value
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
                {renderCamposAdicionales(2)}
              </>
            )}

            {/* PASO 3: DATOS DEMANDADOS */}
            {pasoActual === 3 && (
              <>
                {/* CAMPOS DE SISTEMA: Territorial, CETAP y Dependencia */}
                <Card className="p-4 bg-blue-50 border-blue-200 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900">Territorial, CETAP y Dependencia</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Territorial */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">
                        Territorial <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.territorial}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, territorial: val, cetap: '' }))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Seleccione territorial..." />
                        </SelectTrigger>
                        <SelectContent className="z-[100000]">
                          {seccionales.map(s => (
                            <SelectItem key={s.idSeccional} value={String(s.idSeccional)}>
                              {s.nomSeccional}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* CETAP */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">CETAP</Label>
                      <Select
                        value={formData.cetap}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, cetap: val }))}
                        disabled={!formData.territorial || cargandoSedes}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder={
                            !formData.territorial
                              ? 'Seleccione territorial primero'
                              : cargandoSedes
                              ? 'Cargando...'
                              : 'Seleccione CETAP...'
                          } />
                        </SelectTrigger>
                        <SelectContent className="z-[100000]">
                          {sedesFiltradas.map(s => (
                            <SelectItem key={s.idSede} value={String(s.idSede)}>
                              {s.nomSede}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dependencia */}
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-gray-700">Dependencia</Label>
                      <Select
                        value={formData.dependencia}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, dependencia: val }))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Seleccione dependencia..." />
                        </SelectTrigger>
                        <SelectContent className="z-[100000]">
                          {dependenciasActivas.map(d => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-red-50 border-red-200">
                  <div className="flex items-start gap-3 mb-4">
                    <Building2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Demandados</h3>
                      <p className="text-sm text-gray-600">Personas o entidades demandadas</p>
                    </div>
                    <Button
                      type="button"
                      onClick={agregarDemandado}
                      size="sm"
                      style={{ background: '#10b981', color: '#FFFFFF' }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>

                  {formData.demandados.length === 0 && (
                    <div className="text-center py-8 bg-white rounded border border-dashed border-red-300">
                      <Building2 className="w-12 h-12 text-red-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-bold">No hay demandados agregados</p>
                      <p className="text-xs text-gray-500 mt-1">Haga clic en "Agregar" para comenzar</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {formData.demandados.map((demandado, index) => (
                      <Card key={demandado.id} className="p-4 bg-white border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900">Demandado #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarDemandado(demandado.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {isFieldVisible('demandadoTipoPersona', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Tipo de Persona {isFieldRequired('demandadoTipoPersona', true) && <span className="text-red-500">*</span>}
                              </Label>
                              <Select
                                value={demandado.tipoPersona}
                                onValueChange={(value: 'Natural' | 'Juridica') => actualizarDemandado(demandado.id, 'tipoPersona', value)}
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[100000]">
                                  <SelectItem value="Natural">Natural</SelectItem>
                                  <SelectItem value="Juridica">Jurídica</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {isFieldVisible('demandadoIdentificacion', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                {demandado.tipoPersona === 'Natural' ? 'Cédula' : 'NIT'} {isFieldRequired('demandadoIdentificacion', true) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder={demandado.tipoPersona === 'Natural' ? '1234567890' : '900123456-7'}
                                value={demandado.cedula}
                                maxLength={demandado.tipoPersona === 'Natural' ? 10 : 15}
                                onChange={(e) => {
                                  const val = demandado.tipoPersona === 'Natural'
                                    ? soloDigitos(e.target.value)
                                    : nitFormato(e.target.value);
                                  actualizarDemandado(demandado.id, 'cedula', val);
                                }}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandadoNombre', true) && (
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                {demandado.tipoPersona === 'Natural' ? 'Nombre Completo' : 'Razón Social'} {isFieldRequired('demandadoNombre', true) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder={demandado.tipoPersona === 'Natural' ? 'Juan Pérez García' : 'Empresa S.A.S.'}
                                value={demandado.nombreCompleto}
                                onChange={(e) => {
                                  const val = demandado.tipoPersona === 'Natural'
                                    ? soloLetrasEspacios(e.target.value)
                                    : e.target.value;
                                  actualizarDemandado(demandado.id, 'nombreCompleto', val);
                                }}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandadoCargo', true) && (
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Cargo / Función {isFieldRequired('demandadoCargo', false) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder="Director, Gerente, etc."
                                value={demandado.cargoFuncion || ''}
                                onChange={(e) => actualizarDemandado(demandado.id, 'cargoFuncion', e.target.value)}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandadoTelefono', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Teléfono {isFieldRequired('demandadoTelefono', false) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder="3001234567"
                                value={demandado.telefono}
                                maxLength={10}
                                onChange={(e) => actualizarDemandado(demandado.id, 'telefono', soloDigitos(e.target.value).slice(0, 10))}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandadoCorreo', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Correo Electrónico {isFieldRequired('demandadoCorreo', true) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                type="email"
                                placeholder="correo@ejemplo.com"
                                value={demandado.correo}
                                onChange={(e) => actualizarDemandado(demandado.id, 'correo', e.target.value)}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandadoDireccion', true) && (
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Dirección {isFieldRequired('demandadoDireccion', false) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder="Calle 123 #45-67"
                                value={demandado.direccion}
                                onChange={(e) => actualizarDemandado(demandado.id, 'direccion', e.target.value)}
                              />
                            </div>
                          )}

                          {isFieldVisible('demandadoTieneApoderado', true) && (
                            <div className="md:col-span-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`apoderado-dema-${demandado.id}`}
                                  checked={demandado.tieneApoderado}
                                  onChange={(e) => actualizarDemandado(demandado.id, 'tieneApoderado', e.target.checked)}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`apoderado-dema-${demandado.id}`} className="text-sm font-bold text-gray-700 cursor-pointer">
                                  Tiene Apoderado
                                </Label>
                              </div>
                            </div>
                          )}

                          {demandado.tieneApoderado && (
                            <div className="md:col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
                              <h5 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Datos del Apoderado
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Nombre Completo</Label>
                                  <Input
                                    placeholder="Nombre del apoderado"
                                    value={demandado.apoderado?.nombreCompleto || ''}
                                    onChange={(e) => actualizarDemandado(demandado.id, 'apoderado', {
                                      ...demandado.apoderado,
                                      nombreCompleto: soloLetrasEspacios(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Cédula</Label>
                                  <Input
                                    placeholder="Cédula"
                                    value={demandado.apoderado?.cedula || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarDemandado(demandado.id, 'apoderado', {
                                      ...demandado.apoderado,
                                      cedula: soloDigitos(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Celular</Label>
                                  <Input
                                    placeholder="3001234567"
                                    value={demandado.apoderado?.celular || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarDemandado(demandado.id, 'apoderado', {
                                      ...demandado.apoderado,
                                      celular: soloDigitos(e.target.value).slice(0, 10)
                                    })}
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Correo Electrónico</Label>
                                  <Input
                                    type="email"
                                    placeholder="apoderado@ejemplo.com"
                                    value={demandado.apoderado?.correo || ''}
                                    onChange={(e) => actualizarDemandado(demandado.id, 'apoderado', {
                                      ...demandado.apoderado,
                                      correo: e.target.value
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
                {renderCamposAdicionales(3)}
              </>
            )}

            {/* PASO 4: OTROS ACTORES */}
            {pasoActual === 4 && (
              <>
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <div className="flex items-start gap-3 mb-4">
                    <User className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Otros Actores (Opcional)</h3>
                      <p className="text-sm text-gray-600">Terceros intervinientes u otros participantes en el proceso</p>
                    </div>
                    <Button
                      type="button"
                      onClick={agregarOtroActor}
                      size="sm"
                      style={{ background: '#10b981', color: '#FFFFFF' }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>

                  {formData.otrosActores.length === 0 && (
                    <div className="text-center py-8 bg-white rounded border border-dashed border-purple-300">
                      <User className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-bold">No hay otros actores agregados</p>
                      <p className="text-xs text-gray-500 mt-1">Esta sección es opcional</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {formData.otrosActores.map((actor, index) => (
                      <Card key={actor.id} className="p-4 bg-white border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900">Otro Actor #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarOtroActor(actor.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {isFieldVisible('otroActorTipoPersona', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Tipo de Persona {isFieldRequired('otroActorTipoPersona', false) && <span className="text-red-500">*</span>}
                              </Label>
                              <Select
                                value={actor.tipoPersona}
                                onValueChange={(value: 'Natural' | 'Juridica') => actualizarOtroActor(actor.id, 'tipoPersona', value)}
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[100000]">
                                  <SelectItem value="Natural">Natural</SelectItem>
                                  <SelectItem value="Juridica">Jurídica</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {isFieldVisible('otroActorIdentificacion', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                {actor.tipoPersona === 'Natural' ? 'Cédula' : 'NIT'} {isFieldRequired('otroActorIdentificacion', false) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder={actor.tipoPersona === 'Natural' ? '1234567890' : '900123456-7'}
                                value={actor.cedula}
                                maxLength={actor.tipoPersona === 'Natural' ? 10 : 15}
                                onChange={(e) => {
                                  const val = actor.tipoPersona === 'Natural'
                                    ? soloDigitos(e.target.value)
                                    : nitFormato(e.target.value);
                                  actualizarOtroActor(actor.id, 'cedula', val);
                                }}
                              />
                            </div>
                          )}

                          {isFieldVisible('otroActorNombre', true) && (
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                {actor.tipoPersona === 'Natural' ? 'Nombre Completo' : 'Razón Social'} {isFieldRequired('otroActorNombre', true) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder={actor.tipoPersona === 'Natural' ? 'Juan Pérez García' : 'Empresa S.A.S.'}
                                value={actor.nombreCompleto}
                                onChange={(e) => {
                                  const val = actor.tipoPersona === 'Natural'
                                    ? soloLetrasEspacios(e.target.value)
                                    : e.target.value;
                                  actualizarOtroActor(actor.id, 'nombreCompleto', val);
                                }}
                              />
                            </div>
                          )}

                          {isFieldVisible('otroActorRol', true) && (
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Rol {isFieldRequired('otroActorRol', true) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder="Ej: Tercero interviniente, Litisconsorte, etc."
                                value={actor.rol}
                                onChange={(e) => actualizarOtroActor(actor.id, 'rol', e.target.value)}
                              />
                            </div>
                          )}

                          {isFieldVisible('otroActorTelefono', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Teléfono {isFieldRequired('otroActorTelefono', false) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder="3001234567"
                                value={actor.telefono}
                                maxLength={10}
                                onChange={(e) => actualizarOtroActor(actor.id, 'telefono', soloDigitos(e.target.value).slice(0, 10))}
                              />
                            </div>
                          )}

                          {isFieldVisible('otroActorCorreo', true) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Correo Electrónico {isFieldRequired('otroActorCorreo', false) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                type="email"
                                placeholder="correo@ejemplo.com"
                                value={actor.correo}
                                onChange={(e) => actualizarOtroActor(actor.id, 'correo', e.target.value)}
                              />
                            </div>
                          )}

                          {isFieldVisible('otroActorDireccion', true) && (
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-sm font-bold text-gray-700">
                                Dirección {isFieldRequired('otroActorDireccion', false) && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                placeholder="Calle 123 #45-67"
                                value={actor.direccion}
                                onChange={(e) => actualizarOtroActor(actor.id, 'direccion', e.target.value)}
                              />
                            </div>
                          )}

                          {isFieldVisible('otroActorTieneApoderado', true) && (
                            <div className="md:col-span-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`apoderado-actor-${actor.id}`}
                                  checked={actor.tieneApoderado}
                                  onChange={(e) => actualizarOtroActor(actor.id, 'tieneApoderado', e.target.checked)}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`apoderado-actor-${actor.id}`} className="text-sm font-bold text-gray-700 cursor-pointer">
                                  Tiene Apoderado
                                </Label>
                              </div>
                            </div>
                          )}

                          {actor.tieneApoderado && (
                            <div className="md:col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
                              <h5 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Datos del Apoderado
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Nombre Completo</Label>
                                  <Input
                                    placeholder="Nombre del apoderado"
                                    value={actor.apoderado?.nombreCompleto || ''}
                                    onChange={(e) => actualizarOtroActor(actor.id, 'apoderado', {
                                      ...actor.apoderado,
                                      nombreCompleto: soloLetrasEspacios(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Cédula</Label>
                                  <Input
                                    placeholder="Cédula"
                                    value={actor.apoderado?.cedula || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarOtroActor(actor.id, 'apoderado', {
                                      ...actor.apoderado,
                                      cedula: soloDigitos(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Celular</Label>
                                  <Input
                                    placeholder="3001234567"
                                    value={actor.apoderado?.celular || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarOtroActor(actor.id, 'apoderado', {
                                      ...actor.apoderado,
                                      celular: soloDigitos(e.target.value).slice(0, 10)
                                    })}
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Correo Electrónico</Label>
                                  <Input
                                    type="email"
                                    placeholder="apoderado@ejemplo.com"
                                    value={actor.apoderado?.correo || ''}
                                    onChange={(e) => actualizarOtroActor(actor.id, 'apoderado', {
                                      ...actor.apoderado,
                                      correo: e.target.value
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
                {renderCamposAdicionales(4)}
              </>
            )}

            {/* PASO 5: JUZGADO Y UBICACIÓN */}
            {pasoActual === 5 && (
              <>
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900">Juzgado y Ubicación</h3>
                      <p className="text-sm text-gray-600">Información del despacho judicial</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {isFieldVisible('juzgadoTribunal', true) && (
                      <div className="space-y-2">
                        <Label htmlFor="juzgadoTribunal" className="text-sm font-bold text-gray-700">
                          Juzgado / Tribunal {isFieldRequired('juzgadoTribunal', true) && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          id="juzgadoTribunal"
                          placeholder="Ej: Tribunal Administrativo de Cundinamarca"
                          value={formData.juzgadoTribunal}
                          onChange={(e) => setFormData({ ...formData, juzgadoTribunal: e.target.value })}
                        />
                      </div>
                    )}

                    {isFieldVisible('departamentoCiudad', true) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="departamento" className="text-sm font-bold text-gray-700">
                            Departamento {isFieldRequired('departamentoCiudad', true) && <span className="text-red-500">*</span>}
                          </Label>
                          <Select
                            value={formData.departamento}
                            onValueChange={(value: string) => setFormData({ ...formData, departamento: value })}
                          >
                            <SelectTrigger id="departamento" className="bg-white">
                              <SelectValue placeholder="Seleccione departamento..." />
                            </SelectTrigger>
                            <SelectContent className="z-[100000]">
                              {departamentosAPI.map(dep => (
                                <SelectItem key={dep.id} value={dep.nombre}>{dep.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ciudad" className="text-sm font-bold text-gray-700">
                            Ciudad {isFieldRequired('departamentoCiudad', true) && <span className="text-red-500">*</span>}
                          </Label>
                          <Select
                            value={formData.ciudad}
                            onValueChange={(value: string) => setFormData({ ...formData, ciudad: value })}
                            disabled={!formData.departamento || cargandoCiudades}
                          >
                            <SelectTrigger id="ciudad" className="bg-white">
                              <SelectValue placeholder={cargandoCiudades ? 'Cargando ciudades...' : 'Seleccione ciudad...'} />
                            </SelectTrigger>
                            <SelectContent className="z-[100000]">
                              {ciudadesDisponibles.map(ciudad => (
                                <SelectItem key={ciudad} value={ciudad}>{ciudad}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!formData.departamento && (
                            <p className="text-xs text-gray-500 mt-1">Primero seleccione un departamento</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
                {renderCamposAdicionales(5)}
              </>
            )}

            {/* PASO 6: FECHAS Y ASIGNACIÓN */}
            {pasoActual === 6 && (
              <>
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900">Fechas y Asignación</h3>
                      <p className="text-sm text-gray-600">Términos procesales y responsable</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tipoPlazo" className="text-sm font-bold text-gray-700">
                          Tipo de Plazo <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.tipoPlazo}
                          onValueChange={(value: string) => {
                            const nuevoTipo = value as 'Dias Habiles' | 'Dias Calendario' | 'Horas';
                            // Si se cambia a Días Hábiles, normalizamos la fecha existente si la hay
                            const nuevaFechaNotificacion = (nuevoTipo === 'Dias Habiles' && formData.fechaNotificacion)
                              ? normalizarAHorarioHabil(formData.fechaNotificacion)
                              : formData.fechaNotificacion;
                            setFormData({ ...formData, tipoPlazo: nuevoTipo, fechaNotificacion: nuevaFechaNotificacion });
                          }}
                        >
                          <SelectTrigger id="tipoPlazo" className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100000]">
                            {(!activeTipoProceso?.unidadTermino || activeTipoProceso.unidadTermino === 'dias' || activeTipoProceso.unidadTermino === 'Dias Habiles' || activeTipoProceso.unidadTermino === 'Ambos') && (
                                <SelectItem value="Dias Habiles">Días Hábiles</SelectItem>
                            )}
                            {(!activeTipoProceso?.unidadTermino || activeTipoProceso.unidadTermino === 'dias' || activeTipoProceso.unidadTermino === 'Dias Calendario' || activeTipoProceso.unidadTermino === 'Ambos') && (
                                <SelectItem value="Dias Calendario">Días Calendario</SelectItem>
                            )}
                            {(activeTipoProceso?.unidadTermino === 'horas' || activeTipoProceso?.unidadTermino === 'Horas' || activeTipoProceso?.unidadTermino === 'Ambos') && (
                              <SelectItem value="Horas">Horas</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="termino" className="text-sm font-bold text-gray-700">
                          {formData.tipoPlazo === 'Horas' ? 'Término (Horas)' : 'Término (Días)'}
                        </Label>
                        <Input
                          id="termino"
                          type="number"
                          value={formData.termino === 0 ? '' : String(formData.termino)}
                          onChange={(e) => setFormData({ ...formData, termino: parseInt(e.target.value) || 0 })}
                          className="bg-white"
                          min="1"
                        />
                        <p className="text-xs text-gray-500">Por defecto cargado del tipo de proceso, pero puede ser editado</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fechaNotificacion" className="text-sm font-bold text-gray-700">
                          Fecha de Notificación <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="fechaNotificacion"
                          type="datetime-local"
                          value={formData.fechaNotificacion}
                          onChange={(e) => {
                            const normalizada = (activeTipoProceso?.unidadTermino?.toLowerCase() !== 'horas' && formData.tipoPlazo === 'Dias Habiles')
                              ? normalizarAHorarioHabil(e.target.value)
                              : e.target.value;
                            setFormData({ ...formData, fechaNotificacion: normalizada });
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fechaVencimiento" className="text-sm font-bold text-gray-700">
                          Fecha de Vencimiento (Calculada)
                        </Label>
                        <Input
                          id="fechaVencimiento"
                          type="datetime-local"
                          value={formData.fechaVencimiento}
                          disabled
                          className="bg-gray-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.tipoPlazo === 'Horas'
                            ? 'Se calcula exactamente sumando las horas a partir de la notificación.'
                            : formData.tipoPlazo === 'Dias Habiles'
                            ? 'Se calcula automáticamente (8:00 AM a 5:00 PM)'
                            : 'Se calcula exactamente desde la hora de notificación'}
                        </p>
                      </div>
                    </div>

                    {isFieldVisible('abogadoResponsable', true) && (
                      <div className="space-y-2">
                        <Label htmlFor="abogadoResponsable" className="text-sm font-bold text-gray-700">
                          Abogado Responsable {isFieldRequired('abogadoResponsable', false) ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal ml-1">(Opcional)</span>}
                        </Label>
                        <Select
                          value={formData.abogadoResponsable}
                          onValueChange={(value: string) => setFormData({ ...formData, abogadoResponsable: value })}
                        >
                          <SelectTrigger id="abogadoResponsable" className="bg-white">
                            <SelectValue placeholder="Seleccione abogado..." />
                          </SelectTrigger>
                          <SelectContent className="z-[100000]">
                            <SelectItem value="Sin asignar (Temporal)" className="text-gray-500 italic">Sin asignar (Temporal)</SelectItem>
                            {abogadosAPI.map(abog => (
                              <SelectItem key={abog.id} value={abog.id}>{abog.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.fechaVencimiento && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-blue-900 mb-1">Cálculo Automático de Vencimiento</h4>
                            <div className="text-xs text-blue-800 space-y-1">
                              {formData.tipoPlazo === 'Horas' ? (
                                <>
                                  <p>• Unidad de término: <strong>Horas</strong></p>
                                  <p>• Término: <strong>{formData.termino} horas</strong></p>
                                </>
                              ) : (
                                <>
                                  <p>• Tipo de plazo: <strong>{formData.tipoPlazo === 'Dias Habiles' ? 'Días Hábiles' : 'Días Calendario'}</strong></p>
                                  <p>• Término: <strong>{formData.termino} días</strong></p>
                                </>
                              )}
                              {formData.fechaNotificacion && (
                                <p>• Fecha de notificación: <strong>{formatFechaLocal(formData.fechaNotificacion)}</strong></p>
                              )}
                              {formData.fechaVencimiento && (
                                <p>• Fecha de vencimiento: <strong>{formatFechaLocal(formData.fechaVencimiento)}</strong></p>
                              )}
                              {formData.tipoPlazo !== 'Horas' && (
                                <p>• Vencimiento calculado a las: <strong>{activeTipoProceso?.horaEspecial || '17:00'}</strong></p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
                {renderCamposAdicionales(6)}
              </>
            )}

            {/* PASO 7: DETALLES DEL PROCESO */}
            {pasoActual === 7 && (
              <>
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <FileText className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900">Detalles del Proceso</h3>
                      <p className="text-sm text-gray-600">Aspectos jurídicos de la demanda</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {isFieldVisible('pretensiones', true) && (
                      <div className="space-y-2">
                        <Label htmlFor="pretensiones" className="text-sm font-bold text-gray-700">
                          Pretensiones {isFieldRequired('pretensiones', true) && <span className="text-red-500">*</span>}
                        </Label>
                        <Textarea
                          id="pretensiones"
                          placeholder="Descripción detallada de las pretensiones del demandante..."
                          value={formData.pretensiones}
                          onChange={(e) => setFormData({ ...formData, pretensiones: e.target.value })}
                          rows={6}
                          className="resize-none"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs font-bold ${formData.pretensiones.length < 20 ? 'text-gray-400' : 'text-green-600'
                            }`}>
                            {formData.pretensiones.length} caracteres {formData.pretensiones.length < 20 && '(mínimo 20)'}
                          </p>
                          {formData.pretensiones.length >= 20 && (
                            <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Pretensiones válidas
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {isFieldVisible('hechos', true) && (
                      <div className="space-y-2">
                        <Label htmlFor="hechos" className="text-sm font-bold text-gray-700">
                          Hechos {isFieldRequired('hechos', false) && <span className="text-red-500">*</span>}
                        </Label>
                        <Textarea
                          id="hechos"
                          placeholder="Descripción de los hechos que originaron la demanda..."
                          value={formData.hechos}
                          onChange={(e) => setFormData({ ...formData, hechos: e.target.value })}
                          rows={5}
                          className="resize-none"
                        />
                      </div>
                    )}

                    {isFieldVisible('observaciones', true) && (
                      <div className="space-y-2">
                        <Label htmlFor="observaciones" className="text-sm font-bold text-gray-700">Observaciones Adicionales</Label>
                        <Textarea
                          id="observaciones"
                          placeholder="Cualquier información adicional relevante..."
                          value={formData.observaciones}
                          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                    )}
                  </div>
                </Card>
                {renderCamposAdicionales(7)}
              </>
            )}
          </div>
        </div>

        {/* FOOTER - flex-shrink-0 (siempre visible) */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios
          </p>
          <div className="flex gap-3">
            {pasoActual > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={anterior}
                disabled={enviando}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={enviando}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>

            {pasoActual < totalPasos ? (
              <Button
                type="button"
                onClick={siguiente}
                disabled={enviando}
                style={{ background: '#2962FF', color: '#FFFFFF' }}
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={enviando}
                style={{ background: '#10b981', color: '#FFFFFF' }}
              >
                {enviando ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    {expedienteEdit ? 'Guardando...' : 'Registrando...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {expedienteEdit ? 'Guardar Cambios' : 'Registrar Demanda'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        </div> {/* Closing div for the scale transform container */}
      </DialogContent>
    </Dialog>

      {/* ==================== DIALOG DE CONFIRMACIÓN DE CANCELACIÓN ==================== */}
      {/* ==================== DIALOG DE CONFIRMACIÓN DE CANCELACIÓN ==================== */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent 
          hideCloseButton 
          className="p-0 overflow-hidden border-none shadow-2xl z-[10002] rounded-2xl mx-auto"
          style={{ width: '380px', maxWidth: '380px' }}
        >
          <div className="bg-white overflow-hidden w-full">
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-red-600"></div>
            
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mb-8 shadow-sm border border-red-100">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                ¿Cancelar edición?
              </h3>
              
              <p className="text-base text-gray-500 leading-relaxed mb-10 px-4">
                Se perderán todos los datos ingresados en el formulario.
              </p>

              <div className="flex flex-col w-full gap-4">
                <Button
                  onClick={handleConfirmCancel}
                  className="w-full py-8 !bg-red-600 hover:!bg-red-700 !text-white font-black rounded-2xl shadow-xl shadow-red-100 transition-all active:scale-[0.98] text-lg border-none"
                >
                  Sí, cancelar y salir
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full py-6 rounded-xl font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  No, continuar editando
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
);
}
