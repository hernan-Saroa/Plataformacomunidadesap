/**
 * ============================================
 * CALENDARIO DE INFORMES DE LEY
 * ============================================
 * 
 * Visualización interactiva del cronograma anual
 * de informes obligatorios de la OCIG
 * 
 * CARACTERÍSTICAS:
 * - Vista mensual con alertas
 * - Filtrado por periodicidad
 * - Alertas de próximos vencimientos
 * - Búsqueda de informes
 * - Exportación a PDF
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Filter,
  Download,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { 
  INFORMES_DE_LEY_OFICIALES,
  obtenerInformesPorPeriodicidad,
  obtenerProximosInformes,
  obtenerEstadisticasInformes,
  buscarInformePorNombre,
  type InformeDeLey
} from '../constants/informesDeLeyOficiales';

interface CalendarioInformesLeyProps {
  onVolverADashboard?: () => void;
}

/**
 * ============================================
 * COMPONENTE PRINCIPAL
 * ============================================
 */
export function CalendarioInformesLey({ onVolverADashboard }: CalendarioInformesLeyProps) {
  
  // ============================================
  // ESTADO
  // ============================================
  const [filtroPeriodicidad, setFiltroPeriodicidad] = useState<string>('Todos');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [informeSeleccionado, setInformeSeleccionado] = useState<InformeDeLey | null>(null);
  
  // ============================================
  // DATOS CALCULADOS
  // ============================================
  const estadisticas = useMemo(() => obtenerEstadisticasInformes(), []);
  const proximosInformes = useMemo(() => obtenerProximosInformes(), []);
  
  const informesFiltrados = useMemo(() => {
    let informes = INFORMES_DE_LEY_OFICIALES;
    
    // Filtro por periodicidad
    if (filtroPeriodicidad !== 'Todos') {
      informes = obtenerInformesPorPeriodicidad(filtroPeriodicidad as InformeDeLey['periodicidad']);
    }
    
    // Filtro por búsqueda
    if (terminoBusqueda.trim()) {
      informes = buscarInformePorNombre(terminoBusqueda);
    }
    
    return informes;
  }, [filtroPeriodicidad, terminoBusqueda]);
  
  // ============================================
  // FUNCIONES
  // ============================================
  
  /**
   * Obtener color según periodicidad
   */
  const obtenerColorPeriodicidad = (periodicidad: string) => {
    switch (periodicidad) {
      case 'Mensual': return 'bg-red-100 text-red-700 border-red-300';
      case 'Trimestral': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Cuatrimestral': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Semestral': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Anual': return 'bg-green-100 text-green-700 border-green-300';
      case 'Eventual': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };
  
  /**
   * Exportar a PDF
   */
  const exportarAPDF = () => {
    alert('Funcionalidad de exportación a PDF en desarrollo');
  };
  
  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0EDFF] via-white to-[#E0EDFF]">
      
      {/* Header */}
      <div className="bg-white border-b-2 border-[#003DA5] border-opacity-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#003DA5] flex items-center">
                <Calendar className="w-10 h-10 mr-4" />
                📅 Calendario de Informes de Ley
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Cronograma anual de informes obligatorios de la Oficina de Control Interno
              </p>
            </div>
            
            {onVolverADashboard && (
              <button
                onClick={onVolverADashboard}
                className="px-6 py-3 bg-white border-2 border-[#003DA5] text-[#003DA5] rounded-xl font-semibold hover:bg-[#003DA5] hover:text-white transition-all text-lg"
              >
                ← Volver
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-8 py-8">
        
        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          
          {/* Total */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-[#003DA5] border-opacity-20">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-10 h-10 text-[#003DA5]" />
              <span className="text-4xl font-bold text-[#003DA5]">{estadisticas.total}</span>
            </div>
            <p className="text-gray-600 font-semibold text-lg">Total Informes</p>
          </div>
          
          {/* Próximos 30 días */}
          <div className="bg-gradient-to-br from-[#F57C00] to-[#FF9800] rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-10 h-10" />
              <span className="text-4xl font-bold">{proximosInformes.length}</span>
            </div>
            <p className="font-semibold text-lg">Próximos 30 días</p>
          </div>
          
          {/* Periódicos */}
          <div className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle2 className="w-10 h-10" />
              <span className="text-4xl font-bold">
                {estadisticas.porPeriodicidad.trimestral + 
                 estadisticas.porPeriodicidad.cuatrimestral + 
                 estadisticas.porPeriodicidad.semestral + 
                 estadisticas.porPeriodicidad.anual}
              </span>
            </div>
            <p className="font-semibold text-lg">Periódicos</p>
          </div>
          
          {/* Eventuales */}
          <div className="bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <XCircle className="w-10 h-10" />
              <span className="text-4xl font-bold">{estadisticas.porPeriodicidad.eventual}</span>
            </div>
            <p className="font-semibold text-lg">Eventuales</p>
          </div>
          
        </div>
        
        {/* Alertas de Próximos Informes */}
        {proximosInformes.length > 0 && (
          <div className="bg-gradient-to-r from-[#FFF3E0] to-[#FFE0B2] border-2 border-[#F57C00] rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-start">
              <AlertTriangle className="w-8 h-8 text-[#F57C00] mr-4 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-[#F57C00] mb-3">
                  ⚠️ Próximos Vencimientos (30 días)
                </h3>
                <div className="space-y-3">
                  {proximosInformes.slice(0, 3).map(informe => (
                    <div key={informe.id} className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-[#003DA5] text-lg">{informe.nombre}</p>
                          <p className="text-gray-600 text-base mt-1">
                            <Clock className="w-4 h-4 inline mr-2" />
                            {informe.fechasEntrega?.[0] || 'Pendiente'}
                          </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${obtenerColorPeriodicidad(informe.periodicidad)}`}>
                          {informe.periodicidad}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {proximosInformes.length > 3 && (
                  <p className="text-[#F57C00] font-semibold mt-4 text-lg">
                    + {proximosInformes.length - 3} informes más...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Controles de Filtrado y Búsqueda */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Búsqueda */}
            <div className="flex-1">
              <label className="block text-gray-700 font-semibold mb-3 text-lg">
                <Search className="w-5 h-5 inline mr-2" />
                Buscar informe
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                className="w-full px-5 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
              />
            </div>
            
            {/* Filtro Periodicidad */}
            <div className="w-full md:w-80">
              <label className="block text-gray-700 font-semibold mb-3 text-lg">
                <Filter className="w-5 h-5 inline mr-2" />
                Periodicidad
              </label>
              <select
                value={filtroPeriodicidad}
                onChange={(e) => setFiltroPeriodicidad(e.target.value)}
                className="w-full px-5 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
              >
                <option value="Todos">Todos ({estadisticas.total})</option>
                <option value="Mensual">Mensual ({estadisticas.porPeriodicidad.mensual})</option>
                <option value="Trimestral">Trimestral ({estadisticas.porPeriodicidad.trimestral})</option>
                <option value="Cuatrimestral">Cuatrimestral ({estadisticas.porPeriodicidad.cuatrimestral})</option>
                <option value="Semestral">Semestral ({estadisticas.porPeriodicidad.semestral})</option>
                <option value="Anual">Anual ({estadisticas.porPeriodicidad.anual})</option>
                <option value="Eventual">Eventual ({estadisticas.porPeriodicidad.eventual})</option>
              </select>
            </div>
            
            {/* Botón Exportar */}
            <div className="w-full md:w-48">
              <label className="block text-gray-700 font-semibold mb-3 text-lg opacity-0">
                Acción
              </label>
              <button
                onClick={exportarAPDF}
                className="w-full px-5 py-3 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-xl font-semibold hover:shadow-xl transition-all text-lg flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Exportar PDF
              </button>
            </div>
            
          </div>
          
          {/* Resumen de filtros */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <p className="text-gray-600 text-lg">
              Mostrando <strong className="text-[#003DA5]">{informesFiltrados.length}</strong> de <strong className="text-[#003DA5]">{estadisticas.total}</strong> informes
              {terminoBusqueda && (
                <span className="ml-2">
                  con el término "<strong className="text-[#F57C00]">{terminoBusqueda}</strong>"
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Lista de Informes */}
        <div className="space-y-4">
          {informesFiltrados.map((informe) => (
            <div
              key={informe.id}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all border-2 border-transparent hover:border-[#003DA5] cursor-pointer"
              onClick={() => setInformeSeleccionado(informe)}
            >
              <div className="flex items-start justify-between">
                
                {/* Contenido principal */}
                <div className="flex-1 pr-6">
                  <div className="flex items-center mb-3">
                    <span className="text-3xl font-bold text-[#003DA5] mr-4">
                      {String(informe.id).padStart(2, '0')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003DA5] flex-1">
                      {informe.nombre}
                    </h3>
                  </div>
                  
                  <p className="text-gray-600 mb-4 text-base leading-relaxed">
                    {informe.observaciones.substring(0, 200)}...
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${obtenerColorPeriodicidad(informe.periodicidad)}`}>
                      📅 {informe.periodicidad}
                    </span>
                    <span className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 border-2 border-gray-300">
                      👤 {informe.destinatario}
                    </span>
                    {informe.fechasEntrega && informe.fechasEntrega.length > 0 && (
                      <span className="px-4 py-2 rounded-full text-sm font-semibold bg-[#E0EDFF] text-[#003DA5] border-2 border-[#003DA5] border-opacity-30">
                        📆 {informe.fechasEntrega[0]}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Icono */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#003DA5] to-[#2962FF] flex items-center justify-center text-white text-2xl">
                    📄
                  </div>
                </div>
                
              </div>
            </div>
          ))}
        </div>
        
        {/* Sin resultados */}
        {informesFiltrados.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FileText className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-600 mb-3">
              No se encontraron informes
            </h3>
            <p className="text-gray-500 text-lg">
              Intenta ajustar los filtros de búsqueda o periodicidad
            </p>
          </div>
        )}
        
      </div>
      
      {/* Modal de Detalle */}
      {informeSeleccionado && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8"
          onClick={() => setInformeSeleccionado(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-10">
              
              {/* Header del modal */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <span className="text-4xl font-bold text-[#003DA5] mr-4">
                      {String(informeSeleccionado.id).padStart(2, '0')}
                    </span>
                    <span className={`px-4 py-2 rounded-full text-base font-semibold border-2 ${obtenerColorPeriodicidad(informeSeleccionado.periodicidad)}`}>
                      {informeSeleccionado.periodicidad}
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-[#003DA5] mb-3">
                    {informeSeleccionado.nombre}
                  </h2>
                </div>
                <button
                  onClick={() => setInformeSeleccionado(null)}
                  className="text-gray-500 hover:text-[#003DA5] transition-colors text-4xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
              
              {/* Contenido del modal */}
              <div className="space-y-6">
                
                {/* Destinatario */}
                <div>
                  <h3 className="text-lg font-bold text-[#003DA5] mb-2 flex items-center">
                    👤 Destinatario
                  </h3>
                  <p className="text-gray-700 text-base bg-gray-50 p-4 rounded-xl">
                    {informeSeleccionado.destinatario}
                  </p>
                </div>
                
                {/* Fechas de entrega */}
                {informeSeleccionado.fechasEntrega && informeSeleccionado.fechasEntrega.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-[#003DA5] mb-2 flex items-center">
                      📆 Fechas de Entrega
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {informeSeleccionado.fechasEntrega.map((fecha, idx) => (
                        <span 
                          key={idx}
                          className="px-4 py-2 bg-[#E0EDFF] text-[#003DA5] rounded-xl font-semibold text-base"
                        >
                          {fecha}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Normas aplicables */}
                <div>
                  <h3 className="text-lg font-bold text-[#003DA5] mb-2 flex items-center">
                    📋 Normas Aplicables
                  </h3>
                  <ul className="space-y-2">
                    {informeSeleccionado.normas.map((norma, idx) => (
                      <li 
                        key={idx}
                        className="text-gray-700 text-base bg-gray-50 p-4 rounded-xl flex items-start"
                      >
                        <span className="text-[#003DA5] font-bold mr-3">•</span>
                        <span>{norma}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Observaciones */}
                <div>
                  <h3 className="text-lg font-bold text-[#003DA5] mb-2 flex items-center">
                    📝 Observaciones
                  </h3>
                  <p className="text-gray-700 text-base bg-gray-50 p-4 rounded-xl leading-relaxed">
                    {informeSeleccionado.observaciones}
                  </p>
                </div>
                
              </div>
              
              {/* Footer del modal */}
              <div className="mt-8 pt-6 border-t-2 border-gray-200 flex justify-end">
                <button
                  onClick={() => setInformeSeleccionado(null)}
                  className="px-8 py-3 bg-[#003DA5] text-white rounded-xl font-semibold hover:bg-[#2962FF] transition-all text-lg"
                >
                  Cerrar
                </button>
              </div>
              
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default CalendarioInformesLey;
