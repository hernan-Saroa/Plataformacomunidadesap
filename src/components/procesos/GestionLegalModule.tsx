import { motion } from 'motion/react';
import { useState } from 'react';
import {
  Scale,
  Search,
  Filter,
  Plus,
  Eye,
  Calendar,
  FileText,
  DollarSign
} from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { procesosLegales } from '../../data/procesosAdministrativos';

export function GestionLegalModule() {
  const [busqueda, setBusqueda] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-8 h-8 text-purple-600" />
            <h1 className="text-slate-900">Gestión Legal</h1>
          </div>
          <p className="text-slate-600">
            Procesos judiciales, administrativos y representación legal de ESAP
          </p>
        </div>
        <ButtonSIGL variant="primary" size="md">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Proceso Legal
        </ButtonSIGL>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <Scale className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-purple-600 mb-1">
              {procesosLegales.length}
            </p>
            <p className="text-sm text-slate-600">Procesos Totales</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-600 mb-1">
              {procesosLegales.filter(p => p.estado === 'en_tramite').length}
            </p>
            <p className="text-sm text-slate-600">En Trámite</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <Calendar className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-orange-600 mb-1">
              {procesosLegales.filter(p => p.proximaAudiencia).length}
            </p>
            <p className="text-sm text-slate-600">Audiencias Próximas</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600 mb-1">
              {formatCurrency(procesosLegales.reduce((sum, p) => sum + (p.cuantia || 0), 0))}
            </p>
            <p className="text-sm text-slate-600">Cuantía Total</p>
          </div>
        </CardSIGL>
      </div>

      {/* Filtros */}
      <CardSIGL>
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar procesos legales..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <ButtonSIGL variant="outline" size="md">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </ButtonSIGL>
        </div>
      </CardSIGL>

      {/* Lista de Procesos */}
      <div className="space-y-4">
        {procesosLegales.map((proceso, index) => (
          <motion.div
            key={proceso.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CardSIGL variant="elevated" className="hover:shadow-lg transition-all">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-slate-900 font-semibold">{proceso.titulo}</h3>
                      <BadgeSIGL variant={
                        proceso.estado === 'resuelto' ? 'success' :
                        proceso.estado === 'en_tramite' ? 'primary' :
                        'default'
                      }>
                        {proceso.estado.replace('_', ' ').toUpperCase()}
                      </BadgeSIGL>
                      <BadgeSIGL variant="info">
                        {proceso.tipoProcesoLegal.replace('_', ' ').toUpperCase()}
                      </BadgeSIGL>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      {proceso.codigo} • Radicado: {proceso.radicado}
                    </p>
                    <p className="text-sm text-slate-700 mb-4">{proceso.descripcion}</p>
                  </div>
                </div>

                {/* Información del Proceso */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Juzgado</p>
                    <p className="text-sm font-semibold text-slate-900">{proceso.juzgado}</p>
                    <p className="text-xs text-slate-600">{proceso.despacho}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Estado Procesal</p>
                    <p className="text-sm font-semibold text-slate-900">{proceso.estadoProcesal}</p>
                  </div>
                  {proceso.cuantia && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Cuantía</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(proceso.cuantia)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Abogado Externo */}
                {proceso.abogadoExterno && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      👔 Representación Externa
                    </p>
                    <p className="text-sm text-slate-700">
                      {proceso.abogadoExterno.nombre} - {proceso.abogadoExterno.firma}
                    </p>
                    <p className="text-xs text-slate-600">{proceso.abogadoExterno.contacto}</p>
                  </div>
                )}

                {/* Próxima Audiencia */}
                {proceso.proximaAudiencia && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                      📅 Próxima Audiencia
                    </p>
                    <p className="text-sm text-slate-700">
                      {proceso.proximaAudiencia.tipo} - {proceso.proximaAudiencia.fecha}
                    </p>
                    <p className="text-xs text-slate-600">{proceso.proximaAudiencia.lugar}</p>
                  </div>
                )}

                {/* Sentencia */}
                {proceso.sentencia && (
                  <div className={`mb-4 p-3 border rounded-lg ${
                    proceso.sentencia.sentido === 'favorable' ? 'bg-green-50 border-green-200' :
                    proceso.sentencia.sentido === 'desfavorable' ? 'bg-red-50 border-red-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <p className={`text-sm font-semibold mb-1 ${
                      proceso.sentencia.sentido === 'favorable' ? 'text-green-900' :
                      proceso.sentencia.sentido === 'desfavorable' ? 'text-red-900' :
                      'text-yellow-900'
                    }`}>
                      ⚖️ Sentencia {proceso.sentencia.sentido.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-slate-700">{proceso.sentencia.resumen}</p>
                    <p className="text-xs text-slate-600 mt-1">Fecha: {proceso.sentencia.fecha}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <ButtonSIGL variant="primary" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Expediente
                  </ButtonSIGL>
                  <ButtonSIGL variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Documentos ({proceso.documentos.length})
                  </ButtonSIGL>
                </div>
              </div>
            </CardSIGL>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
