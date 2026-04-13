/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL GESTIÓN DE AUTOS - DISEÑO WORLD CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Modal para gestionar Autos y Providencias en el proceso disciplinario.
 * 
 * CARACTERÍSTICAS:
 * - ✅ Diseño World Class con ResponsiveModal
 * - ✅ Vista de lista y creación
 * - ✅ Sistema de nomenclatura única (AUT-XXX-2025)
 * - ✅ Visor de documentos integrado
 * - ✅ Estados: Firmado, Notificado, Ejecutoriado
 * - ✅ Tipos de auto predefinidos
 * - ✅ Diseño corporativo ESAP
 * - ✅ Responsive Mobile First
 * 
 * @version 2.0.0 (World Class)
 * @date 10 de Febrero de 2026
 */

import { useState, useEffect } from 'react';
import { ResponsiveModal } from '@esap-mfe/shared-ui/ResponsiveModal';
import { ModalButtonPrimary, ModalButtonCancel, ModalButtonGroup } from '@esap-mfe/shared-ui/ModalButtons';
import {
  Scale, Search, FileText, FileCheck, CheckCircle, Archive, AlertTriangle,
  Eye, Download, FileSignature, Bell, Plus, Info, Tag, X
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import { BadgeNomenclatura } from './components/BadgeNomenclatura';
import { previsualizarNomenclatura } from './utils/nomenclaturaDocumentos';
import { disciplinaryService, AutoConfiguration } from '../../../services/api/disciplinary.service';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Proceso {
  numeroProceso: string;
  denunciado: Persona;
  denunciante: Persona;
  profesionalAsignado: Persona;
  cedula: string;
  noticiaOrigen: string;
  etapaActual: string;
}

interface Auto {
  id: string;
  nomenclatura: string;
  tipo: string;
  fecha: string;
  firmado: boolean;
  notificado: boolean;
  estado: string;
}

interface ModalGestionAutosProps {
  isOpen: boolean;
  proceso: Proceso;
  onClose: () => void;
  onCrearAuto: (tipoAuto: TipoAuto) => void;
}

interface TipoAuto {
  id: string;
  nombre: string;
  icon: any;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIPOS_AUTO: TipoAuto[] = [
  { id: 'apertura', nombre: 'Auto de Apertura', icon: Scale, color: '#8B5CF6' },
  { id: 'indagacion', nombre: 'Auto de Indagación Preliminar', icon: Search, color: '#06B6D4' },
  { id: 'investigacion', nombre: 'Auto de Apertura de Investigación', icon: FileText, color: '#10B981' },
  { id: 'pliego', nombre: 'Auto de Formulación de Pliego', icon: FileCheck, color: '#F59E0B' },
  { id: 'cierre', nombre: 'Auto de Cierre', icon: CheckCircle, color: '#22C55E' },
  { id: 'archivo', nombre: 'Auto de Archivo', icon: Archive, color: '#6B7280' },
  { id: 'sancion', nombre: 'Fallo con Sanción', icon: AlertTriangle, color: '#DC2626' },
  { id: 'absolutorio', nombre: 'Fallo Absolutorio', icon: CheckCircle, color: '#10B981' }
];

// Mock data - En producción vendría del backend
const AUTOS_MOCK: Auto[] = [
  {
    id: 'a1',
    nomenclatura: 'AUT-041-2025',
    tipo: 'Apertura',
    fecha: '2025-01-08',
    firmado: true,
    notificado: true,
    estado: 'Ejecutoriado'
  },
  {
    id: 'a2',
    nomenclatura: 'AUT-002-2025',
    tipo: 'Indagación Preliminar',
    fecha: '2025-01-10',
    firmado: true,
    notificado: false,
    estado: 'Pendiente Notificación'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ModalGestionAutosWorldClass({
  isOpen,
  proceso,
  onClose,
  onCrearAuto
}: ModalGestionAutosProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // STATES
  // ─────────────────────────────────────────────────────────────────────────

  const [vistaActual, setVistaActual] = useState<'lista' | 'crear'>('lista');
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: Auto | null }>({
    show: false,
    documento: null
  });
  const [autos] = useState<Auto[]>(AUTOS_MOCK);
  const [tiposAuto, setTiposAuto] = useState<TipoAuto[]>([]);
  const [loadingTiposAuto, setLoadingTiposAuto] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // EFECTO PARA CARGAR TIPOS DE AUTO DESDE EL BACKEND
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      cargarTiposAuto();
    }
  }, [isOpen]);

  const cargarTiposAuto = async () => {
    setLoadingTiposAuto(true);
    try {
      // Cargar autos parametrizados desde el backend
      const autosConfig = await disciplinaryService.getAutosConfigurationActive();
      
      // Verificar que hay datos
      if (autosConfig && Array.isArray(autosConfig) && autosConfig.length > 0) {
        // Mapear los datos del backend al formato del componente
        const tiposMapeados: TipoAuto[] = autosConfig.map((config) => ({
          id: config.tipo || config.id,
          nombre: config.nombre,
          icon: getIconForTipoAuto(config.tipo),
          color: getColorForTipoAuto(config.tipo)
        }));
        
        setTiposAuto(tiposMapeados);
      } else {
        // No hay datos en el backend, usar fallback
        console.log('No hay autos configurados en el backend, usando datos por defecto');
        setTiposAuto(TIPOS_AUTO);
      }
    } catch (error) {
      console.error('Error cargando tipos de auto:', error);
      // Si falla, usar los tipos por defecto
      setTiposAuto(TIPOS_AUTO);
      toast.error('No se pudieron cargar los tipos de auto parametrizados');
    } finally {
      setLoadingTiposAuto(false);
    }
  };

  // Función para obtener el icono según el tipo de auto
  const getIconForTipoAuto = (tipo: string) => {
    const tipoLower = tipo?.toLowerCase() || '';
    if (tipoLower.includes('apertura')) return Scale;
    if (tipoLower.includes('indagacion') || tipoLower.includes('indagación')) return Search;
    if (tipoLower.includes('investigacion') || tipoLower.includes('investigación')) return FileText;
    if (tipoLower.includes('pliego') || tipoLower.includes('cargo')) return FileCheck;
    if (tipoLower.includes('cierre')) return CheckCircle;
    if (tipoLower.includes('archivo')) return Archive;
    if (tipoLower.includes('sancion') || tipoLower.includes('sanción') || tipoLower.includes('fallo')) return AlertTriangle;
    if (tipoLower.includes('absolutorio')) return CheckCircle;
    return FileText; // Default
  };

  // Función para obtener el color según el tipo de auto
  const getColorForTipoAuto = (tipo: string) => {
    const tipoLower = tipo?.toLowerCase() || '';
    if (tipoLower.includes('apertura')) return '#8B5CF6';
    if (tipoLower.includes('indagacion') || tipoLower.includes('indagación')) return '#06B6D4';
    if (tipoLower.includes('investigacion') || tipoLower.includes('investigación')) return '#10B981';
    if (tipoLower.includes('pliego') || tipoLower.includes('cargo')) return '#F59E0B';
    if (tipoLower.includes('cierre')) return '#22C55E';
    if (tipoLower.includes('archivo')) return '#6B7280';
    if (tipoLower.includes('sancion') || tipoLower.includes('sanción') || tipoLower.includes('fallo')) return '#DC2626';
    if (tipoLower.includes('absolutorio')) return '#10B981';
    return '#8B5CF6'; // Default purple
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleCrearAuto = (tipo: TipoAuto) => {
    onCrearAuto(tipo);
    onClose();
  };

  const handleDescargarAuto = (auto: Auto) => {
    toast.success('Descarga iniciada', {
      description: `${auto.nomenclatura}.pdf se está descargando`
    });
  };

  const handleReset = () => {
    setVistaActual('lista');
    setVisorDocumento({ show: false, documento: null });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────────────

  const proximaNomenclatura = previsualizarNomenclatura('AUTO');

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      <ResponsiveModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Gestión de Autos y Providencias"
        subtitle={`${proceso.numeroProceso} - ${proceso.denunciado.nombre}`}
        size="xl"
        footer={
          <ModalButtonGroup>
            <ModalButtonCancel onClick={handleClose}>
              Cerrar
            </ModalButtonCancel>
            {vistaActual === 'lista' ? (
              <ModalButtonPrimary onClick={() => setVistaActual('crear')}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Nuevo Auto
              </ModalButtonPrimary>
            ) : (
              <ModalButtonCancel onClick={() => setVistaActual('lista')}>
                <FileText className="w-4 h-4 mr-2" />
                Ver Lista de Autos
              </ModalButtonCancel>
            )}
          </ModalButtonGroup>
        }
      >
        <div className="space-y-6">
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* TABS */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setVistaActual('lista')}
              className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all ${
                vistaActual === 'lista'
                  ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Lista de Autos
            </button>
            <button
              onClick={() => setVistaActual('crear')}
              className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all ${
                vistaActual === 'crear'
                  ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Crear Nuevo Auto
            </button>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* CONTENIDO DINÁMICO */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

          {vistaActual === 'lista' ? (
            // ─────────────────────────────────────────────────────────────────
            // VISTA: LISTA DE AUTOS
            // ─────────────────────────────────────────────────────────────────
            <div className="space-y-3">
              {autos.length === 0 ? (
                <div className="text-center py-12">
                  <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 font-semibold">No hay autos creados</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Crea tu primer auto usando el botón "Crear Nuevo Auto"
                  </p>
                </div>
              ) : (
                autos.map((auto) => (
                  <Card key={auto.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          {/* Badge de Nomenclatura */}
                          <BadgeNomenclatura
                            nomenclatura={auto.nomenclatura}
                            tipo="AUTO"
                            size="md"
                            showIcon={true}
                            showCopy={true}
                          />
                          
                          {/* Badge Firmado */}
                          {auto.firmado && (
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              <FileSignature className="w-3 h-3 mr-1" />
                              Firmado
                            </Badge>
                          )}
                          
                          {/* Badge Notificado */}
                          {auto.notificado && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                              <Bell className="w-3 h-3 mr-1" />
                              Notificado
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600 text-xs">Tipo:</p>
                            <p className="font-bold text-gray-900">{auto.tipo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Fecha:</p>
                            <p className="font-bold text-gray-900">{auto.fecha}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Estado:</p>
                            <p className="font-bold text-gray-900">{auto.estado}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setVisorDocumento({ show: true, documento: auto })}
                          title="Ver documento"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDescargarAuto(auto)}
                          title="Descargar documento"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
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
            // ─────────────────────────────────────────────────────────────────
            // VISTA: CREAR NUEVO AUTO
            // ─────────────────────────────────────────────────────────────────
            <div className="space-y-4">
              {/* Banner Informativo */}
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-purple-900 mb-2">
                      Selecciona el tipo de auto a crear
                    </p>
                    <p className="text-xs text-purple-700 mb-3">
                      El sistema pre-llenará automáticamente los campos del documento con la información del proceso
                    </p>
                    
                    {/* Vista previa de nomenclatura */}
                    <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-purple-200">
                      <Tag className="w-4 h-4 text-purple-600" />
                      <span className="text-xs text-purple-900 font-medium">
                        Nomenclatura asignada:
                      </span>
                      <BadgeNomenclatura
                        nomenclatura={proximaNomenclatura}
                        tipo="AUTO"
                        size="sm"
                        showIcon={false}
                        showCopy={false}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Grid de Tipos de Auto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {loadingTiposAuto ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <p className="text-sm text-gray-500 mt-2">Cargando tipos de auto...</p>
                  </div>
                ) : (tiposAuto.length > 0 ? (
                  tiposAuto.map((tipo) => {
                    const IconComponent = tipo.icon;
                    return (
                      <button
                        key={tipo.id}
                        onClick={() => handleCrearAuto(tipo)}
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
                  })
                ) : (
                  <div className="col-span-full text-center py-8">
                    <Scale className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-600 font-semibold">No hay tipos de auto configurados</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure los tipos de auto en la sección de configuración
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ResponsiveModal>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL VISOR DE DOCUMENTO */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {visorDocumento.show && visorDocumento.documento && (
        <ResponsiveModal
          isOpen={visorDocumento.show}
          onClose={() => setVisorDocumento({ show: false, documento: null })}
          title="Visor de Documento"
          subtitle={visorDocumento.documento.nomenclatura}
          size="xl"
          footer={
            <ModalButtonGroup>
              <ModalButtonCancel onClick={() => setVisorDocumento({ show: false, documento: null })}>
                Cerrar
              </ModalButtonCancel>
              <ModalButtonPrimary onClick={() => handleDescargarAuto(visorDocumento.documento!)}>
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </ModalButtonPrimary>
            </ModalButtonGroup>
          }
        >
          <div className="bg-gray-100 rounded-lg p-8 min-h-[500px] flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-24 h-24 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-semibold text-lg mb-2">
                Vista Previa del Documento
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {visorDocumento.documento.nomenclatura} - {visorDocumento.documento.tipo}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
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
