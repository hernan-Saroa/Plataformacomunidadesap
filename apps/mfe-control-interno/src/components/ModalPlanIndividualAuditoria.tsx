/**
 * MODAL PLAN INDIVIDUAL DE AUDITORÍA (PIA)
 * Formulario completo para gestionar el PIA de una auditoría
 */

import { useState } from 'react';
import {
  Target, Calendar, Users, FileText, CheckCircle2, Save, X,
  AlertCircle, Clock, TrendingUp, Layers, BookOpen, ClipboardList
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { toast } from 'sonner';

interface ModalPlanIndividualAuditoriaProps {
  auditoria: {
    codigo: string;
    nombre: string;
    tipo: string;
    territorial: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuardar: (datos: any) => void;
}

export function ModalPlanIndividualAuditoria({
  auditoria,
  open,
  onOpenChange,
  onGuardar
}: ModalPlanIndividualAuditoriaProps) {
  const [formData, setFormData] = useState({
    objetivoGeneral: 'Evaluar la eficacia y eficiencia de los procesos administrativos y operativos de la territorial',
    objetivosEspecificos: [
      'Verificar el cumplimiento de las normativas institucionales',
      'Evaluar la gestión de recursos humanos y financieros',
      'Identificar oportunidades de mejora en los procesos'
    ],
    alcance: 'La auditoría cubrirá todos los procesos misionales y de apoyo de la territorial, incluyendo gestión académica, administrativa y financiera del período 2024.',
    metodologia: 'La auditoría se realizará mediante entrevistas, revisión documental, análisis de indicadores y verificación de evidencias físicas y digitales.',
    criteriosAuditoria: [
      'Normas ISO 9001:2015',
      'Reglamento interno ESAP',
      'Normativa legal colombiana aplicable',
      'Mejores prácticas del sector público'
    ],
    equipoAuditor: [
      { nombre: 'María González', rol: 'Líder de Auditoría', cargo: 'Auditor Senior' },
      { nombre: 'Carlos Ramírez', rol: 'Auditor', cargo: 'Auditor Junior' },
      { nombre: 'Ana Martínez', rol: 'Especialista', cargo: 'Consultor TI' }
    ],
    cronograma: [
      { fase: 'Planeación', inicio: '2024-11-15', fin: '2024-11-30', responsable: 'María González' },
      { fase: 'Ejecución', inicio: '2024-12-01', fin: '2024-12-20', responsable: 'Carlos Ramírez' },
      { fase: 'Comunicación', inicio: '2024-12-21', fin: '2025-01-10', responsable: 'María González' }
    ],
    recursos: {
      humanos: '3 auditores tiempo completo',
      tecnologicos: 'Software de gestión de auditorías, acceso a sistemas institucionales',
      materiales: 'Equipos de cómputo, material de oficina',
      presupuesto: '$15.000.000 COP'
    },
    riesgos: [
      { descripcion: 'Resistencia al cambio', probabilidad: 'Media', impacto: 'Alto', mitigacion: 'Comunicación efectiva y socialización previa' },
      { descripcion: 'Información incompleta', probabilidad: 'Baja', impacto: 'Medio', mitigacion: 'Solicitudes formales con seguimiento' }
    ]
  });

  const [objetivoTemp, setObjetivoTemp] = useState('');
  const [criterioTemp, setCriterioTemp] = useState('');

  const handleGuardar = () => {
    onGuardar(formData);
    toast.success('Plan Individual de Auditoría guardado exitosamente');
  };

  const agregarObjetivoEspecifico = () => {
    if (objetivoTemp.trim()) {
      setFormData({
        ...formData,
        objetivosEspecificos: [...formData.objetivosEspecificos, objetivoTemp.trim()]
      });
      setObjetivoTemp('');
    }
  };

  const eliminarObjetivoEspecifico = (index: number) => {
    setFormData({
      ...formData,
      objetivosEspecificos: formData.objetivosEspecificos.filter((_, i) => i !== index)
    });
  };

  const agregarCriterio = () => {
    if (criterioTemp.trim()) {
      setFormData({
        ...formData,
        criteriosAuditoria: [...formData.criteriosAuditoria, criterioTemp.trim()]
      });
      setCriterioTemp('');
    }
  };

  const eliminarCriterio = (index: number) => {
    setFormData({
      ...formData,
      criteriosAuditoria: formData.criteriosAuditoria.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#EFF6FF' }}>
                <Target className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <DialogTitle>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-1 rounded" style={{ background: '#E0E7FF', color: '#3730A3' }}>
                      {auditoria.codigo}
                    </span>
                    <Badge style={{ background: '#003DA5', color: '#FFFFFF' }}>
                      Plan Individual
                    </Badge>
                  </div>
                  <h3 className="font-black text-xl" style={{ color: '#1F2937' }}>
                    Plan Individual de Auditoría (PIA)
                  </h3>
                </DialogTitle>
                <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                  {auditoria.nombre} - Territorial {auditoria.territorial}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="space-y-6">
            {/* 1. OBJETIVO GENERAL */}
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h4 className="font-black" style={{ color: '#1F2937' }}>1. Objetivo General</h4>
              </div>
              <textarea
                className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                style={{ borderColor: '#E5E7EB' }}
                rows={3}
                value={formData.objetivoGeneral}
                onChange={(e) => setFormData({ ...formData, objetivoGeneral: e.target.value })}
                placeholder="Describe el objetivo general de la auditoría..."
              />
            </div>

            {/* 2. OBJETIVOS ESPECÍFICOS */}
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h4 className="font-black" style={{ color: '#1F2937' }}>2. Objetivos Específicos</h4>
              </div>
              
              <div className="space-y-2 mb-3">
                {formData.objetivosEspecificos.map((objetivo, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#003DA5', color: '#FFFFFF' }}>
                      {index + 1}
                    </span>
                    <p className="flex-1 text-sm" style={{ color: '#1F2937' }}>{objetivo}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarObjetivoEspecifico(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" style={{ color: '#EF4444' }} />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="Nuevo objetivo específico..."
                  value={objetivoTemp}
                  onChange={(e) => setObjetivoTemp(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && agregarObjetivoEspecifico()}
                />
                <Button
                  size="sm"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  onClick={agregarObjetivoEspecifico}
                >
                  Agregar
                </Button>
              </div>
            </div>

            {/* 3. ALCANCE */}
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h4 className="font-black" style={{ color: '#1F2937' }}>3. Alcance</h4>
              </div>
              <textarea
                className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                style={{ borderColor: '#E5E7EB' }}
                rows={3}
                value={formData.alcance}
                onChange={(e) => setFormData({ ...formData, alcance: e.target.value })}
                placeholder="Define el alcance de la auditoría..."
              />
            </div>

            {/* 4. METODOLOGÍA */}
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h4 className="font-black" style={{ color: '#1F2937' }}>4. Metodología</h4>
              </div>
              <textarea
                className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                style={{ borderColor: '#E5E7EB' }}
                rows={3}
                value={formData.metodologia}
                onChange={(e) => setFormData({ ...formData, metodologia: e.target.value })}
                placeholder="Describe la metodología a utilizar..."
              />
            </div>

            {/* 5. CRITERIOS DE AUDITORÍA */}
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h4 className="font-black" style={{ color: '#1F2937' }}>5. Criterios de Auditoría</h4>
              </div>
              
              <div className="space-y-2 mb-3">
                {formData.criteriosAuditoria.map((criterio, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#10B981' }} />
                    <p className="flex-1 text-sm" style={{ color: '#1F2937' }}>{criterio}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarCriterio(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" style={{ color: '#EF4444' }} />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="Nuevo criterio de auditoría..."
                  value={criterioTemp}
                  onChange={(e) => setCriterioTemp(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && agregarCriterio()}
                />
                <Button
                  size="sm"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  onClick={agregarCriterio}
                >
                  Agregar
                </Button>
              </div>
            </div>

            {/* 6. EQUIPO AUDITOR */}
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h4 className="font-black" style={{ color: '#1F2937' }}>6. Equipo Auditor</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.equipoAuditor.map((miembro, index) => (
                  <div key={index} className="p-4 rounded-lg border-2" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                        <span className="font-black" style={{ color: '#003DA5' }}>
                          {miembro.nombre.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: '#1F2937' }}>{miembro.nombre}</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{miembro.rol}</p>
                        <Badge variant="outline" className="mt-1 text-xs">{miembro.cargo}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. CRONOGRAMA */}
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h4 className="font-black" style={{ color: '#1F2937' }}>7. Cronograma</h4>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: '#F9FAFB' }}>
                      <th className="px-4 py-3 text-left text-xs font-bold" style={{ color: '#6B7280' }}>FASE</th>
                      <th className="px-4 py-3 text-left text-xs font-bold" style={{ color: '#6B7280' }}>FECHA INICIO</th>
                      <th className="px-4 py-3 text-left text-xs font-bold" style={{ color: '#6B7280' }}>FECHA FIN</th>
                      <th className="px-4 py-3 text-left text-xs font-bold" style={{ color: '#6B7280' }}>RESPONSABLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.cronograma.map((item, index) => (
                      <tr key={index} className="border-t" style={{ borderColor: '#E5E7EB' }}>
                        <td className="px-4 py-3">
                          <span className="font-bold text-sm" style={{ color: '#1F2937' }}>{item.fase}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6B7280' }}>
                            {new Date(item.inicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6B7280' }}>
                            {new Date(item.fin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#6B7280' }}>{item.responsable}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 8. RECURSOS */}
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                <h4 className="font-black" style={{ color: '#1F2937' }}>8. Recursos Necesarios</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>Recursos Humanos</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                    value={formData.recursos.humanos}
                    onChange={(e) => setFormData({ ...formData, recursos: { ...formData.recursos, humanos: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>Recursos Tecnológicos</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                    value={formData.recursos.tecnologicos}
                    onChange={(e) => setFormData({ ...formData, recursos: { ...formData.recursos, tecnologicos: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>Recursos Materiales</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                    value={formData.recursos.materiales}
                    onChange={(e) => setFormData({ ...formData, recursos: { ...formData.recursos, materiales: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mb-2 block" style={{ color: '#6B7280' }}>Presupuesto</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-blue-500 transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                    value={formData.recursos.presupuesto}
                    onChange={(e) => setFormData({ ...formData, recursos: { ...formData.recursos, presupuesto: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            {/* 9. RIESGOS */}
            <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
                <h4 className="font-black" style={{ color: '#1F2937' }}>9. Riesgos Identificados</h4>
              </div>
              
              <div className="space-y-3">
                {formData.riesgos.map((riesgo, index) => (
                  <div key={index} className="p-4 rounded-lg border-2" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-sm flex-1" style={{ color: '#1F2937' }}>{riesgo.descripcion}</p>
                      <div className="flex gap-2">
                        <Badge style={{ background: '#FEF3C7', color: '#92400E' }}>
                          {riesgo.probabilidad}
                        </Badge>
                        <Badge style={{ background: '#FEE2E2', color: '#991B1B' }}>
                          Impacto: {riesgo.impacto}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 mt-2 p-2 rounded" style={{ background: '#F0FDF4' }}>
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                      <p className="text-xs" style={{ color: '#065F46' }}>
                        <span className="font-bold">Mitigación:</span> {riesgo.mitigacion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 flex gap-3" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <Button
            variant="outline"
            className="flex-1 border-2"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button
            className="flex-1"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
            onClick={handleGuardar}
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar PIA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
