import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PTA_COLORS } from '../../pta/shared/ptaColors';

interface PTAResumenPrintProps {
  pta: any;
  onClose: () => void;
  userPersonId: string;
}

export function PTAResumenPrint({ pta, onClose, userPersonId }: PTAResumenPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm print:p-0 print:bg-white print:static print:block">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col print:shadow-none print:max-h-none print:overflow-visible print:w-full"
        >
          {/* Header no-imprimible */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 print:hidden">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Vista Previa - Resumen Individual PTA</h2>
              <p className="text-sm text-gray-500">Documento oficial generado por el sistema.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrint}
                className="inline-flex items-center gap-2 bg-[#003DA5] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-sm font-medium text-sm"
              >
                <Printer className="w-4 h-4" /> Imprimir / PDF
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenido imprimible */}
          <div className="p-8 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible text-gray-900">
            {/* Membrete Documento Oficial */}
            <div className="border-b-2 border-[#003DA5] pb-4 mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold text-[#003DA5]">ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</h1>
                <h2 className="text-lg font-semibold mt-1">PLAN DE TRABAJO ACADÉMICO (PTA)</h2>
                <p className="text-sm text-gray-600 mt-2">Documento Generado: {today}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold bg-gray-100 px-3 py-1 rounded">Periodo: {pta?.periodo || '2025-2'}</p>
                <p className="text-xs text-gray-500 mt-2">ID Sistema: {pta?.id?.substring(0,8) || 'DOC-001'}</p>
              </div>
            </div>

            {/* Datos del Docente */}
            <div className="mb-8">
              <h3 className="text-base font-bold bg-gray-100 p-2 border-l-4 mb-4" style={{ borderLeftColor: '#003DA5' }}>1. INFORMACIÓN DEL DOCENTE</h3>
              <div className="grid grid-cols-2 gap-4 text-sm border border-gray-200 p-4 rounded-lg">
                <div>
                  <p className="text-gray-500">Identificación (ID)</p>
                  <p className="font-semibold">{userPersonId}</p>
                </div>
                <div>
                  <p className="text-gray-500">Tipo de Vinculación / Dedicación</p>
                  <p className="font-semibold">{pta?.dedicacion || 'Tiempo Completo'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Estado del Documento</p>
                  <p className="font-semibold">{pta?.estado || 'Borrador'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Horas Totales Programadas</p>
                  <p className="font-semibold">{pta?.horas_docencia_calculadas || pta?.horas_a_programar || 0} hrs</p>
                </div>
              </div>
            </div>

            {/* Componente Docencia */}
            <div className="mb-8">
              <h3 className="text-base font-bold bg-gray-100 p-2 border-l-4 mb-4" style={{ borderLeftColor: PTA_COLORS.DOCENCIA }}>2. DOCENCIA DIRECTA</h3>
              <table className="w-full text-sm border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left">Asignatura</th>
                    <th className="border border-gray-200 p-2 text-left">Programa</th>
                    <th className="border border-gray-200 p-2 text-center">Créditos</th>
                    <th className="border border-gray-200 p-2 text-center">Hrs/Sem</th>
                    <th className="border border-gray-200 p-2 text-center">Total Hrs</th>
                  </tr>
                </thead>
                <tbody>
                    {pta?.asignaturas && pta.asignaturas.length > 0 ? (
                      pta.asignaturas.map((asig: any, idx: number) => {
                        const totalHoras = asig.total_horas !== undefined ? asig.total_horas : (Number(asig.horas_directas_semana || 0) * Number(asig.semanas || 16));
                        return (
                          <tr key={idx}>
                            <td className="border border-gray-200 p-2">{asig.nombre || asig.asignatura_nombre || 'Asignatura'}</td>
                            <td className="border border-gray-200 p-2">{asig.programa || 'Programa'}</td>
                            <td className="border border-gray-200 p-2 text-center">{asig.creditos || '-'}</td>
                            <td className="border border-gray-200 p-2 text-center">{asig.horas_directas_semana || (totalHoras / 16).toFixed(1)}</td>
                            <td className="border border-gray-200 p-2 text-center font-semibold">
                              {totalHoras}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                    <tr>
                      <td colSpan={5} className="border border-gray-200 p-4 text-center text-gray-500">
                        No se registraron asignaturas en este componente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Componente Investigación (Si existe) */}
            {(() => {
              const inv = pta?.investigacion || {};
              const proyectos = inv.proyectos || [];
              const actividades = inv.actividades || [];
              const hasData = proyectos.length > 0 || actividades.length > 0;
              if (!hasData) return null;
              return (
                <div className="mb-8">
                  <h3 className="text-base font-bold bg-gray-100 p-2 border-l-4 mb-4" style={{ borderLeftColor: PTA_COLORS.INVESTIGACION }}>3. INVESTIGACIÓN</h3>
                  <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-2 text-left">Proyecto / Actividad</th>
                        <th className="border border-gray-200 p-2 text-left">Rol / Tipo</th>
                        <th className="border border-gray-200 p-2 text-center">Hrs/Sem</th>
                        <th className="border border-gray-200 p-2 text-center">Total Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proyectos.map((p: any, idx: number) => {
                        const totalH = p.horas_solicitadas || (Number(p.horas_semana || 0) * Number(p.semanas || 16));
                        return (
                          <tr key={`p-${idx}`}>
                            <td className="border border-gray-200 p-2">{p.nombre_proyecto || p.nombre || 'Proyecto'}</td>
                            <td className="border border-gray-200 p-2">{p.rol || 'Investigador'}</td>
                            <td className="border border-gray-200 p-2 text-center">{p.horas_semana || (totalH / 16).toFixed(1)}</td>
                            <td className="border border-gray-200 p-2 text-center font-semibold">{totalH}</td>
                          </tr>
                        );
                      })}
                      {actividades.map((a: any, idx: number) => {
                        const totalH = a.horas_total || a.horas || 0;
                        return (
                          <tr key={`a-${idx}`}>
                            <td className="border border-gray-200 p-2">{a.nombre || a.actividad || 'Actividad'}</td>
                            <td className="border border-gray-200 p-2">{a.tipo || 'Actividad Investigativa'}</td>
                            <td className="border border-gray-200 p-2 text-center">{(totalH / 16).toFixed(1)}</td>
                            <td className="border border-gray-200 p-2 text-center font-semibold">{totalH}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Componente Extensión (Si existe) */}
            {(() => {
              const ext = pta?.extension || {};
              const sectionsExt = ['asesoria', 'consultoria', 'capacitacion', 'comunidad'];
              const allExtActs: any[] = [];
              sectionsExt.forEach(sec => {
                (ext[sec] || []).forEach((a: any) => allExtActs.push({ ...a, seccion: sec }));
              });
              if (allExtActs.length === 0) return null;
              return (
                <div className="mb-8">
                  <h3 className="text-base font-bold bg-gray-100 p-2 border-l-4 mb-4" style={{ borderLeftColor: PTA_COLORS.EXTENSION }}>4. EXTENSIÓN ACADÉMICA</h3>
                  <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-2 text-left">Actividad</th>
                        <th className="border border-gray-200 p-2 text-left">Tipo</th>
                        <th className="border border-gray-200 p-2 text-center">Hrs/Sem</th>
                        <th className="border border-gray-200 p-2 text-center">Total Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allExtActs.map((a: any, idx: number) => {
                        const totalH = a.horas || 0;
                        return (
                          <tr key={idx}>
                            <td className="border border-gray-200 p-2">{a.nombre_actividad || a.actividad_nombre || a.actividad || 'Actividad'}</td>
                            <td className="border border-gray-200 p-2 capitalize">{a.seccion || 'Extensión'}</td>
                            <td className="border border-gray-200 p-2 text-center">{(totalH / 16).toFixed(1)}</td>
                            <td className="border border-gray-200 p-2 text-center font-semibold">{totalH}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Componente Complementarias */}
            {(() => {
              const comp = pta?.complementarias || {};
              const acts = comp.actividades || [];
              if (acts.length === 0) return null;
              return (
                <div className="mb-8">
                  <h3 className="text-base font-bold bg-gray-100 p-2 border-l-4 mb-4" style={{ borderLeftColor: PTA_COLORS.COMPLEMENTARIAS }}>5. ACTIVIDADES COMPLEMENTARIAS</h3>
                  <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-2 text-left">Actividad</th>
                        <th className="border border-gray-200 p-2 text-left">Categoría</th>
                        <th className="border border-gray-200 p-2 text-center">Hrs/Sem</th>
                        <th className="border border-gray-200 p-2 text-center">Total Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acts.map((a: any, idx: number) => {
                        const totalH = a.horas || 0;
                        return (
                          <tr key={idx}>
                            <td className="border border-gray-200 p-2">{a.nombre || a.actividad || 'Actividad'}</td>
                            <td className="border border-gray-200 p-2">{a.categoria || a.tipo || 'Complementaria'}</td>
                            <td className="border border-gray-200 p-2 text-center">{(totalH / 16).toFixed(1)}</td>
                            <td className="border border-gray-200 p-2 text-center font-semibold">{totalH}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Componente Académico-Administrativo */}
            {(() => {
              const acadAdmin = pta?.acad_admin || pta?.academico_administrativo || {};
              const acts = acadAdmin.actividades || [];
              if (acts.length === 0) return null;
              return (
                <div className="mb-8">
                  <h3 className="text-base font-bold bg-gray-100 p-2 border-l-4 mb-4" style={{ borderLeftColor: PTA_COLORS.ACAD_ADMIN }}>6. ACADÉMICO-ADMINISTRATIVAS</h3>
                  <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-2 text-left">Actividad</th>
                        <th className="border border-gray-200 p-2 text-left">Categoría</th>
                        <th className="border border-gray-200 p-2 text-center">Hrs/Sem</th>
                        <th className="border border-gray-200 p-2 text-center">Total Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acts.map((a: any, idx: number) => {
                        const totalH = a.horas || 0;
                        return (
                          <tr key={idx}>
                            <td className="border border-gray-200 p-2">{a.nombre || a.actividad || 'Actividad'}</td>
                            <td className="border border-gray-200 p-2">{a.categoria || a.tipo || 'Académico-Administrativa'}</td>
                            <td className="border border-gray-200 p-2 text-center">{(totalH / 16).toFixed(1)}</td>
                            <td className="border border-gray-200 p-2 text-center font-semibold">{totalH}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Firmas y Sellos */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
                  <p className="font-semibold text-sm">Firma del Docente</p>
                  <p className="text-xs text-gray-500">ID: {userPersonId}</p>
                </div>
                <div className="text-center">
                  {pta?.estado === 'Aprobado' ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 text-emerald-600 mb-1">
                        <ShieldCheck className="w-5 h-5" /> 
                        <span className="font-bold text-sm">Aprobado Electrónicamente</span>
                      </div>
                      <div className="border-b border-emerald-600 w-48 mx-auto mb-2 opacity-50"></div>
                      <p className="font-semibold text-sm">{pta?.aprobador_nombre || 'Jefatura de Programa'}</p>
                      <p className="text-xs text-gray-500">Aprobador Oficial ESAP</p>
                    </div>
                  ) : (
                    <div>
                      <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
                      <p className="font-semibold text-sm">Firma Aprobador</p>
                      <p className="text-xs text-gray-500">Pendiente de Aprobación</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 text-center text-xs text-gray-400">
                <p>Este documento es generado automáticamente por el Sistema Integrado ESAP.</p>
                <p>Cualquier alteración invalida su contenido.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
