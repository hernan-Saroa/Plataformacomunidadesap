/**
 * Dominio: Información
 * Gestión y gobierno de datos e información institucional
 */

import React, { useState } from 'react';
import { Database, Table, Shield, FileText, BarChart3, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface DominioInformacionProps {
  canEdit?: boolean;
}

export function DominioInformacion({ canEdit = true }: DominioInformacionProps) {
  const [selectedTab, setSelectedTab] = useState<'catalogo' | 'calidad' | 'gobierno' | 'privacidad'>('catalogo');

  const catalogoDatos = [
    { nombre: 'Estudiantes', registros: 45230, calidad: 95, criticidad: 'Alta', owner: 'Académica' },
    { nombre: 'Docentes', registros: 2350, calidad: 92, criticidad: 'Alta', owner: 'Talento Humano' },
    { nombre: 'Programas Académicos', registros: 156, calidad: 98, criticidad: 'Alta', owner: 'Académica' },
    { nombre: 'Transacciones Financieras', registros: 125600, calidad: 88, criticidad: 'Crítica', owner: 'Financiera' },
    { nombre: 'Certificados Emitidos', registros: 12450, calidad: 90, criticidad: 'Alta', owner: 'Registro' }
  ];

  const indicadoresCalidad = [
    { metrica: 'Completitud', valor: 94, objetivo: 95, estado: 'warning' },
    { metrica: 'Exactitud', valor: 91, objetivo: 95, estado: 'warning' },
    { metrica: 'Consistencia', valor: 96, objetivo: 90, estado: 'success' },
    { metrica: 'Unicidad', valor: 88, objetivo: 95, estado: 'error' },
    { metrica: 'Validez', valor: 93, objetivo: 90, estado: 'success' }
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="grid grid-cols-4 gap-2">
          {['catalogo', 'calidad', 'gobierno', 'privacidad'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as any)}
              className={`px-4 py-3 rounded-lg font-semibold transition-all capitalize ${
                selectedTab === tab
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Catálogo de Datos */}
      {selectedTab === 'catalogo' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-black text-gray-900 mb-6">Catálogo de Datos Institucionales</h3>
          <div className="space-y-3">
            {catalogoDatos.map((dato, index) => (
              <motion.div
                key={dato.nombre}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Database className="w-5 h-5 text-purple-600" />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{dato.nombre}</h4>
                      <p className="text-sm text-gray-600">{dato.registros.toLocaleString('es-CO')} registros</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Calidad</p>
                      <p className="text-sm font-bold text-gray-900">{dato.calidad}%</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      dato.criticidad === 'Crítica'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {dato.criticidad}
                    </span>
                    <div className="text-right min-w-[100px]">
                      <p className="text-xs text-gray-600">Owner</p>
                      <p className="text-sm font-semibold text-gray-900">{dato.owner}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Calidad de Datos */}
      {selectedTab === 'calidad' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-black text-gray-900 mb-6">Indicadores de Calidad de Datos</h3>
          <div className="space-y-4">
            {indicadoresCalidad.map((indicador, index) => (
              <motion.div
                key={indicador.metrica}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{indicador.metrica}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Objetivo: {indicador.objetivo}%</span>
                    <span className="text-sm font-black text-gray-900">{indicador.valor}%</span>
                    {indicador.estado === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      indicador.estado === 'success'
                        ? 'bg-green-500'
                        : indicador.estado === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${indicador.valor}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Gobierno de Datos */}
      {selectedTab === 'gobierno' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">Marco de Gobierno de Datos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <Shield className="w-8 h-8 text-purple-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Políticas</h4>
              <p className="text-sm text-gray-600">12 políticas activas de gestión de datos</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <FileText className="w-8 h-8 text-blue-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Procedimientos</h4>
              <p className="text-sm text-gray-600">18 procedimientos documentados</p>
            </div>
          </div>
        </div>
      )}

      {/* Privacidad */}
      {selectedTab === 'privacidad' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">Gestión de Privacidad y Protección de Datos</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-green-900 mb-1">Cumplimiento Ley 1581 de 2012</h4>
                <p className="text-sm text-green-700">
                  ESAP cumple con la normativa de protección de datos personales vigente en Colombia
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
