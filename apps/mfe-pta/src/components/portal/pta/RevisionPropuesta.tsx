/**
 * VA02 — Revisión de Propuesta Institucional (Docente)
 * 
 * El docente puede:
 * - Ver componentes asignados por la Dirección (read-only)
 * - Completar Actividades Complementarias
 * - Aceptar, Proponer Modificaciones u Objetar la propuesta
 * - Justificar cambios solicitados
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, BookOpen, FlaskConical, Globe, Briefcase, CheckCircle2,
  AlertTriangle, Lock, Plus, Trash2, Send, Save, MessageSquare,
  Info, Clock, FileText
} from 'lucide-react';
import {
  getPTAById, responderPropuestaPTA, getCatalogoActividadesComplementarias,
} from '../../../services/api/ptaApi';
import { docentePtaAlert as toast } from './DocentePtaAlert';
import { useNotifications } from '../../esap/NotificationsContext';
import { HierarchySelectionSummary } from '../../pta/shared/HierarchySelectionSummary';

interface RevisionPropuestaProps {
  ptaId: string;
  onBack: () => void;
  userPersonId: string;
}

export function RevisionPropuesta({ ptaId, onBack, userPersonId }: RevisionPropuestaProps) {
  const [pta, setPta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actCompCatalogo, setActCompCatalogo] = useState<any[]>([]);
  const [complementarias, setComplementarias] = useState<any[]>([]);
  const [decision, setDecision] = useState<'ACEPTAR' | 'MODIFICAR' | 'OBJETAR' | ''>('');
  const [justificacion, setJustificacion] = useState('');
  const [obsDocencia, setObsDocencia] = useState('');
  const [obsInvestigacion, setObsInvestigacion] = useState('');
  const [obsExtension, setObsExtension] = useState('');
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    Promise.all([
      getPTAById(ptaId),
      getCatalogoActividadesComplementarias(),
    ]).then(([ptaRes, compRes]) => {
      if (ptaRes.success) {
        setPta(ptaRes.data);
        setComplementarias(ptaRes.data.complementarias || []);
      }
      if (compRes.success) setActCompCatalogo(compRes.data);
      setLoading(false);
    });
  }, [ptaId]);

  const propuesta = pta?.propuesta_direccion || {};
  const horasProgramables = pta?.horas_asignables ?? pta?.horas_a_programar ?? 0;
  const totalComp = complementarias.reduce((t: number, c: any) => t + (c.horas || 0), 0);
  const totalProgramado = (propuesta.total_precargado || 0) + totalComp;
  const pendiente = horasProgramables - totalProgramado;
  const isComplete = pendiente <= 0;

  const handleAddComplementaria = () => {
    if (complementarias.length >= 17) { toast.error('Máximo 17 actividades'); return; }
    setComplementarias(prev => [...prev, { id: Date.now(), actividad_id: '', nombre: '', horas: 0, descripcion: '' }]);
  };

  const handleCompChange = (id: number, field: string, value: any) => {
    setComplementarias(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      if (field === 'actividad_id') {
        const cat = actCompCatalogo.find(a => a.id === value);
        if (cat) { updated.nombre = cat.nombre; updated.horas = cat.horas; }
      }
      return updated;
    }));
  };

  const handleSubmit = async () => {
    if (!decision) { toast.error('Seleccione una decisión'); return; }
    if (decision !== 'ACEPTAR' && !justificacion.trim()) { toast.error('Debe incluir una justificación'); return; }
    setSaving(true);

    const res = await responderPropuestaPTA(ptaId, {
      decision,
      justificacion,
      observaciones_docencia: obsDocencia,
      observaciones_investigacion: obsInvestigacion,
      observaciones_extension: obsExtension,
      complementarias,
    });

    setSaving(false);
    if (res.success) {
      const labels = { ACEPTAR: 'aceptada', MODIFICAR: 'con modificaciones propuestas', OBJETAR: 'objetada' };
      toast.success(`Propuesta ${labels[decision]}`);
      addNotification({
        type: 'info',
        title: 'Respuesta enviada',
        message: `Tu respuesta a la propuesta institucional ha sido enviada. Estado: EN CONCERTACIÓN.`,
      });
      onBack();
    } else {
      toast.error('Error al enviar respuesta');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-9 h-9 border-3 border-gray-200 border-t-[#003DA5] rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: 3 }} />
        <p className="text-sm text-gray-500">Cargando propuesta...</p>
      </div>
    );
  }

  if (!pta) return <p className="text-center text-gray-500 py-10">PTA no encontrado</p>;

  const canRespond = ['NOTIFICADO_DOCENTE', 'PROPUESTO_POR_DIRECCION'].includes(pta.estado);

  return (
    <div className="mx-auto">
      {/* Header */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 font-medium mb-2 bg-transparent border-none cursor-pointer p-0 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" /> Volver a mis PTAs
      </button>
      <h1 className="text-xl font-extrabold text-gray-900 m-0">Propuesta Institucional</h1>
      <p className="text-sm text-gray-500 mt-1 mb-5">Periodo {pta.periodo} • {pta.dedicacion}</p>

      {/* Notification banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-blue-900 text-sm">
            {pta.creado_por || 'La Dirección Territorial'} le ha asignado carga académica
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Fecha de notificación: {pta.fecha_notificacion ? new Date(pta.fecha_notificacion).toLocaleDateString('es-CO') : '—'} •
            Fecha límite: {pta.fecha_limite_respuesta ? new Date(pta.fecha_limite_respuesta).toLocaleDateString('es-CO') : '5 días'}
          </p>
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900">Resumen de Propuesta</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left px-4 py-2 font-semibold">Componente</th>
                <th className="text-center px-4 py-2 font-semibold">Horas</th>
                <th className="text-center px-4 py-2 font-semibold">%</th>
                <th className="text-left px-4 py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              <SummaryRow icon={BookOpen} label="Docencia" hours={propuesta.horas_docencia || 0} total={horasProgramables} status="Asignado por Dirección" locked />
              <SummaryRow icon={FlaskConical} label="Investigación" hours={propuesta.horas_investigacion || 0} total={horasProgramables} status={propuesta.horas_investigacion > 0 ? "Asignado por SNI" : "Sin asignación"} locked={propuesta.horas_investigacion > 0} />
              <SummaryRow icon={Globe} label="Extensión" hours={propuesta.horas_extension || 0} total={horasProgramables} status={propuesta.horas_extension > 0 ? "Asignado" : "Sin asignación"} locked={propuesta.horas_extension > 0} />
              <SummaryRow icon={Briefcase} label="Complementarias" hours={totalComp} total={horasProgramables} status={totalComp > 0 ? `${complementarias.length} actividades` : "Pendiente"} warning={totalComp === 0} />
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-4 py-2 font-bold text-gray-900">Total Pre-cargado</td>
                <td className="text-center px-4 py-2 font-bold text-[#003DA5]">{propuesta.total_precargado || 0}h</td>
                <td className="text-center px-4 py-2 font-bold text-[#003DA5]">{propuesta.porcentaje_precargado || 0}%</td>
                <td className="px-4 py-2" />
              </tr>
              <tr className="bg-amber-50">
                <td className="px-4 py-2 font-bold text-amber-800">Pendiente (Complementarias)</td>
                <td className="text-center px-4 py-2 font-bold text-amber-700">{pendiente}h</td>
                <td className="text-center px-4 py-2 font-bold text-amber-700">{((pendiente / horasProgramables) * 100).toFixed(0)}%</td>
                <td className="px-4 py-2"><span className="text-xs text-amber-600">Por completar</span></td>
              </tr>
              <tr className="bg-gray-100">
                <td className="px-4 py-2 font-extrabold text-gray-900">Total PTA</td>
                <td className="text-center px-4 py-2 font-extrabold text-gray-900">{totalProgramado}h</td>
                <td className="text-center px-4 py-2 font-extrabold">{((totalProgramado / horasProgramables) * 100).toFixed(0)}%</td>
                <td className="px-4 py-2">{isComplete && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completo</span>}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Docencia detail (read-only) */}
      <DetailSection title="Detalle Docencia" subtitle="Asignado por Dirección" icon={BookOpen} color="#003DA5" locked>
        {(pta.asignaturas || []).length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">Sin asignaturas asignadas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left px-3 py-1.5">#</th><th className="text-left px-3 py-1.5">Asignatura</th><th className="text-left px-3 py-1.5">Programa</th><th className="text-center px-3 py-1.5">Créd</th><th className="text-center px-3 py-1.5">Horas</th>
              </tr></thead>
              <tbody>{(pta.asignaturas || []).map((a: any, i: number) => (
                <tr key={a.id || i} className="border-b border-gray-50">
                  <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-gray-900">
                    {a.asignatura_nombre || a.nombre}
                    <HierarchySelectionSummary activity={a} accent="#003DA5" compact className="mt-1.5" />
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">{a.programa_nombre || ''}</td>
                  <td className="px-3 py-1.5 text-center">{a.creditos}</td>
                  <td className="px-3 py-1.5 text-center font-bold text-[#003DA5]">{a.total_horas}h</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {canRespond && (
          <div className="px-3 py-3 bg-gray-50 border-t border-gray-100">
            <label className="block text-[0.68rem] font-semibold text-gray-500 mb-1">¿Observaciones sobre la asignación de docencia?</label>
            <textarea value={obsDocencia} onChange={e => setObsDocencia(e.target.value)} rows={2}
              placeholder="Opcional: indique si tiene alguna observación..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs outline-none resize-none" />
          </div>
        )}
      </DetailSection>

      {/* Investigación detail (read-only if assigned) */}
      {(pta.investigacion_proyecto?.nombre || pta.investigacion_proyecto?.rol) && (
        <DetailSection title="Detalle Investigación" subtitle="Asignado por SNI" icon={FlaskConical} color="#7C3AED" locked>
          <div className="p-3 text-xs space-y-1">
            <div><span className="text-gray-500">Proyecto:</span> <span className="font-medium text-gray-900">{pta.investigacion_proyecto.nombre || 'Proyecto de Investigación (Pendiente Registro)'}</span></div>
            <div><span className="text-gray-500">Rol:</span> <span className="font-medium text-gray-900">{pta.investigacion_proyecto.rol}</span></div>
            <div><span className="text-gray-500">Horas:</span> <span className="font-bold text-purple-700">{pta.investigacion_proyecto.horas_solicitadas}h</span></div>
            <HierarchySelectionSummary activity={pta.investigacion_proyecto} accent="#7C3AED" compact className="mt-2" />
            {(pta.investigacion_actividades || []).map((actividad: any, index: number) => (
              <div key={actividad.id || actividad.actividad_id || index} className="mt-2 rounded-lg border border-purple-100 bg-purple-50/40 p-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-900">{actividad.nombre || actividad.actividad_nombre || 'Actividad de investigación'}</span>
                  <span className="shrink-0 font-bold text-purple-700">{actividad.horas_total ?? actividad.horas ?? 0}h</span>
                </div>
                {actividad.descripcion && <div className="mt-1 text-[0.68rem] text-gray-500">{actividad.descripcion}</div>}
                <HierarchySelectionSummary activity={actividad} accent="#7C3AED" compact className="mt-2" />
              </div>
            ))}
          </div>
          {canRespond && (
            <div className="px-3 py-3 bg-gray-50 border-t border-gray-100">
              <label className="block text-[0.68rem] font-semibold text-gray-500 mb-1">¿Observaciones sobre investigación?</label>
              <textarea value={obsInvestigacion} onChange={e => setObsInvestigacion(e.target.value)} rows={2} placeholder="Opcional..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs outline-none resize-none" />
            </div>
          )}
        </DetailSection>
      )}

      {/* Extensión detail (read-only) */}
      {(pta.extension_actividades || []).length > 0 && (
        <DetailSection title="Detalle Extensión" subtitle="Actividades asignadas" icon={Globe} color="#059669" locked>
          <div className="space-y-2 p-3">
            {(pta.extension_actividades || []).map((actividad: any, index: number) => (
              <div key={actividad.id || actividad.actividad_id || index} className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5">
                <div className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">{actividad.nombre || actividad.actividad_nombre || 'Actividad de extensión'}</div>
                    {actividad.seccion && <div className="mt-0.5 text-[0.65rem] text-gray-500">{actividad.seccion}</div>}
                  </div>
                  <span className="shrink-0 font-bold text-emerald-700">{actividad.horas ?? actividad.horas_ejecutadas ?? 0}h</span>
                </div>
                <HierarchySelectionSummary activity={actividad} accent="#059669" compact className="mt-2" />
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* Complementarias (editable by docente) */}
      <DetailSection title="Actividades Complementarias" subtitle={`${pendiente}h pendientes por completar`} icon={Briefcase} color="#D97706"
        action={canRespond && complementarias.length < 17 ? { label: 'Agregar Actividad', onClick: handleAddComplementaria } : undefined}>
        {complementarias.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Briefcase className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">Debe completar las horas restantes</p>
            <p className="text-[0.65rem] mt-0.5">Seleccione del catálogo de 52 actividades predefinidas</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {complementarias.map((comp: any) => (
              <div key={comp.id} className="flex flex-col sm:flex-row gap-2 p-2.5 rounded-lg border border-gray-200 bg-gray-50/50 relative">
                {canRespond && (
                  <button onClick={() => setComplementarias(prev => prev.filter(c => c.id !== comp.id))}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded border border-gray-200 bg-white text-gray-400 cursor-pointer flex items-center justify-center hover:text-red-500 text-xs">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <div className="flex-1 pr-6">
                  <label className="block text-[0.65rem] font-semibold text-gray-500 mb-0.5">Actividad</label>
                  <select value={comp.actividad_id} disabled={!canRespond}
                    onChange={e => handleCompChange(comp.id, 'actividad_id', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-md border border-gray-300 text-xs bg-white disabled:bg-gray-100">
                    <option value="">Seleccionar...</option>
                    {actCompCatalogo.map(a => <option key={a.id} value={a.id}>{a.nombre} ({a.horas}h)</option>)}
                  </select>
                  <HierarchySelectionSummary activity={comp} accent="#D97706" compact className="mt-2" />
                </div>
                <div className="w-20">
                  <label className="block text-[0.65rem] font-semibold text-gray-500 mb-0.5">Horas</label>
                  <div className="px-2 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700 text-center">{comp.horas}h</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Decision section */}
      {canRespond && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mt-5 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-900">Mi Decisión</h3>
          </div>
          <div className="p-4 space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
              style={{ borderColor: decision === 'ACEPTAR' ? '#059669' : '#E5E7EB', background: decision === 'ACEPTAR' ? '#F0FDF4' : 'white' }}>
              <input type="radio" name="decision" value="ACEPTAR" checked={decision === 'ACEPTAR'} onChange={() => setDecision('ACEPTAR')} className="mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600" /> Acepto la propuesta institucional</div>
                <p className="text-xs text-gray-500 mt-0.5">Estoy de acuerdo con la carga asignada tal como está.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
              style={{ borderColor: decision === 'MODIFICAR' ? '#D97706' : '#E5E7EB', background: decision === 'MODIFICAR' ? '#FFFBEB' : 'white' }}>
              <input type="radio" name="decision" value="MODIFICAR" checked={decision === 'MODIFICAR'} onChange={() => setDecision('MODIFICAR')} className="mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-amber-600" /> Propongo modificaciones</div>
                <p className="text-xs text-gray-500 mt-0.5">Sugiero ajustes en la distribución de horas.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
              style={{ borderColor: decision === 'OBJETAR' ? '#DC2626' : '#E5E7EB', background: decision === 'OBJETAR' ? '#FEF2F2' : 'white' }}>
              <input type="radio" name="decision" value="OBJETAR" checked={decision === 'OBJETAR'} onChange={() => setDecision('OBJETAR')} className="mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-red-600" /> Objeto la propuesta</div>
                <p className="text-xs text-gray-500 mt-0.5">Requiere concertación presencial. Debe justificar.</p>
              </div>
            </label>

            {(decision === 'MODIFICAR' || decision === 'OBJETAR') && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Justificación {decision === 'OBJETAR' ? '(obligatoria)' : ''}
                </label>
                <textarea value={justificacion} onChange={e => setJustificacion(e.target.value)} rows={3}
                  placeholder="Explique los cambios solicitados o motivos de objeción..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm outline-none resize-none" />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button onClick={() => { /* save draft */ toast.success('Borrador guardado'); }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 cursor-pointer">
                <Save className="w-4 h-4" /> Guardar Borrador
              </button>
              <button onClick={handleSubmit} disabled={saving || !decision}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-none text-white text-sm font-semibold shadow-md disabled:opacity-50 cursor-pointer"
                style={{ background: '#003DA5' }}>
                <Send className="w-4 h-4" /> Enviar Respuesta a Dirección
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Already responded */}
      {!canRespond && pta.respuesta_docente && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold text-green-800">Respuesta enviada</span>
          </div>
          <p className="text-xs text-green-700">
            Decisión: {pta.respuesta_docente.decision} •
            Fecha: {pta.respuesta_docente.fecha_respuesta ? new Date(pta.respuesta_docente.fecha_respuesta).toLocaleDateString('es-CO') : '—'}
          </p>
          {pta.respuesta_docente.justificacion && (
            <p className="text-xs text-green-700 mt-1">Justificación: {pta.respuesta_docente.justificacion}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Helper components

function DetailSection({ title, subtitle, icon: Icon, color, locked, children, action }: {
  title: string; subtitle: string; icon: any; color: string; locked?: boolean; children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Icon className="w-4 h-4" style={{ color }} /> {title}
            {locked && <Lock className="w-3 h-3 text-gray-400" />}
          </h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        {action && (
          <button onClick={action.onClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-none text-white text-xs font-semibold cursor-pointer"
            style={{ background: color }}>
            <Plus className="w-3 h-3" /> {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ icon: Icon, label, hours, total, status, locked, warning }: {
  icon: any; label: string; hours: number; total: number; status: string; locked?: boolean; warning?: boolean;
}) {
  const pct = total > 0 ? ((hours / total) * 100).toFixed(1) : '0.0';
  return (
    <tr className="border-b border-gray-50">
      <td className="px-4 py-2 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-sm text-gray-900">{label}</span>
      </td>
      <td className="text-center px-4 py-2 font-semibold">{hours}h</td>
      <td className="text-center px-4 py-2 text-gray-500">{pct}%</td>
      <td className="px-4 py-2">
        <span className={`text-xs flex items-center gap-1 ${locked ? 'text-blue-600' : warning ? 'text-amber-600' : 'text-gray-500'}`}>
          {locked && <Lock className="w-3 h-3" />}
          {warning && <AlertTriangle className="w-3 h-3" />}
          {status}
        </span>
      </td>
    </tr>
  );
}
