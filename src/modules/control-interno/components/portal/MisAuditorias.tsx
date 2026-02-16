import React from 'react';
import { ClipboardCheck, Upload, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

/**
 * Componente "Mis Auditorías" para JEFES DE ÁREA
 * 
 * Vista personal de auditorías donde el área del usuario está siendo auditada.
 * Solo muestra auditorías relacionadas con el área del usuario.
 */
export function MisAuditorias() {
  // TODO: Cargar auditorías del área del usuario desde API
  // const { data: auditorias, isLoading } = useAuditoriasArea(userAreaId);

  // Mock data
  const auditorias = [
    {
      id: 'AUD-2024-001',
      titulo: 'Auditoría de Gestión Documental',
      tipo: 'Proceso',
      estado: 'EN_EJECUCION',
      fechaInicio: '2024-01-15',
      evidenciasPendientes: 3,
      plazoEvidencias: '2024-02-15'
    },
    {
      id: 'AUD-2024-005',
      titulo: 'Auditoría de Calidad Académica',
      tipo: 'Calidad',
      estado: 'PLANEACION',
      fechaInicio: '2024-02-01',
      evidenciasPendientes: 0,
      plazoEvidencias: null
    }
  ];

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PLANEACION':
        return {
          color: 'bg-blue-100 text-blue-800',
          icono: <Clock className="w-3 h-3" />,
          texto: 'En Planeación'
        };
      case 'EN_EJECUCION':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icono: <AlertCircle className="w-3 h-3" />,
          texto: 'En Ejecución'
        };
      case 'FINALIZADA':
        return {
          color: 'bg-green-100 text-green-800',
          icono: <CheckCircle2 className="w-3 h-3" />,
          texto: 'Finalizada'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icono: <Clock className="w-3 h-3" />,
          texto: estado
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0EDFF] via-white to-[#FFF8E1]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#F57C00] to-[#FF9800] text-white px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-light">Mis Auditorías</h1>
              <p className="text-white/80 text-sm">
                Auditorías en curso para mi área
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Auditorías Activas</span>
              <ClipboardCheck className="w-5 h-5 text-[#F57C00]" />
            </div>
            <div className="text-3xl font-light text-[#003DA5]">
              {auditorias.filter(a => a.estado === 'EN_EJECUCION').length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Evidencias Pendientes</span>
              <Upload className="w-5 h-5 text-[#2962FF]" />
            </div>
            <div className="text-3xl font-light text-[#003DA5]">
              {auditorias.reduce((acc, a) => acc + a.evidenciasPendientes, 0)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Auditorías</span>
              <FileText className="w-5 h-5 text-[#003DA5]" />
            </div>
            <div className="text-3xl font-light text-[#003DA5]">
              {auditorias.length}
            </div>
          </div>
        </div>

        {/* Lista de Auditorías */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-[#003DA5] mb-4">
            Auditorías en Curso
          </h2>

          {auditorias.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-[#E0EDFF] rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="w-8 h-8 text-[#2962FF]" />
              </div>
              <h3 className="text-lg text-gray-600 mb-2">
                No hay auditorías activas
              </h3>
              <p className="text-sm text-gray-500">
                Actualmente no hay auditorías programadas para tu área.
              </p>
            </div>
          ) : (
            auditorias.map((auditoria) => {
              const estadoBadge = getEstadoBadge(auditoria.estado);

              return (
                <div
                  key={auditoria.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Barra de color */}
                  <div className="h-1 w-full bg-gradient-to-r from-[#F57C00] to-[#FF9800]" />

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-[#003DA5]">
                            {auditoria.titulo}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${estadoBadge.color}`}>
                            {estadoBadge.icono}
                            {estadoBadge.texto}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>ID: {auditoria.id}</span>
                          <span>•</span>
                          <span>Tipo: {auditoria.tipo}</span>
                          <span>•</span>
                          <span>Inicio: {new Date(auditoria.fechaInicio).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Alertas de Evidencias Pendientes */}
                    {auditoria.evidenciasPendientes > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-900 mb-1">
                              {auditoria.evidenciasPendientes} evidencia(s) pendiente(s)
                            </p>
                            <p className="text-xs text-yellow-700">
                              Plazo: {auditoria.plazoEvidencias ? new Date(auditoria.plazoEvidencias).toLocaleDateString() : 'Por definir'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => window.location.href = `/portal/auditorias/${auditoria.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#E0EDFF] text-[#003DA5] rounded-lg hover:bg-[#2962FF] hover:text-white transition-colors text-sm font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        Ver Detalles
                      </button>

                      {auditoria.evidenciasPendientes > 0 && (
                        <button
                          onClick={() => window.location.href = `/portal/evidencias/${auditoria.id}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#F57C00] text-white rounded-lg hover:bg-[#E65100] transition-colors text-sm font-medium"
                        >
                          <Upload className="w-4 h-4" />
                          Cargar Evidencias ({auditoria.evidenciasPendientes})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Información de Ayuda */}
        <div className="mt-8 bg-gradient-to-r from-[#E0EDFF] to-[#FFF8E1] rounded-xl p-6 border border-[#2962FF]/20">
          <h3 className="text-sm font-medium text-[#003DA5] mb-3">
            ¿Necesitas ayuda?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Si tienes dudas sobre las auditorías o necesitas asistencia para cargar evidencias, 
            puedes contactar al equipo de Control Interno.
          </p>
          <button className="px-4 py-2 bg-[#2962FF] text-white rounded-lg hover:bg-[#003DA5] transition-colors text-sm">
            Contactar Soporte
          </button>
        </div>
      </div>
    </div>
  );
}
