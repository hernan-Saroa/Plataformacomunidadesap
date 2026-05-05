/**
 * DIAGNÓSTICO DEL MÓDULO - CONTROL INTERNO DISCIPLINARIO
 * Componente de desarrollo para verificar estado del módulo
 * Solo para uso en desarrollo/testing
 */

import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface ComponentCheck {
  nombre: string;
  path: string;
  estado: 'ok' | 'error' | 'warning';
  mensaje?: string;
}

export function DiagnosticoModulo() {
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false);

  const verificarComponentes = (): ComponentCheck[] => {
    const checks: ComponentCheck[] = [];

    // Verificar componentes principales
    try {
      require('./ControlDisciplinarioFull');
      checks.push({ nombre: 'ControlDisciplinarioFull', path: './ControlDisciplinarioFull.tsx', estado: 'ok' });
    } catch {
      checks.push({ nombre: 'ControlDisciplinarioFull', path: './ControlDisciplinarioFull.tsx', estado: 'error', mensaje: 'No se pudo cargar' });
    }

    try {
      require('./DashboardKanbanOperativo');
      checks.push({ nombre: 'DashboardKanbanOperativo', path: './DashboardKanbanOperativo.tsx', estado: 'ok' });
    } catch {
      checks.push({ nombre: 'DashboardKanbanOperativo', path: './DashboardKanbanOperativo.tsx', estado: 'error', mensaje: 'No se pudo cargar' });
    }

    try {
      require('./RevisionAprobacionJefe');
      checks.push({ nombre: 'RevisionAprobacionJefe', path: './RevisionAprobacionJefe.tsx', estado: 'ok' });
    } catch {
      checks.push({ nombre: 'RevisionAprobacionJefe', path: './RevisionAprobacionJefe.tsx', estado: 'error', mensaje: 'No se pudo cargar' });
    }

    try {
      require('./ExpedientesElectronicosWorldClass');
      checks.push({ nombre: 'ExpedientesElectronicosWorldClass', path: './ExpedientesElectronicosWorldClass.tsx', estado: 'ok' });
    } catch {
      checks.push({ nombre: 'ExpedientesElectronicosWorldClass', path: './ExpedientesElectronicosWorldClass.tsx', estado: 'error', mensaje: 'No se pudo cargar' });
    }

    try {
      require('./GestionTerminosAlertas');
      checks.push({ nombre: 'GestionTerminosAlertas', path: './GestionTerminosAlertas.tsx', estado: 'ok' });
    } catch {
      checks.push({ nombre: 'GestionTerminosAlertas', path: './GestionTerminosAlertas.tsx', estado: 'error', mensaje: 'No se pudo cargar' });
    }

    try {
      require('./GestionProfesionales');
      checks.push({ nombre: 'GestionProfesionales', path: './GestionProfesionales.tsx', estado: 'ok' });
    } catch {
      checks.push({ nombre: 'GestionProfesionales', path: './GestionProfesionales.tsx', estado: 'error', mensaje: 'No se pudo cargar' });
    }

    try {
      require('./ModuloConfiguracionPremium');
      checks.push({ nombre: 'ModuloConfiguracionPremium', path: './ModuloConfiguracionPremium.tsx', estado: 'ok' });
    } catch {
      checks.push({ nombre: 'ModuloConfiguracionPremium', path: './ModuloConfiguracionPremium.tsx', estado: 'error', mensaje: 'No se pudo cargar' });
    }

    try {
      require('./ModalCompartirExpediente');
      checks.push({ nombre: 'ModalCompartirExpediente', path: './ModalCompartirExpediente.tsx', estado: 'ok' });
    } catch {
      checks.push({ nombre: 'ModalCompartirExpediente', path: './ModalCompartirExpediente.tsx', estado: 'error', mensaje: 'No se pudo cargar' });
    }

    try {
      require('../CreateNoticiaModal');
      checks.push({ nombre: 'CreateNoticiaModal', path: '../CreateNoticiaModal.tsx', estado: 'ok' });
    } catch {
      checks.push({ nombre: 'CreateNoticiaModal', path: '../CreateNoticiaModal.tsx', estado: 'error', mensaje: 'No se pudo cargar' });
    }

    return checks;
  };

  const checks = verificarComponentes();
  const errores = checks.filter(c => c.estado === 'error').length;
  const warnings = checks.filter(c => c.estado === 'warning').length;
  const ok = checks.filter(c => c.estado === 'ok').length;

  if (!mostrarDiagnostico) {
    return (
      <button
        onClick={() => setMostrarDiagnostico(true)}
        className="fixed bottom-4 right-4 px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg text-xs font-bold hover:bg-blue-700 transition z-50"
      >
        🔍 Diagnóstico
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-2xl z-50 border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-white" />
          <h3 className="font-bold text-white text-sm">Diagnóstico del Módulo</h3>
        </div>
        <button
          onClick={() => setMostrarDiagnostico(false)}
          className="text-white hover:bg-white/20 rounded p-1 transition"
        >
          ✕
        </button>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
            <p className="text-xs text-green-600 font-bold">OK</p>
            <p className="text-lg font-bold text-green-700">{ok}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
            <p className="text-xs text-yellow-600 font-bold">Warning</p>
            <p className="text-lg font-bold text-yellow-700">{warnings}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
            <p className="text-xs text-red-600 font-bold">Error</p>
            <p className="text-lg font-bold text-red-700">{errores}</p>
          </div>
        </div>

        {/* Lista de componentes */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-700 mb-2">Componentes Verificados:</h4>
          {checks.map((check, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg border ${
                check.estado === 'ok'
                  ? 'bg-green-50 border-green-200'
                  : check.estado === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {check.estado === 'ok' && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                {check.estado === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                {check.estado === 'error' && <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{check.nombre}</p>
                  <p className="text-xs text-gray-600 truncate">{check.path}</p>
                  {check.mensaje && <p className="text-xs text-red-600 mt-1">{check.mensaje}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Estado general */}
        <div className="mt-4 p-3 rounded-lg" style={{ background: errores === 0 ? '#D1FAE5' : '#FEE2E2' }}>
          <p className="text-xs font-bold" style={{ color: errores === 0 ? '#065F46' : '#991B1B' }}>
            {errores === 0 ? '✅ Módulo completamente funcional' : '⚠️ Se encontraron errores en el módulo'}
          </p>
          {errores === 0 && (
            <p className="text-xs mt-1" style={{ color: '#065F46' }}>
              Todos los componentes se cargaron correctamente.
            </p>
          )}
        </div>

        {/* Información adicional */}
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Módulo:</strong> Control Interno Disciplinario v3.0 PREMIUM
          </p>
          <p className="text-xs text-blue-800 mt-1">
            <strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}
          </p>
          <p className="text-xs text-blue-800 mt-1">
            <strong>Componentes Totales:</strong> {checks.length}
          </p>
        </div>
      </div>
    </div>
  );
}
