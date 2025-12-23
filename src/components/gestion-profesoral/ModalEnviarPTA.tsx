import { useState } from 'react';
import * as React from 'react';
import { X, Send, User, FileText, Calendar, CheckCircle, Clock, TrendingUp, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ButtonSIGL } from '../esap/gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../esap/gestion-legal/design-system/BadgeSIGL';

interface PTA {
  id: string;
  codigo: string;
  docente: {
    nombre: string;
    email: string;
    documento: string;
    programa: string;
  };
  periodo: string;
  estado: string;
  fecha_creacion: string;
  horas_totales: number;
  horas_programables: number;
}

interface ModalEnviarPTAProps {
  isOpen: boolean;
  onClose: () => void;
  ptas: PTA[];
  onEnviar: (pta: PTA) => void;
  ptaPreseleccionado?: PTA | null; // PTA pre-seleccionado (para botón individual)
}

export function ModalEnviarPTA({ isOpen, onClose, ptas, onEnviar, ptaPreseleccionado = null }: ModalEnviarPTAProps) {
  const [selectedPTA, setSelectedPTA] = useState<PTA | null>(null);
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Si hay un PTA preseleccionado, usarlo y saltar directo a confirmación
  React.useEffect(() => {
    if (isOpen && ptaPreseleccionado) {
      setSelectedPTA(ptaPreseleccionado);
      setShowConfirmacion(true);
    } else if (isOpen) {
      setShowConfirmacion(false);
      setSelectedPTA(null);
    }
  }, [isOpen, ptaPreseleccionado]);

  // Filtrar PTAs en estado borrador que pueden ser enviados
  const ptasDisponibles = ptas.filter(
    pta => pta.estado === 'EN_CONSTRUCCION' || pta.estado === 'BORRADOR'
  );

  // Filtrar por búsqueda
  const ptasFiltrados = ptasDisponibles.filter(pta =>
    pta.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pta.docente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pta.docente.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSeleccionarPTA = (pta: PTA) => {
    setSelectedPTA(pta);
  };

  const handleContinuar = () => {
    if (selectedPTA) {
      setShowConfirmacion(true);
    }
  };

  const handleConfirmarEnvio = () => {
    if (selectedPTA) {
      onEnviar(selectedPTA);
      setShowConfirmacion(false);
      setSelectedPTA(null);
      setSearchTerm('');
      onClose();
    }
  };

  const handleCancelar = () => {
    setShowConfirmacion(false);
    setSelectedPTA(null);
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleCancelar}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          {!showConfirmacion ? (
            // PASO 1: Seleccionar PTA
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Enviar PTA a Aprobación</h2>
                      <p className="text-sm text-white/90 mt-0.5">
                        Seleccione el PTA que desea enviar a revisión
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancelar}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {/* Buscador */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Buscar por código, nombre o email del docente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                  />
                </div>

                {/* Lista de PTAs */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {ptasFiltrados.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">No hay PTAs disponibles para enviar</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {searchTerm
                          ? 'Intenta con otro término de búsqueda'
                          : 'Todos los PTAs ya han sido enviados a revisión'}
                      </p>
                    </div>
                  ) : (
                    ptasFiltrados.map((pta) => (
                      <motion.div
                        key={pta.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`
                          border-2 rounded-xl p-4 cursor-pointer transition-all
                          ${selectedPTA?.id === pta.id
                            ? 'border-[#003DA5] bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-[#003DA5] hover:shadow-sm'
                          }
                        `}
                        onClick={() => handleSeleccionarPTA(pta)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Radio Button */}
                          <div className="mt-1">
                            <div
                              className={`
                                w-5 h-5 rounded-full border-2 flex items-center justify-center
                                ${selectedPTA?.id === pta.id
                                  ? 'border-[#003DA5] bg-[#003DA5]'
                                  : 'border-gray-300'
                                }
                              `}
                            >
                              {selectedPTA?.id === pta.id && (
                                <div className="w-2.5 h-2.5 bg-white rounded-full" />
                              )}
                            </div>
                          </div>

                          {/* Contenido */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-bold text-gray-900">{pta.codigo}</h3>
                                <BadgeSIGL variant="warning" className="mt-1">
                                  {pta.estado}
                                </BadgeSIGL>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Periodo</p>
                                <p className="text-sm font-medium text-gray-900">{pta.periodo}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                              <div className="flex items-start gap-2">
                                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {pta.docente.nombre}
                                  </p>
                                  <p className="text-xs text-gray-500">{pta.docente.email}</p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                  <p className="text-sm text-gray-600">
                                    {pta.docente.programa}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {pta.horas_totales}h / {pta.horas_programables}h
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <p className="text-xs text-gray-500">
                                Creado: {pta.fecha_creacion}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Info */}
                {ptasFiltrados.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">📋 Total:</span> {ptasFiltrados.length} PTA(s) disponible(s) para enviar
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <ButtonSIGL variant="outline" onClick={handleCancelar}>
                  Cancelar
                </ButtonSIGL>
                <ButtonSIGL
                  variant="primary"
                  onClick={handleContinuar}
                  disabled={!selectedPTA}
                >
                  Continuar
                </ButtonSIGL>
              </div>
            </>
          ) : (
            // PASO 2: Confirmación de envío
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Confirmar Envío</h2>
                      <p className="text-sm text-white/90 mt-0.5">
                        Revise la información antes de enviar
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConfirmacion(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {selectedPTA && (
                  <>
                    {/* Mensaje principal */}
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        ¿Confirma el envío del siguiente PTA?
                      </h3>
                      <p className="text-sm text-gray-600">
                        El PTA será enviado a aprobación y no podrá ser editado hasta recibir una respuesta
                      </p>
                    </div>

                    {/* Información del PTA */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                      <div className="space-y-4">
                        {/* PTA */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                            Plan de Trabajo Académico
                          </p>
                          <p className="text-lg font-bold text-gray-900">{selectedPTA.codigo}</p>
                          <BadgeSIGL variant="warning" className="mt-1">
                            {selectedPTA.periodo}
                          </BadgeSIGL>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-blue-200" />

                        {/* Enviado a */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                            Enviado a:
                          </p>
                          <div className="bg-white rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-gray-900">
                                  {selectedPTA.docente.nombre}
                                </p>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  {selectedPTA.docente.email}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span>📄 {selectedPTA.docente.documento}</span>
                                  <span>•</span>
                                  <span>🏫 {selectedPTA.docente.programa}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Detalles adicionales */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Horas Asignadas</p>
                            <p className="text-lg font-bold text-gray-900">
                              {selectedPTA.horas_totales}h
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Horas Programables</p>
                            <p className="text-lg font-bold text-gray-900">
                              {selectedPTA.horas_programables}h
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advertencia */}
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="text-amber-600 mt-0.5">⚠️</div>
                        <div>
                          <p className="text-sm font-medium text-amber-900">Importante:</p>
                          <ul className="text-sm text-amber-800 mt-1 space-y-1 list-disc list-inside">
                            <li>El PTA será enviado al Nivel 1 (Coordinador Académico)</li>
                            <li>No podrá ser editado hasta recibir feedback</li>
                            <li>Recibirá notificaciones del progreso de aprobación</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <ButtonSIGL variant="outline" onClick={() => setShowConfirmacion(false)}>
                  Volver
                </ButtonSIGL>
                <ButtonSIGL
                  variant="primary"
                  onClick={handleConfirmarEnvio}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Confirmar Envío
                </ButtonSIGL>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}