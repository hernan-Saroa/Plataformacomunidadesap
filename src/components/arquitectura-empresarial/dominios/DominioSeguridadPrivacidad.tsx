/**
 * Dominio: Seguridad y Privacidad de la Información
 * Marco de Referencia MRAE - MinTIC Colombia
 * Ciberseguridad, protección de datos y gestión de riesgos de seguridad
 */

import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  Eye, 
  Key,
  FileCheck,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Bell,
  ShieldCheck,
  UserCheck,
  Database,
  Server,
  Wifi,
  ChevronDown,
  ChevronRight,
  Plus,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DominioSeguridadPrivacidadProps {
  canEdit?: boolean;
}

export function DominioSeguridadPrivacidad({ canEdit = true }: DominioSeguridadPrivacidadProps) {
  const [selectedView, setSelectedView] = useState<string>('incidentes');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Métricas de Seguridad
  const metricas = [
    {
      label: 'Nivel de Seguridad',
      value: '8.4',
      suffix: '/10',
      icon: ShieldCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+0.3',
      trendUp: true
    },
    {
      label: 'Incidentes Este Mes',
      value: '12',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: '-5',
      trendUp: false
    },
    {
      label: 'Vulnerabilidades Críticas',
      value: '3',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: '-2',
      trendUp: false
    },
    {
      label: 'Cumplimiento ISO 27001',
      value: '88%',
      icon: FileCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+4%',
      trendUp: true
    }
  ];

  // Incidentes de Seguridad
  const incidentes = [
    {
      id: 'inc-001',
      fecha: '2025-12-05',
      tipo: 'Intento de Phishing',
      severidad: 'Media',
      estado: 'Resuelto',
      descripcion: 'Campaña de correos fraudulentos detectada y bloqueada',
      afectados: 45,
      tiempoResolucion: '2 horas',
      responsable: 'Equipo SOC',
      acciones: [
        'Bloqueo de dominios maliciosos',
        'Notificación a usuarios afectados',
        'Actualización de filtros anti-spam',
        'Capacitación preventiva programada'
      ]
    },
    {
      id: 'inc-002',
      fecha: '2025-12-03',
      tipo: 'Acceso No Autorizado',
      severidad: 'Alta',
      estado: 'En Investigación',
      descripcion: 'Intento de acceso a base de datos académica desde IP extranjera',
      afectados: 0,
      tiempoResolucion: 'En curso',
      responsable: 'CSIRT',
      acciones: [
        'Bloqueo de IP origen',
        'Análisis de logs de acceso',
        'Revisión de credenciales comprometidas',
        'Fortalecimiento de autenticación'
      ]
    },
    {
      id: 'inc-003',
      fecha: '2025-11-28',
      tipo: 'Malware Detectado',
      severidad: 'Baja',
      estado: 'Resuelto',
      descripcion: 'Software malicioso detectado en equipo de usuario',
      afectados: 1,
      tiempoResolucion: '45 minutos',
      responsable: 'Mesa de Ayuda',
      acciones: [
        'Aislamiento de equipo infectado',
        'Eliminación de malware',
        'Actualización de antivirus',
        'Escaneo completo del equipo'
      ]
    },
    {
      id: 'inc-004',
      fecha: '2025-11-25',
      tipo: 'Fuga de Información',
      severidad: 'Crítica',
      estado: 'Resuelto',
      descripcion: 'Exposición accidental de datos personales en repositorio público',
      afectados: 230,
      tiempoResolucion: '6 horas',
      responsable: 'DPO',
      acciones: [
        'Eliminación inmediata de datos expuestos',
        'Notificación a SIC',
        'Notificación a afectados',
        'Implementación de controles DLP'
      ]
    }
  ];

  // Vulnerabilidades
  const vulnerabilidades = [
    {
      id: 'vuln-001',
      sistema: 'Portal Web Institucional',
      tipo: 'SQL Injection',
      severidad: 'Crítica',
      cvss: 9.1,
      estado: 'En Remediación',
      fechaDeteccion: '2025-12-01',
      fechaLimite: '2025-12-10',
      responsable: 'Equipo de Desarrollo'
    },
    {
      id: 'vuln-002',
      sistema: 'Sistema de Gestión Académica',
      tipo: 'Cross-Site Scripting (XSS)',
      severidad: 'Alta',
      cvss: 7.8,
      estado: 'Remediado',
      fechaDeteccion: '2025-11-20',
      fechaLimite: '2025-11-30',
      responsable: 'Equipo de Desarrollo'
    },
    {
      id: 'vuln-003',
      sistema: 'Infraestructura de Red',
      tipo: 'Configuración Insegura',
      severidad: 'Media',
      cvss: 5.5,
      estado: 'En Análisis',
      fechaDeteccion: '2025-12-04',
      fechaLimite: '2025-12-20',
      responsable: 'Equipo de Infraestructura'
    }
  ];

  // Controles de Seguridad
  const controles = [
    {
      categoria: 'Control de Acceso',
      controles: [
        { nombre: 'Autenticación Multifactor (MFA)', estado: 'Implementado', cobertura: 95 },
        { nombre: 'Gestión de Identidades (IAM)', estado: 'Implementado', cobertura: 100 },
        { nombre: 'Control de Acceso Basado en Roles', estado: 'Implementado', cobertura: 98 },
        { nombre: 'Revisión Periódica de Privilegios', estado: 'Activo', cobertura: 85 }
      ]
    },
    {
      categoria: 'Protección de Datos',
      controles: [
        { nombre: 'Cifrado de Datos en Tránsito (TLS)', estado: 'Implementado', cobertura: 100 },
        { nombre: 'Cifrado de Datos en Reposo', estado: 'Implementado', cobertura: 92 },
        { nombre: 'Data Loss Prevention (DLP)', estado: 'En Implementación', cobertura: 45 },
        { nombre: 'Clasificación de Información', estado: 'Activo', cobertura: 78 }
      ]
    },
    {
      categoria: 'Monitoreo y Detección',
      controles: [
        { nombre: 'SIEM (Security Information and Event Management)', estado: 'Implementado', cobertura: 88 },
        { nombre: 'IDS/IPS (Detección/Prevención de Intrusos)', estado: 'Implementado', cobertura: 95 },
        { nombre: 'Análisis de Vulnerabilidades', estado: 'Activo', cobertura: 90 },
        { nombre: 'Monitoreo 24/7 (SOC)', estado: 'Implementado', cobertura: 100 }
      ]
    },
    {
      categoria: 'Respuesta a Incidentes',
      controles: [
        { nombre: 'Plan de Respuesta a Incidentes', estado: 'Documentado', cobertura: 100 },
        { nombre: 'Equipo CSIRT', estado: 'Activo', cobertura: 100 },
        { nombre: 'Procedimientos de Escalamiento', estado: 'Documentado', cobertura: 95 },
        { nombre: 'Simulacros de Incidentes', estado: 'Periódico', cobertura: 75 }
      ]
    }
  ];

  // Cumplimiento de Privacidad
  const cumplimientoPrivacidad = [
    {
      requisito: 'Registro de Bases de Datos (SIC)',
      estado: 'Cumpliendo',
      porcentaje: 100,
      ultimaActualizacion: '2025-06-15'
    },
    {
      requisito: 'Política de Tratamiento de Datos',
      estado: 'Vigente',
      porcentaje: 100,
      ultimaActualizacion: '2025-01-10'
    },
    {
      requisito: 'Análisis de Impacto de Privacidad (PIA)',
      estado: 'En Progreso',
      porcentaje: 68,
      ultimaActualizacion: '2025-11-28'
    },
    {
      requisito: 'Gestión de Consentimientos',
      estado: 'Implementado',
      porcentaje: 92,
      ultimaActualizacion: '2025-09-20'
    },
    {
      requisito: 'Derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)',
      estado: 'Implementado',
      porcentaje: 95,
      ultimaActualizacion: '2025-10-05'
    }
  ];

  const getSeveridadColor = (severidad: string) => {
    switch (severidad) {
      case 'Crítica': return 'bg-red-100 text-red-700 border-red-300';
      case 'Alta': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Media': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Baja': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Resuelto':
      case 'Remediado':
      case 'Implementado':
      case 'Cumpliendo':
      case 'Vigente':
        return 'bg-green-100 text-green-700';
      case 'En Investigación':
      case 'En Remediación':
      case 'En Implementación':
      case 'En Análisis':
      case 'En Progreso':
        return 'bg-blue-100 text-blue-700';
      case 'Activo':
      case 'Documentado':
      case 'Periódico':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] rounded-xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8" />
              <h2 className="text-2xl font-black">Seguridad y Privacidad de la Información</h2>
            </div>
            <p className="text-blue-100">
              Gestión integral de ciberseguridad y protección de datos personales
            </p>
          </div>
          {canEdit && (
            <button className="px-4 py-2 bg-white text-[#003DA5] rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Reportar Incidente
            </button>
          )}
        </div>
      </motion.div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map((metrica, index) => {
          const Icon = metrica.icon;
          return (
            <motion.div
              key={metrica.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${metrica.bgColor} rounded-xl p-6 border border-gray-200`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-6 h-6 ${metrica.color}`} />
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  metrica.trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {metrica.trend}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{metrica.label}</p>
              <p className={`text-2xl font-black ${metrica.color}`}>
                {metrica.value}{metrica.suffix}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Navegación de Vistas */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'incidentes', label: 'Incidentes', icon: AlertTriangle },
          { id: 'vulnerabilidades', label: 'Vulnerabilidades', icon: AlertCircle },
          { id: 'controles', label: 'Controles', icon: ShieldCheck },
          { id: 'privacidad', label: 'Privacidad', icon: Lock }
        ].map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setSelectedView(view.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                selectedView === view.id
                  ? 'bg-[#003DA5] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Contenido según vista seleccionada */}
      {selectedView === 'incidentes' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Incidentes de Seguridad Recientes
          </h3>
          {incidentes.map((incidente) => (
            <div key={incidente.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div 
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection(incidente.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {expandedSections[incidente.id] ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-gray-600">{incidente.id}</span>
                        <h4 className="font-bold text-gray-900">{incidente.tipo}</h4>
                        <span className={`px-3 py-1 text-xs font-bold rounded border ${getSeveridadColor(incidente.severidad)}`}>
                          {incidente.severidad}
                        </span>
                        <span className={`px-2 py-1 text-xs font-bold rounded ${getEstadoColor(incidente.estado)}`}>
                          {incidente.estado}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{incidente.descripcion}</p>
                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <span>Fecha: {incidente.fecha}</span>
                        <span>•</span>
                        <span>Afectados: {incidente.afectados}</span>
                        <span>•</span>
                        <span>Tiempo de resolución: {incidente.tiempoResolucion}</span>
                        <span>•</span>
                        <span>Responsable: {incidente.responsable}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedSections[incidente.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-gray-50 border-t border-gray-200 p-5"
                  >
                    <h5 className="font-bold text-gray-900 mb-3">Acciones Tomadas</h5>
                    <div className="space-y-2">
                      {incidente.acciones.map((accion, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          <span className="text-sm text-gray-700">{accion}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      )}

      {selectedView === 'vulnerabilidades' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Vulnerabilidades Identificadas
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {vulnerabilidades.map((vuln) => (
                <div key={vuln.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-gray-600">{vuln.id}</span>
                        <h4 className="font-bold text-gray-900">{vuln.tipo}</h4>
                        <span className={`px-3 py-1 text-xs font-bold rounded border ${getSeveridadColor(vuln.severidad)}`}>
                          {vuln.severidad}
                        </span>
                        <span className={`px-2 py-1 text-xs font-bold rounded ${getEstadoColor(vuln.estado)}`}>
                          {vuln.estado}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Sistema: {vuln.sistema}</p>
                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <span>Detección: {vuln.fechaDeteccion}</span>
                        <span>•</span>
                        <span>Límite: {vuln.fechaLimite}</span>
                        <span>•</span>
                        <span>Responsable: {vuln.responsable}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">CVSS Score</p>
                      <p className={`text-2xl font-black ${
                        vuln.cvss >= 9 ? 'text-red-600' :
                        vuln.cvss >= 7 ? 'text-orange-600' :
                        vuln.cvss >= 4 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {vuln.cvss}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {selectedView === 'controles' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {controles.map((categoria, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  {categoria.categoria}
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {categoria.controles.map((control, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{control.nombre}</h4>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${getEstadoColor(control.estado)}`}>
                            {control.estado}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  control.cobertura >= 90 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                  control.cobertura >= 70 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                  control.cobertura >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                  'bg-gradient-to-r from-orange-500 to-orange-600'
                                }`}
                                style={{ width: `${control.cobertura}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 w-12 text-right">{control.cobertura}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {selectedView === 'privacidad' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Cumplimiento de Privacidad y Protección de Datos
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Ley 1581 de 2012 y normatividad aplicable
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {cumplimientoPrivacidad.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-gray-900">{item.requisito}</h4>
                        <span className={`px-2 py-1 text-xs font-bold rounded ${getEstadoColor(item.estado)}`}>
                          {item.estado}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Última actualización: {item.ultimaActualizacion}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${
                        item.porcentaje >= 90 ? 'text-green-600' :
                        item.porcentaje >= 70 ? 'text-blue-600' :
                        'text-orange-600'
                      }`}>
                        {item.porcentaje}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        item.porcentaje >= 90 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        item.porcentaje >= 70 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        'bg-gradient-to-r from-orange-500 to-orange-600'
                      }`}
                      style={{ width: `${item.porcentaje}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
