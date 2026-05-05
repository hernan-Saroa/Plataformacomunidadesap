/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL GESTIÓN DE ACTAS - DISEÑO WORLD CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Modal para gestionar actas y diligencias del proceso disciplinario.
 * 
 * CARACTERÍSTICAS:
 * - ✅ Diseño World Class con ResponsiveModal
 * - ✅ Sistema de nomenclatura única (ACT-XXX-2025)
 * - ✅ Tipos de acta predefinidos
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
import { FileCheck, Users, Eye, Download, Plus, Info, Tag } from 'lucide-react';
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

interface Acta {
  id: string;
  nomenclatura: string;
  tipo: string;
  fecha: string;
  asistentes: number;
  estado: string;
}

interface ModalGestionActasProps {
  isOpen: boolean;
  proceso: Proceso;
  onClose: () => void;
}

interface TipoActa {
  id: string;
  nombre: string;
  icon: any;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIPOS_ACTA: TipoActa[] = [
  { id: 'audiencia', nombre: 'Acta de Audiencia', icon: Users, color: '#8B5CF6' },
  { id: 'descargos', nombre: 'Acta de Descargos', icon: FileCheck, color: '#10B981' },
  { id: 'pruebas', nombre: 'Acta de Práctica de Pruebas', icon: FileCheck, color: '#3B82F6' },
  { id: 'notificacion', nombre: 'Acta de Notificación Personal', icon: FileCheck, color: '#F59E0B' }
];

const ACTAS_MOCK: Acta[] = [
  {
    id: 'ac1',
    nomenclatura: 'ACT-001-2025',
    tipo: 'Audiencia Pública',
    fecha: '2025-01-15',
    asistentes: 5,
    estado: 'Firmada'
  },
  {
    id: 'ac2',
    nomenclatura: 'ACT-002-2025',
    tipo: 'Descargos',
    fecha: '2025-01-12',
    asistentes: 3,
    estado: 'Firmada'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ModalGestionActasWorldClass({
  isOpen,
  proceso,
  onClose
}: ModalGestionActasProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // STATES
  // ─────────────────────────────────────────────────────────────────────────

  const [vistaActual, setVistaActual] = useState<'lista' | 'crear'>('lista');
  const [actas] = useState<Acta[]>(ACTAS_MOCK);
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: Acta | null }>({
    show: false,
    documento: null
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleCrearActa = (tipo: TipoActa) => {
    toast.success('Acta en Creación', {
      description: `Se está generando el acta: ${tipo.nombre}`
    });
    setVistaActual('lista');
  };

  const handleDescargarActa = (acta: Acta) => {
    toast.success('Descarga iniciada', {
      description: `${acta.nomenclatura}.pdf se está descargando`
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────────────

  const proximaNomenclatura = previsualizarNomenclatura('ACTA');

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      <ResponsiveModal
        isOpen={isOpen}
        onClose={onClose}
        title="Gestión de Actas"
        subtitle={`${proceso.numeroProceso} - Actas y Diligencias`}
        size="xl"
        footer={
          <ModalButtonGroup>
            <ModalButtonCancel onClick={onClose}>
              Cerrar
            </ModalButtonCancel>
            {vistaActual === 'lista' ? (
              <ModalButtonPrimary onClick={() => setVistaActual('crear')}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Nueva Acta
              </ModalButtonPrimary>
            ) : (
              <ModalButtonCancel onClick={() => setVistaActual('lista')}>
                Ver Lista de Actas
              </ModalButtonCancel>
            )}
          </ModalButtonGroup>
        }
      >
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setVistaActual('lista')}
              className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all ${
                vistaActual === 'lista'
                  ? 'bg-green-100 text-green-700 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileCheck className="w-4 h-4 inline mr-2" />
              Lista de Actas
            </button>
            <button
              onClick={() => setVistaActual('crear')}
              className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all ${
                vistaActual === 'crear'
                  ? 'bg-green-100 text-green-700 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Crear Nueva Acta
            </button>
          </div>

          {vistaActual === 'lista' ? (
            // Vista: Lista de Actas
            <div className="space-y-3">
              {actas.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 font-semibold">No hay actas creadas</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Crea tu primera acta usando el botón "Crear Nueva Acta"
                  </p>
                </div>
              ) : (
                actas.map((acta) => (
                  <Card key={acta.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <BadgeNomenclatura
                            nomenclatura={acta.nomenclatura}
                            tipo="ACTA"
                            size="md"
                            showIcon={true}
                            showCopy={true}
                          />
                          <Badge className="bg-green-100 text-green-700">
                            {acta.estado}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">{acta.tipo}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600 text-xs">Fecha:</p>
                            <p className="font-bold text-gray-900">{acta.fecha}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Asistentes:</p>
                            <p className="font-bold text-gray-900">{acta.asistentes} personas</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Estado:</p>
                            <p className="font-bold text-gray-900">{acta.estado}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setVisorDocumento({ show: true, documento: acta })}
                          title="Ver acta"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDescargarActa(acta)}
                          title="Descargar acta"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            // Vista: Crear Nueva Acta
            <div className="space-y-4">
              {/* Banner Informativo */}
              <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-900 mb-2">
                      Selecciona el tipo de acta a crear
                    </p>
                    <p className="text-xs text-green-700 mb-3">
                      El sistema generará automáticamente el acta con los datos del proceso
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-green-200">
                      <Tag className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-900 font-medium">
                        Nomenclatura asignada:
                      </span>
                      <BadgeNomenclatura
                        nomenclatura={proximaNomenclatura}
                        tipo="ACTA"
                        size="sm"
                        showIcon={false}
                        showCopy={false}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Grid de Tipos de Acta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TIPOS_ACTA.map((tipo) => {
                  const IconComponent = tipo.icon;
                  return (
                    <button
                      key={tipo.id}
                      onClick={() => handleCrearActa(tipo)}
                      className="p-4 border-2 rounded-xl hover:shadow-md transition-all text-left group hover:scale-105"
                      style={{ borderColor: tipo.color + '40' }}
                    >
                      <IconComponent
                        className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform"
                        style={{ color: tipo.color }}
                      />
                      <p className="font-bold text-sm text-gray-900">{tipo.nombre}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ResponsiveModal>

      {/* Modal Visor de Acta */}
      {visorDocumento.show && visorDocumento.documento && (
        <ResponsiveModal
          isOpen={visorDocumento.show}
          onClose={() => setVisorDocumento({ show: false, documento: null })}
          title="Visor de Acta"
          subtitle={visorDocumento.documento.nomenclatura}
          size="xl"
          zIndex={10000}
          footer={
            <ModalButtonGroup>
              <ModalButtonCancel onClick={() => setVisorDocumento({ show: false, documento: null })}>
                Cerrar
              </ModalButtonCancel>
              <ModalButtonPrimary onClick={() => handleDescargarActa(visorDocumento.documento!)}>
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </ModalButtonPrimary>
            </ModalButtonGroup>
          }
        >
          <div className="bg-gray-100 rounded-lg p-8 min-h-[500px] flex items-center justify-center">
            <div className="text-center">
              <FileCheck className="w-24 h-24 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-semibold text-lg mb-2">Vista Previa del Acta</p>
              <p className="text-sm text-gray-500 mb-4">{visorDocumento.documento.nomenclatura}</p>
              <p className="text-xs text-gray-700 font-medium mb-4">{visorDocumento.documento.tipo}</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Fecha: {visorDocumento.documento.fecha}</p>
                <p>Asistentes: {visorDocumento.documento.asistentes} personas</p>
                <p>Estado: {visorDocumento.documento.estado}</p>
              </div>
            </div>
          </div>
        </ResponsiveModal>
      )}
    </>
  );
}
