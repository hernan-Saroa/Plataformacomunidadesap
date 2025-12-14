/**
 * Dominio: Sistemas de Información
 * Gestión de aplicaciones y soluciones tecnológicas - Portafolio ESAP
 */

import React from 'react';
import { Server, CheckCircle, AlertTriangle, Activity, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface DominioSistemasInformacionProps {
  canEdit?: boolean;
}

export function DominioSistemasInformacion({ canEdit }: DominioSistemasInformacionProps) {
  // Portafolio real de aplicaciones ESAP
  const sistemas = [
    {
      nombre: 'Portal Transaccional ESAP',
      descripcion: 'ComUNIdad Universitaria - Red Social Académica',
      tipo: 'Web App',
      criticidad: 'Crítica',
      estado: 'Operativo',
      disponibilidad: 99.8,
      usuarios: 45000,
      proveedor: 'Desarrollo Interno',
      version: '2.0',
      licencia: 'Propio'
    },
    {
      nombre: 'ARCA',
      descripcion: 'Sistema de Gestión Académica y Registro',
      tipo: 'ERP Académico',
      criticidad: 'Crítica',
      estado: 'Operativo',
      disponibilidad: 99.5,
      usuarios: 12000,
      proveedor: 'ARCA',
      version: '8.5',
      licencia: 'Licenciado'
    },
    {
      nombre: 'SINÚ',
      descripcion: 'Sistema Integrado Nacional Universitario',
      tipo: 'Sistema de Gestión',
      criticidad: 'Crítica',
      estado: 'Operativo',
      disponibilidad: 99.2,
      usuarios: 8500,
      proveedor: 'SINÚ',
      version: '3.2',
      licencia: 'Licenciado'
    },
    {
      nombre: 'SEEN',
      descripcion: 'Sistema de Extensión y Educación Nacional',
      tipo: 'Plataforma Educativa',
      criticidad: 'Alta',
      estado: 'Operativo',
      disponibilidad: 98.8,
      usuarios: 6200,
      proveedor: 'SEEN',
      version: '2.5',
      licencia: 'Licenciado'
    },
    {
      nombre: 'Humanos',
      descripcion: 'Sistema de Gestión de Talento Humano',
      tipo: 'ERP RRHH',
      criticidad: 'Crítica',
      estado: 'Operativo',
      disponibilidad: 99.6,
      usuarios: 3500,
      proveedor: 'Humanos',
      version: '4.1',
      licencia: 'Licenciado'
    },
    {
      nombre: 'Akademus FFT',
      descripcion: 'Sistema de Formación y Capacitación',
      tipo: 'LMS',
      criticidad: 'Alta',
      estado: 'Operativo',
      disponibilidad: 98.5,
      usuarios: 5800,
      proveedor: 'Akademus',
      version: '5.0 FFT',
      licencia: 'Licenciado'
    },
    {
      nombre: 'Certiegresados',
      descripcion: 'Sistema de Certificación de Egresados',
      tipo: 'Sistema Especializado',
      criticidad: 'Alta',
      estado: 'Operativo',
      disponibilidad: 99.1,
      usuarios: 2500,
      proveedor: 'Certiegresados',
      version: '1.8',
      licencia: 'Licenciado'
    },
    {
      nombre: 'Isolucion',
      descripcion: 'Sistema Institucional de Gestión',
      tipo: 'Plataforma Integral',
      criticidad: 'Alta',
      estado: 'En mantenimiento',
      disponibilidad: 95.0,
      usuarios: 1800,
      proveedor: 'Isolucion',
      version: '3.0',
      licencia: 'Licenciado'
    },
    {
      nombre: 'Sistema Financiero',
      descripcion: 'Gestión Financiera y Contable Institucional',
      tipo: 'ERP Financiero',
      criticidad: 'Crítica',
      estado: 'Operativo',
      disponibilidad: 99.9,
      usuarios: 350,
      proveedor: 'SAP/Oracle',
      version: '12.2',
      licencia: 'Licenciado'
    },
    {
      nombre: 'Gestión Documental',
      descripcion: 'Sistema de Gestión Documental y Archivo',
      tipo: 'ECM',
      criticidad: 'Alta',
      estado: 'Operativo',
      disponibilidad: 98.5,
      usuarios: 2500,
      proveedor: 'OnBase/OpenText',
      version: '21.1',
      licencia: 'Licenciado'
    },
    {
      nombre: 'BI Institucional',
      descripcion: 'Business Intelligence y Analytics',
      tipo: 'Analytics',
      criticidad: 'Alta',
      estado: 'Operativo',
      disponibilidad: 97.5,
      usuarios: 180,
      proveedor: 'Power BI/Tableau',
      version: 'Cloud',
      licencia: 'Suscripción'
    }
  ];

  // Estadísticas del portafolio
  const stats = {
    totalSistemas: sistemas.length,
    operativos: sistemas.filter(s => s.estado === 'Operativo').length,
    criticos: sistemas.filter(s => s.criticidad === 'Crítica').length,
    usuariosTotales: sistemas.reduce((sum, s) => sum + s.usuarios, 0),
    disponibilidadPromedio: (sistemas.reduce((sum, s) => sum + s.disponibilidad, 0) / sistemas.length).toFixed(1)
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas del Portafolio */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl font-black text-gray-900 mb-1">{stats.totalSistemas}</div>
            <p className="text-sm text-gray-600">Total Sistemas</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl font-black text-green-600 mb-1">{stats.operativos}</div>
            <p className="text-sm text-gray-600">Operativos</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl font-black text-red-600 mb-1">{stats.criticos}</div>
            <p className="text-sm text-gray-600">Críticos</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl font-black text-blue-600 mb-1">
              {(stats.usuariosTotales / 1000).toFixed(0)}K
            </div>
            <p className="text-sm text-gray-600">Usuarios</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl font-black text-purple-600 mb-1">{stats.disponibilidadPromedio}%</div>
            <p className="text-sm text-gray-600">Disponibilidad</p>
          </div>
        </div>
      </div>

      {/* Portafolio de Aplicaciones */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900">Portafolio de Aplicaciones ESAP</h3>
            <p className="text-sm text-gray-600">
              Inventario completo de sistemas y plataformas institucionales
            </p>
          </div>
          {canEdit && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">
              + Agregar Sistema
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sistemas.map((sistema, index) => (
            <motion.div
              key={sistema.nombre}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Icono de Estado */}
                  <div className={`p-3 rounded-lg ${
                    sistema.estado === 'Operativo' ? 'bg-green-50' : 'bg-yellow-50'
                  }`}>
                    <Server className={`w-6 h-6 ${
                      sistema.estado === 'Operativo' ? 'text-green-600' : 'text-yellow-600'
                    }`} />
                  </div>

                  {/* Información del Sistema */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-black text-gray-900 mb-1">{sistema.nombre}</h4>
                        <p className="text-sm text-gray-600 mb-2">{sistema.descripcion}</p>
                      </div>
                    </div>

                    {/* Grid de Metadatos */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Tipo</span>
                        <span className="font-semibold text-gray-900">{sistema.tipo}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Usuarios</span>
                        <span className="font-semibold text-gray-900">
                          {sistema.usuarios.toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Proveedor</span>
                        <span className="font-semibold text-gray-900">{sistema.proveedor}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Versión</span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {sistema.version}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Licencia</span>
                        <span className="font-semibold text-gray-900">{sistema.licencia}</span>
                      </div>
                    </div>

                    {/* Badges y Estado */}
                    <div className="flex items-center gap-2">
                      {/* Criticidad */}
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        sistema.criticidad === 'Crítica'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {sistema.criticidad}
                      </span>

                      {/* Estado */}
                      <div className="flex items-center gap-1">
                        {sistema.estado === 'Operativo' ? (
                          <>
                            <Activity className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-semibold text-green-700">{sistema.estado}</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-semibold text-yellow-700">{sistema.estado}</span>
                          </>
                        )}
                      </div>

                      {/* Disponibilidad */}
                      <div className="flex items-center gap-2 ml-auto">
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-500">Disponibilidad</span>
                          <span className={`font-black ${
                            sistema.disponibilidad >= 99 ? 'text-green-600' :
                            sistema.disponibilidad >= 97 ? 'text-blue-600' :
                            'text-yellow-600'
                          }`}>
                            {sistema.disponibilidad}%
                          </span>
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              sistema.disponibilidad >= 99 ? 'bg-green-500' :
                              sistema.disponibilidad >= 97 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${sistema.disponibilidad}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mapa de Arquitectura */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Mapa de Arquitectura de Aplicaciones</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Capa de Presentación */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Capa de Presentación
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Portal Transaccional ESAP</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Akademus FFT</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>SEEN</span>
              </li>
            </ul>
          </div>

          {/* Capa de Negocio */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Capa de Negocio
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>ARCA (Académico)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>SINÚ (Gestión)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Humanos (RRHH)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Certiegresados</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Isolucion</span>
              </li>
            </ul>
          </div>

          {/* Capa de Soporte */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              Capa de Soporte
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Sistema Financiero</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Gestión Documental</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>BI Institucional</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
