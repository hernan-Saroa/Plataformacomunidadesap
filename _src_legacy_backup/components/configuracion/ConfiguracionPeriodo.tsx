/**
 * Componente de Configuración de Período - ESAP PTA
 * Permite configurar la periodicidad (semestral/anual) del sistema
 * Implementa REQ-MOD-PTA-002
 */

import React, { useState, useEffect } from 'react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { Calendar, Clock, Settings, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { periodParametersService } from '../../services/periodParametersService';
import { ParametroPeriodo, TipoPeriodo } from '../../types/periodParameters';
import { ModalHeaderClean } from '../design-system/ModalHeaderClean';

interface ConfiguracionPeriodoProps {
  usuarioActual: {
    id: string;
    nombre: string;
    rol: string;
  };
}

export const ConfiguracionPeriodo: React.FC<ConfiguracionPeriodoProps> = ({ usuarioActual }) => {
  const [parametroActivo, setParametroActivo] = useState<ParametroPeriodo | null>(null);
  const [historico, setHistorico] = useState<ParametroPeriodo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('SEMESTRAL');
  const [periodoAcademico, setPeriodoAcademico] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const activo = periodParametersService.getParametroActivo();
    const hist = periodParametersService.getHistorico();
    setParametroActivo(activo);
    setHistorico(hist);
  };

  const handleOpenModal = () => {
    // Pre-rellenar con valores sugeridos
    const nextPeriodo = parametroActivo?.periodoAcademico === '2025-1' ? '2025-2' : '2026-1';
    setPeriodoAcademico(nextPeriodo);
    setTipoPeriodo(parametroActivo?.tipoPeriodo || 'SEMESTRAL');
    
    if (nextPeriodo === '2025-2') {
      setFechaInicio('2025-08-01');
      setFechaFin('2025-12-31');
    } else {
      setFechaInicio('2026-02-01');
      setFechaFin('2026-06-30');
    }
    
    setDescripcion('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validaciones
    if (!periodoAcademico || !fechaInicio || !fechaFin) {
      setErrorMsg('Todos los campos son obligatorios');
      return;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (fin <= inicio) {
      setErrorMsg('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    setIsLoading(true);

    try {
      periodParametersService.crearParametro(
        tipoPeriodo,
        periodoAcademico,
        inicio,
        fin,
        descripcion || `Período ${tipoPeriodo.toLowerCase()} ${periodoAcademico}`,
        usuarioActual.nombre
      );

      loadData();
      setShowModal(false);
      setIsLoading(false);
    } catch (error) {
      setErrorMsg('Error al crear el parámetro de período');
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Configuración de Período Académico</h1>
          <p className="text-slate-600 mt-1">
            Gestión de periodicidad (semestral/anual) y horas totales del sistema PTA
          </p>
        </div>
        <ButtonSIGL onClick={handleOpenModal} icon={Plus}>
          Nuevo Período
        </ButtonSIGL>
      </div>

      {/* Parámetro Activo */}
      {parametroActivo && (
        <CardSIGL>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Settings className="w-6 h-6 text-[#2962FF]" />
              </div>
              <div>
                <h2 className="text-slate-900">Período Activo</h2>
                <p className="text-slate-600 text-sm">Configuración actual del sistema</p>
              </div>
            </div>
            <BadgeSIGL variant="success" icon={CheckCircle2}>
              ACTIVO
            </BadgeSIGL>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Tipo de Período */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600">Tipo de Período</span>
              </div>
              <p className="text-slate-900">{parametroActivo.tipoPeriodo}</p>
            </div>

            {/* Horas Totales */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600">Horas Totales</span>
              </div>
              <p className="text-slate-900">{parametroActivo.horasTotales}h</p>
            </div>

            {/* Período Académico */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600">Período Académico</span>
              </div>
              <p className="text-slate-900">{parametroActivo.periodoAcademico}</p>
            </div>

            {/* Fechas */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600">Vigencia</span>
              </div>
              <p className="text-slate-900 text-sm">
                {formatDate(parametroActivo.fechaInicio)} - {formatDate(parametroActivo.fechaFin)}
              </p>
            </div>
          </div>

          {parametroActivo.descripcion && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-700">{parametroActivo.descripcion}</p>
            </div>
          )}
        </CardSIGL>
      )}

      {/* Histórico */}
      <CardSIGL>
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-slate-600" />
          <h2 className="text-slate-900">Histórico de Períodos</h2>
        </div>

        <div className="space-y-3">
          {historico.map((parametro) => (
            <div
              key={parametro.id}
              className={`p-4 rounded-lg border-2 ${
                parametro.activo
                  ? 'border-green-200 bg-green-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-slate-900">
                      {parametro.periodoAcademico} - {parametro.tipoPeriodo}
                    </span>
                    {parametro.activo && (
                      <BadgeSIGL variant="success" size="sm">
                        Activo
                      </BadgeSIGL>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    <span>
                      {formatDate(parametro.fechaInicio)} - {formatDate(parametro.fechaFin)}
                    </span>
                    <span>{parametro.horasTotales}h totales</span>
                    <span>Creado por {parametro.creadoPor}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardSIGL>

      {/* Modal Nuevo Período */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <ModalHeaderClean
              title="Nuevo Período Académico"
              subtitle="Configure la periodicidad y horas totales del sistema"
              onClose={() => setShowModal(false)}
            />

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Tipo de Período */}
                <div>
                  <label className="block text-sm text-slate-700 mb-2">
                    Tipo de Período <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTipoPeriodo('SEMESTRAL')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        tipoPeriodo === 'SEMESTRAL'
                          ? 'border-[#2962FF] bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-slate-900 mb-1">Semestral</div>
                      <div className="text-sm text-slate-600">800 horas</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoPeriodo('ANUAL')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        tipoPeriodo === 'ANUAL'
                          ? 'border-[#2962FF] bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-slate-900 mb-1">Anual</div>
                      <div className="text-sm text-slate-600">1,600 horas</div>
                    </button>
                  </div>
                </div>

                {/* Período Académico */}
                <div>
                  <label className="block text-sm text-slate-700 mb-2">
                    Período Académico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={periodoAcademico}
                    onChange={(e) => setPeriodoAcademico(e.target.value)}
                    placeholder="Ej: 2025-1, 2025-2, 2026"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Formato: Año-Semestre (ej: 2025-1) o solo Año para período anual
                  </p>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-700 mb-2">
                      Fecha de Inicio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 mb-2">
                      Fecha de Fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm text-slate-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ingrese una descripción para este período académico"
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2962FF] focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Alerta Informativa */}
                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                      <p className="mb-2">
                        <strong>Importante:</strong> Al crear un nuevo período:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-amber-800">
                        <li>El período anterior se desactivará automáticamente</li>
                        <li>Todos los PTAs nuevos se crearán con las horas del nuevo período</li>
                        <li>Los PTAs existentes mantendrán su configuración original</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {errorMsg && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <p className="text-sm text-red-900">{errorMsg}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end mt-6 pt-6 border-t-2 border-slate-100">
                <ButtonSIGL
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </ButtonSIGL>
                <ButtonSIGL type="submit" disabled={isLoading}>
                  {isLoading ? 'Creando...' : 'Crear Período'}
                </ButtonSIGL>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
