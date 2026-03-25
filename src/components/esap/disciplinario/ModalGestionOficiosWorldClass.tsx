/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL GESTIÓN DE OFICIOS - DISEÑO WORLD CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Modal para gestionar oficios y comunicaciones oficiales del proceso.
 * 
 * CARACTERÍSTICAS:
 * - ✅ Diseño World Class con ResponsiveModal
 * - ✅ Sistema de nomenclatura única (OF-XXX-2025)
 * - ✅ Estados de envío y respuesta
 * - ✅ Visor de documentos integrado
 * - ✅ Diseño corporativo ESAP
 * - ✅ Responsive Mobile First
 * 
 * @version 2.0.0 (World Class)
 * @date 10 de Febrero de 2026
 */

import { useState } from 'react';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { ModalButtonPrimary, ModalButtonCancel, ModalButtonGroup } from '@/components/ui/ModalButtons';
import { Mail, Send, Eye, Download, Plus, CheckCircle, Clock, Info, Tag } from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import { BadgeNomenclatura } from './components/BadgeNomenclatura';
import { previsualizarNomenclatura } from './utils/nomenclaturaDocumentos';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Proceso {
  numeroProceso: string;
  denunciado: { nombre: string };
  etapaActual: string;
}

interface Oficio {
  id: string;
  nomenclatura: string;
  destinatario: string;
  asunto: string;
  fecha: string;
  estado: 'Enviado' | 'Pendiente' | 'Con Respuesta';
  tipo: string;
}

interface ModalGestionOficiosProps {
  isOpen: boolean;
  proceso: Proceso;
  onClose: () => void;
  onCrearOficio: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const OFICIOS_MOCK: Oficio[] = [
  {
    id: 'o1',
    nomenclatura: 'OF-001-2025',
    destinatario: 'Contraloría General',
    asunto: 'Solicitud de Información Financiera',
    fecha: '2025-01-12',
    estado: 'Con Respuesta',
    tipo: 'Solicitud'
  },
  {
    id: 'o2',
    nomenclatura: 'OF-002-2025',
    destinatario: 'Procuraduría',
    asunto: 'Remisión de Expediente',
    fecha: '2025-01-10',
    estado: 'Enviado',
    tipo: 'Comunicación'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ModalGestionOficiosWorldClass({
  isOpen,
  proceso,
  onClose,
  onCrearOficio
}: ModalGestionOficiosProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // STATES
  // ─────────────────────────────────────────────────────────────────────────

  const [oficios] = useState<Oficio[]>(OFICIOS_MOCK);
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: Oficio | null }>({
    show: false,
    documento: null
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleCrearOficio = () => {
    onCrearOficio();
    onClose();
  };

  const handleDescargarOficio = (oficio: Oficio) => {
    toast.success('Descarga iniciada', {
      description: `${oficio.nomenclatura}.pdf se está descargando`
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────────────

  const proximaNomenclatura = previsualizarNomenclatura('OFICIO');

  const getEstadoBadge = (estado: Oficio['estado']) => {
    const estados = {
      'Enviado': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Send },
      'Pendiente': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      'Con Respuesta': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle }
    };
    return estados[estado] || estados['Pendiente'];
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      <ResponsiveModal
        isOpen={isOpen}
        onClose={onClose}
        title="Gestión de Oficios"
        subtitle={`${proceso.numeroProceso} - Comunicaciones Oficiales`}
        size="xl"
        footer={
          <ModalButtonGroup>
            <ModalButtonCancel onClick={onClose}>
              Cerrar
            </ModalButtonCancel>
            <ModalButtonPrimary onClick={handleCrearOficio}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Nuevo Oficio
            </ModalButtonPrimary>
          </ModalButtonGroup>
        }
      >
        <div className="space-y-6">
          {/* Banner Informativo */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 mb-2">
                  Comunicaciones Oficiales del Proceso
                </p>
                <p className="text-xs text-blue-700 mb-3">
                  Todos los oficios cuentan con nomenclatura única y trazabilidad completa
                </p>
                <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-blue-200">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-900 font-medium">
                    Próxima nomenclatura:
                  </span>
                  <BadgeNomenclatura
                    nomenclatura={proximaNomenclatura}
                    tipo="OFICIO"
                    size="sm"
                    showIcon={false}
                    showCopy={false}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Lista de Oficios */}
          <div className="space-y-3">
            {oficios.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 font-semibold">No hay oficios creados</p>
                <p className="text-sm text-gray-500 mt-2">
                  Crea tu primer oficio usando el botón "Crear Nuevo Oficio"
                </p>
              </div>
            ) : (
              oficios.map((oficio) => {
                const estadoConfig = getEstadoBadge(oficio.estado);
                const EstadoIcon = estadoConfig.icon;
                
                return (
                  <Card key={oficio.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <BadgeNomenclatura
                            nomenclatura={oficio.nomenclatura}
                            tipo="OFICIO"
                            size="md"
                            showIcon={true}
                            showCopy={true}
                          />
                          <Badge className={`${estadoConfig.bg} ${estadoConfig.text}`}>
                            <EstadoIcon className="w-3 h-3 mr-1" />
                            {oficio.estado}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">{oficio.asunto}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600 text-xs">Destinatario:</p>
                            <p className="font-bold text-gray-900">{oficio.destinatario}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Tipo:</p>
                            <p className="font-bold text-gray-900">{oficio.tipo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Fecha:</p>
                            <p className="font-bold text-gray-900">{oficio.fecha}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setVisorDocumento({ show: true, documento: oficio })}
                          title="Ver oficio"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDescargarOficio(oficio)}
                          title="Descargar oficio"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </ResponsiveModal>

      {/* Modal Visor de Oficio */}
      {visorDocumento.show && visorDocumento.documento && (
        <ResponsiveModal
          isOpen={visorDocumento.show}
          onClose={() => setVisorDocumento({ show: false, documento: null })}
          title="Visor de Oficio"
          subtitle={visorDocumento.documento.nomenclatura}
          size="xl"
          footer={
            <ModalButtonGroup>
              <ModalButtonCancel onClick={() => setVisorDocumento({ show: false, documento: null })}>
                Cerrar
              </ModalButtonCancel>
              <ModalButtonPrimary onClick={() => handleDescargarOficio(visorDocumento.documento!)}>
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </ModalButtonPrimary>
            </ModalButtonGroup>
          }
        >
          <div className="bg-gray-100 rounded-lg p-8 min-h-[500px] flex items-center justify-center">
            <div className="text-center">
              <Mail className="w-24 h-24 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-semibold text-lg mb-2">Vista Previa del Oficio</p>
              <p className="text-sm text-gray-500 mb-4">{visorDocumento.documento.nomenclatura}</p>
              <p className="text-xs text-gray-700 font-medium mb-4">{visorDocumento.documento.asunto}</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Destinatario: {visorDocumento.documento.destinatario}</p>
                <p>Tipo: {visorDocumento.documento.tipo}</p>
                <p>Fecha: {visorDocumento.documento.fecha}</p>
                <p>Estado: {visorDocumento.documento.estado}</p>
              </div>
            </div>
          </div>
        </ResponsiveModal>
      )}
    </>
  );
}
