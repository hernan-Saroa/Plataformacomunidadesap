/**
 * MÓDULO: CONFIGURACIÓN DE PLANTILLA DE CERTIFICADOS LABORALES
 * - Gestiona la plantilla base que asegura homogeneidad de todos los certificados
 * - Permite modificar: firmante, grafo/firma, tipografía y colores
 * - Vista previa antes de publicar
 * - Sistema de auditoría completo (log de cambios)
 * - Versionamiento de plantillas
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Upload,
  Save,
  Eye,
  CheckCircle,
  AlertCircle,
  History,
  User,
  Edit3,
  Type,
  Palette,
  Image as ImageIcon,
  Calendar,
  Clock,
  Shield,
  RefreshCw,
  Download,
  X,
  PenTool,
  Info,
  CheckSquare,
  QrCode,
  Printer
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';

// Tipos
interface PlantillaConfig {
  id: string;
  version: string;
  estado: 'borrador' | 'en_revision' | 'publicada' | 'archivada';
  firmante: {
    nombre: string;
    documento: string;
    cargo: string;
  };
  grafoFirma: {
    url: string;
    nombre: string;
    tamaño: string;
  } | null;
  logoEntidad: {
    url: string;
    nombre: string;
    tamaño: string;
  } | null;
  tipografia: {
    fuente: string;
    tamaño: number;
    color: string;
  };
  fechaCreacion: string;
  fechaModificacion: string;
  creadoPor: string;
  modificadoPor: string;
}

interface LogCambio {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  cambios: string[];
  versionAnterior: string;
  versionNueva: string;
  plantillaSnapshot?: PlantillaConfig; // Snapshot completo de la plantilla en ese momento
}

const fuentesDisponibles = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Calibri', label: 'Calibri' },
  { value: 'Roboto', label: 'Roboto' },
];

export function ConfiguracionPlantilla() {
  const [activeTab, setActiveTab] = useState('configuracion');
  
  // Estado de la plantilla actual
  const [plantilla, setPlantilla] = useState<PlantillaConfig>({
    id: 'PLANT-001',
    version: '2.1.0',
    estado: 'publicada',
    firmante: {
      nombre: 'Dra. María Elena Bernal Torres',
      documento: '52.789.456',
      cargo: 'Directora de Talento Humano'
    },
    grafoFirma: {
      url: '/firmas/maria-bernal-firma.png',
      nombre: 'maria-bernal-firma.png',
      tamaño: '125 KB'
    },
    logoEntidad: {
      url: '/logos/esap-logo.png',
      nombre: 'esap-logo.png',
      tamaño: '150 KB'
    },
    tipografia: {
      fuente: 'Arial',
      tamaño: 12,
      color: '#000000'
    },
    fechaCreacion: '2024-01-15T10:00:00Z',
    fechaModificacion: '2025-01-10T14:30:00Z',
    creadoPor: 'Admin Sistema',
    modificadoPor: 'Coordinador TH'
  });

  // Estado de edición (borrador temporal)
  const [borrador, setBorrador] = useState<PlantillaConfig>({...plantilla});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Estados de modales
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAutorizacionOpen, setIsAutorizacionOpen] = useState(false);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [isRestaurarOpen, setIsRestaurarOpen] = useState(false);
  
  // Estado de archivo de firma
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Estado para la versión seleccionada a restaurar
  const [versionARestaurar, setVersionARestaurar] = useState<LogCambio | null>(null);

  // Mock log de cambios con snapshots (últimas 5 versiones restaurables)
  const [logCambios, setLogCambios] = useState<LogCambio[]>([
    {
      id: 'LOG-005',
      fecha: '2025-01-10T14:30:00Z',
      usuario: 'Coordinador TH',
      accion: 'Actualización de firmante',
      cambios: [
        'Firmante anterior: Dr. Carlos Rodríguez',
        'Nuevo firmante: Dra. María Elena Bernal Torres',
        'Cargo actualizado: Directora de Talento Humano',
        'Imagen de firma actualizada'
      ],
      versionAnterior: '2.0.0',
      versionNueva: '2.1.0',
      plantillaSnapshot: {
        id: 'PLANT-001',
        version: '2.1.0',
        estado: 'publicada',
        firmante: {
          nombre: 'Dra. María Elena Bernal Torres',
          documento: '52.789.456',
          cargo: 'Directora de Talento Humano'
        },
        grafoFirma: {
          url: '/firmas/maria-bernal-firma.png',
          nombre: 'maria-bernal-firma.png',
          tamaño: '125 KB'
        },
        logoEntidad: {
          url: '/logos/esap-logo.png',
          nombre: 'esap-logo.png',
          tamaño: '150 KB'
        },
        tipografia: {
          fuente: 'Arial',
          tamaño: 12,
          color: '#000000'
        },
        fechaCreacion: '2024-01-15T10:00:00Z',
        fechaModificacion: '2025-01-10T14:30:00Z',
        creadoPor: 'Admin Sistema',
        modificadoPor: 'Coordinador TH'
      }
    },
    {
      id: 'LOG-004',
      fecha: '2024-12-15T11:20:00Z',
      usuario: 'Coordinador TH',
      accion: 'Actualización de logo institucional',
      cambios: [
        'Logo anterior: esap-logo-antiguo.png',
        'Nuevo logo: esap-logo.png',
        'Mejorada resolución del logo institucional'
      ],
      versionAnterior: '1.9.5',
      versionNueva: '2.0.0',
      plantillaSnapshot: {
        id: 'PLANT-001',
        version: '2.0.0',
        estado: 'publicada',
        firmante: {
          nombre: 'Dr. Carlos Rodríguez',
          documento: '79.123.456',
          cargo: 'Director de Talento Humano'
        },
        grafoFirma: {
          url: '/firmas/carlos-rodriguez-firma.png',
          nombre: 'carlos-rodriguez-firma.png',
          tamaño: '115 KB'
        },
        logoEntidad: {
          url: '/logos/esap-logo.png',
          nombre: 'esap-logo.png',
          tamaño: '150 KB'
        },
        tipografia: {
          fuente: 'Arial',
          tamaño: 12,
          color: '#000000'
        },
        fechaCreacion: '2024-01-15T10:00:00Z',
        fechaModificacion: '2024-12-15T11:20:00Z',
        creadoPor: 'Admin Sistema',
        modificadoPor: 'Coordinador TH'
      }
    },
    {
      id: 'LOG-003',
      fecha: '2024-11-05T09:15:00Z',
      usuario: 'Admin Sistema',
      accion: 'Cambio de tipografía',
      cambios: [
        'Fuente cambiada de Times New Roman a Arial',
        'Tamaño de fuente: 11pt → 12pt'
      ],
      versionAnterior: '1.9.0',
      versionNueva: '1.9.5',
      plantillaSnapshot: {
        id: 'PLANT-001',
        version: '1.9.5',
        estado: 'publicada',
        firmante: {
          nombre: 'Dr. Carlos Rodríguez',
          documento: '79.123.456',
          cargo: 'Director de Talento Humano'
        },
        grafoFirma: {
          url: '/firmas/carlos-rodriguez-firma.png',
          nombre: 'carlos-rodriguez-firma.png',
          tamaño: '115 KB'
        },
        logoEntidad: {
          url: '/logos/esap-logo-antiguo.png',
          nombre: 'esap-logo-antiguo.png',
          tamaño: '145 KB'
        },
        tipografia: {
          fuente: 'Arial',
          tamaño: 12,
          color: '#000000'
        },
        fechaCreacion: '2024-01-15T10:00:00Z',
        fechaModificacion: '2024-11-05T09:15:00Z',
        creadoPor: 'Admin Sistema',
        modificadoPor: 'Admin Sistema'
      }
    },
    {
      id: 'LOG-002',
      fecha: '2024-08-20T16:45:00Z',
      usuario: 'Director TH',
      accion: 'Cambio de color de tipografía',
      cambios: [
        'Color actualizado: #333333 → #000000'
      ],
      versionAnterior: '1.8.5',
      versionNueva: '1.9.0',
      plantillaSnapshot: {
        id: 'PLANT-001',
        version: '1.9.0',
        estado: 'publicada',
        firmante: {
          nombre: 'Dr. Carlos Rodríguez',
          documento: '79.123.456',
          cargo: 'Director de Talento Humano'
        },
        grafoFirma: {
          url: '/firmas/carlos-rodriguez-firma.png',
          nombre: 'carlos-rodriguez-firma.png',
          tamaño: '115 KB'
        },
        logoEntidad: {
          url: '/logos/esap-logo-antiguo.png',
          nombre: 'esap-logo-antiguo.png',
          tamaño: '145 KB'
        },
        tipografia: {
          fuente: 'Times New Roman',
          tamaño: 11,
          color: '#000000'
        },
        fechaCreacion: '2024-01-15T10:00:00Z',
        fechaModificacion: '2024-08-20T16:45:00Z',
        creadoPor: 'Admin Sistema',
        modificadoPor: 'Director TH'
      }
    },
    {
      id: 'LOG-001',
      fecha: '2024-06-10T10:00:00Z',
      usuario: 'Admin Sistema',
      accion: 'Ajuste de márgenes y espaciado',
      cambios: [
        'Ajustado espaciado entre párrafos',
        'Mejorado diseño general del documento'
      ],
      versionAnterior: '1.8.0',
      versionNueva: '1.8.5',
      plantillaSnapshot: {
        id: 'PLANT-001',
        version: '1.8.5',
        estado: 'publicada',
        firmante: {
          nombre: 'Dr. Carlos Rodríguez',
          documento: '79.123.456',
          cargo: 'Director de Talento Humano'
        },
        grafoFirma: {
          url: '/firmas/carlos-rodriguez-firma.png',
          nombre: 'carlos-rodriguez-firma.png',
          tamaño: '115 KB'
        },
        logoEntidad: {
          url: '/logos/esap-logo-antiguo.png',
          nombre: 'esap-logo-antiguo.png',
          tamaño: '145 KB'
        },
        tipografia: {
          fuente: 'Times New Roman',
          tamaño: 11,
          color: '#333333'
        },
        fechaCreacion: '2024-01-15T10:00:00Z',
        fechaModificacion: '2024-06-10T10:00:00Z',
        creadoPor: 'Admin Sistema',
        modificadoPor: 'Admin Sistema'
      }
    }
  ]);

  // Handlers
  const handleFirmanteChange = (field: string, value: string) => {
    setBorrador({
      ...borrador,
      firmante: {
        ...borrador.firmante,
        [field]: value
      }
    });
    setHasChanges(true);
  };

  const handleTipografiaChange = (field: string, value: string | number) => {
    setBorrador({
      ...borrador,
      tipografia: {
        ...borrador.tipografia,
        [field]: value
      }
    });
    setHasChanges(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Archivo inválido', {
          description: 'Por favor selecciona una imagen válida (PNG, JPG, etc.)'
        });
        return;
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Archivo muy grande', {
          description: 'La imagen no debe superar los 2MB'
        });
        return;
      }

      setSelectedFile(file);
      setBorrador({
        ...borrador,
        grafoFirma: {
          url: URL.createObjectURL(file),
          nombre: file.name,
          tamaño: `${(file.size / 1024).toFixed(0)} KB`
        }
      });
      setHasChanges(true);
      
      toast.success('Imagen cargada', {
        description: 'La imagen de la firma se actualizó correctamente'
      });
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Archivo inválido', {
          description: 'Por favor selecciona una imagen válida (PNG, JPG, etc.)'
        });
        return;
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Archivo muy grande', {
          description: 'La imagen no debe superar los 2MB'
        });
        return;
      }

      setBorrador({
        ...borrador,
        logoEntidad: {
          url: URL.createObjectURL(file),
          nombre: file.name,
          tamaño: `${(file.size / 1024).toFixed(0)} KB`
        }
      });
      setHasChanges(true);
      
      toast.success('Logo actualizado', {
        description: 'El logo de la entidad se actualizó correctamente'
      });
    }
  };

  const handleGuardarBorrador = () => {
    toast.loading('Guardando borrador...', { id: 'save-draft' });
    
    setTimeout(() => {
      toast.success('Borrador guardado', {
        id: 'save-draft',
        description: 'Los cambios se guardaron correctamente'
      });
    }, 1000);
  };

  const handleVistaPrevia = () => {
    if (hasChanges) {
      toast.info('Vista previa', {
        description: 'Mostrando cómo se verá el certificado con los cambios'
      });
    }
    setIsPreviewOpen(true);
  };

  const handleSolicitarAutorizacion = () => {
    if (!hasChanges) {
      toast.warning('Sin cambios', {
        description: 'No hay cambios pendientes para autorizar'
      });
      return;
    }
    setIsAutorizacionOpen(true);
  };

  const handleAutorizar = () => {
    toast.loading('Publicando plantilla...', { id: 'publish' });
    
    setTimeout(() => {
      setPlantilla({
        ...borrador,
        version: incrementVersion(borrador.version),
        estado: 'publicada',
        fechaModificacion: new Date().toISOString(),
        modificadoPor: 'Admin Sistema'
      });
      setHasChanges(false);
      setIsAutorizacionOpen(false);
      
      toast.success('¡Plantilla publicada!', {
        id: 'publish',
        description: 'La nueva plantilla está activa y se aplicará a todos los certificados futuros'
      });
    }, 2000);
  };

  const handleDescartarCambios = () => {
    setBorrador({...plantilla});
    setHasChanges(false);
    setSelectedFile(null);
    toast.info('Cambios descartados', {
      description: 'Se restauró la plantilla publicada'
    });
  };

  const handleAbrirRestaurar = (log: LogCambio) => {
    if (!log.plantillaSnapshot) {
      toast.error('Error', {
        description: 'Esta versión no tiene datos disponibles para restaurar'
      });
      return;
    }
    setVersionARestaurar(log);
    setIsRestaurarOpen(true);
  };

  const handleRestaurarVersion = () => {
    if (!versionARestaurar?.plantillaSnapshot) return;

    toast.loading('Restaurando versión...', { id: 'restaurar' });
    
    setTimeout(() => {
      // Crear un nuevo log de cambio para registrar la restauración
      const nuevoLog: LogCambio = {
        id: `LOG-${Date.now()}`,
        fecha: new Date().toISOString(),
        usuario: 'Admin Sistema',
        accion: `Restauración a versión ${versionARestaurar.versionNueva}`,
        cambios: [
          `Versión restaurada: ${versionARestaurar.versionNueva}`,
          `Fecha de la versión: ${new Date(versionARestaurar.fecha).toLocaleDateString('es-CO')}`,
          `Firmante restaurado: ${versionARestaurar.plantillaSnapshot.firmante.nombre}`,
          `Tipografía: ${versionARestaurar.plantillaSnapshot.tipografia.fuente} ${versionARestaurar.plantillaSnapshot.tipografia.tamaño}pt`
        ],
        versionAnterior: plantilla.version,
        versionNueva: incrementVersion(plantilla.version),
        plantillaSnapshot: {
          ...versionARestaurar.plantillaSnapshot,
          version: incrementVersion(plantilla.version),
          fechaModificacion: new Date().toISOString(),
          modificadoPor: 'Admin Sistema'
        }
      };

      // Actualizar log de cambios (mantener solo últimas 5)
      setLogCambios([nuevoLog, ...logCambios.slice(0, 4)]);

      // Actualizar plantilla y borrador
      const plantillaRestaurada = {
        ...versionARestaurar.plantillaSnapshot,
        version: incrementVersion(plantilla.version),
        fechaModificacion: new Date().toISOString(),
        modificadoPor: 'Admin Sistema'
      };

      setPlantilla(plantillaRestaurada);
      setBorrador(plantillaRestaurada);
      setHasChanges(false);
      setIsRestaurarOpen(false);
      setVersionARestaurar(null);
      
      toast.success('¡Versión restaurada!', {
        id: 'restaurar',
        description: `La plantilla ahora usa la configuración de la versión ${versionARestaurar.versionNueva}`
      });
    }, 2000);
  };

  const incrementVersion = (version: string): string => {
    const parts = version.split('.');
    parts[2] = String(Number(parts[2]) + 1);
    return parts.join('.');
  };

  const getEstadoBadge = (estado: string) => {
    const estilos = {
      borrador: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Edit3, label: 'Borrador' },
      en_revision: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'En Revisión' },
      publicada: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Publicada' },
      archivada: { bg: 'bg-red-100', text: 'text-red-800', icon: X, label: 'Archivada' }
    };
    const estilo = estilos[estado as keyof typeof estilos] || estilos.borrador;
    const Icon = estilo.icon;
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-3 py-1 flex items-center gap-1.5 w-fit`}>
        <Icon className="w-4 h-4" />
        {estilo.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                  boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
                }}
              >
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 truncate">
                  Configuración de Plantilla
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              Gestiona la plantilla base de certificados laborales. Los cambios se aplican a todos los certificados futuros.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {getEstadoBadge(plantilla.estado)}
            <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap">
              Versión {plantilla.version}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Banner de Advertencia si hay cambios sin guardar */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-2 border-yellow-300 rounded-lg sm:rounded-xl p-3 sm:p-4"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-yellow-900 mb-1 text-sm sm:text-base">
                Cambios sin guardar
              </h3>
              <p className="text-xs sm:text-sm text-yellow-800">
                Has realizado cambios en la plantilla. Recuerda guardarlos y solicitar autorización antes de cerrar.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDescartarCambios}
              className="text-yellow-700 hover:text-yellow-900 min-h-[44px] sm:min-h-[36px]"
            >
              Descartar
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-1 sm:w-auto sm:inline-grid">
          <TabsTrigger value="configuracion" className="gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] px-2 sm:px-4">
            <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Configuración</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] px-2 sm:px-4">
            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Vista Previa</span>
            <span className="sm:hidden">Vista</span>
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] px-2 sm:px-4">
            <History className="w-3 h-3 sm:w-4 sm:h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configuración */}
        <TabsContent value="configuracion" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Datos del Firmante */}
            <Card className="p-6">
              <h3 className="flex items-center gap-2 mb-5 text-lg font-semibold text-gray-900">
                <User className="w-5 h-5 text-[#003DA5]" />
                Datos del Firmante
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="firmante-nombre">Nombre Completo *</Label>
                  <Input
                    id="firmante-nombre"
                    value={borrador.firmante.nombre}
                    onChange={(e) => handleFirmanteChange('nombre', e.target.value)}
                    placeholder="Ej: Dra. María Elena Bernal Torres"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="firmante-documento">Número de Documento *</Label>
                  <Input
                    id="firmante-documento"
                    value={borrador.firmante.documento}
                    onChange={(e) => handleFirmanteChange('documento', e.target.value)}
                    placeholder="Ej: 52.789.456"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="firmante-cargo">Cargo *</Label>
                  <Input
                    id="firmante-cargo"
                    value={borrador.firmante.cargo}
                    onChange={(e) => handleFirmanteChange('cargo', e.target.value)}
                    placeholder="Ej: Directora de Talento Humano"
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Este firmante aparecerá en todos los certificados laborales generados después de publicar esta plantilla.
                  </span>
                </p>
              </div>
            </Card>

            {/* Grafo de Firma */}
            <Card className="p-6">
              <h3 className="flex items-center gap-2 mb-5 text-lg font-semibold text-gray-900">
                <PenTool className="w-5 h-5 text-[#003DA5]" />
                Grafo / Imagen de Firma
              </h3>

              <div className="space-y-4">
                {/* Vista previa de la firma actual */}
                {borrador.grafoFirma && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-center mb-3">
                      <img
                        src={borrador.grafoFirma.url}
                        alt="Firma actual"
                        className="max-h-32 object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-700 font-medium">
                        {borrador.grafoFirma.nombre}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {borrador.grafoFirma.tamaño}
                      </p>
                    </div>
                  </div>
                )}

                {/* Botón de carga */}
                <div>
                  <Label htmlFor="firma-upload" className="mb-2 block">
                    Cargar nueva firma
                  </Label>
                  <input
                    id="firma-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="firma-upload"
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#003DA5] hover:bg-blue-50 transition-all cursor-pointer"
                  >
                    <Upload className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      Seleccionar imagen
                    </span>
                  </label>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600">
                    <strong>Requisitos:</strong>
                  </p>
                  <ul className="text-xs text-gray-600 mt-2 space-y-1">
                    <li>• Formato: PNG, JPG o JPEG</li>
                    <li>• Tamaño máximo: 2 MB</li>
                    <li>• Fondo transparente recomendado</li>
                    <li>• Resolución mínima: 300 DPI</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Logo de la Entidad */}
          <Card className="p-6">
            <h3 className="flex items-center gap-2 mb-5 text-lg font-semibold text-gray-900">
              <ImageIcon className="w-5 h-5 text-[#003DA5]" />
              Logo de la Entidad (ESAP)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vista previa del logo actual */}
              <div className="space-y-3">
                <Label className="block">Logo actual</Label>
                {borrador.logoEntidad ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                    <div className="flex items-center justify-center mb-3">
                      <img
                        src={borrador.logoEntidad.url}
                        alt="Logo ESAP actual"
                        className="max-h-32 object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-700 font-medium">
                        {borrador.logoEntidad.nombre}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {borrador.logoEntidad.tamaño}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                    <div className="flex items-center justify-center h-32">
                      <p className="text-sm text-gray-500 text-center">
                        No hay logo configurado
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cargar nuevo logo */}
              <div className="space-y-3">
                <Label htmlFor="logo-upload" className="block">
                  Cargar nuevo logo
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center justify-center px-4 py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#003DA5] hover:bg-blue-50 transition-all cursor-pointer block"
                >
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Seleccionar imagen
                    </p>
                    <p className="text-xs text-gray-500">
                      Arrastra o haz clic para cargar
                    </p>
                  </div>
                </label>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 font-semibold mb-2">
                    Requisitos del logo:
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Formato: PNG, JPG o JPEG</li>
                    <li>• Tamaño máximo: 2 MB</li>
                    <li>• Fondo transparente recomendado</li>
                    <li>• Resolución mínima: 300 DPI</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Este logo aparecerá en el encabezado de todos los certificados laborales. 
                  Se recomienda usar el logo oficial de la ESAP con fondo transparente para mejor presentación.
                </span>
              </p>
            </div>
          </Card>

          {/* Tipografía y Color */}
          <Card className="p-6">
            <h3 className="flex items-center gap-2 mb-5 text-lg font-semibold text-gray-900">
              <Type className="w-5 h-5 text-[#003DA5]" />
              Tipografía y Color
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Fuente */}
              <div>
                <Label htmlFor="fuente">Fuente del documento *</Label>
                <Select
                  value={borrador.tipografia.fuente}
                  onValueChange={(value) => handleTipografiaChange('fuente', value)}
                >
                  <SelectTrigger id="fuente" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fuentesDisponibles.map((fuente) => (
                      <SelectItem key={fuente.value} value={fuente.value}>
                        <span style={{ fontFamily: fuente.value }}>
                          {fuente.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tamaño */}
              <div>
                <Label htmlFor="tamano">Tamaño (pt) *</Label>
                <Input
                  id="tamano"
                  type="number"
                  min="8"
                  max="16"
                  value={borrador.tipografia.tamaño}
                  onChange={(e) => handleTipografiaChange('tamaño', Number(e.target.value))}
                  className="mt-2"
                />
              </div>

              {/* Color */}
              <div>
                <Label htmlFor="color">Color del texto *</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="color"
                    type="color"
                    value={borrador.tipografia.color}
                    onChange={(e) => handleTipografiaChange('color', e.target.value)}
                    className="w-16 h-11 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={borrador.tipografia.color}
                    onChange={(e) => handleTipografiaChange('color', e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Ejemplo de texto */}
            <div className="mt-6 p-6 bg-gray-50 border-2 border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-3 font-semibold">
                Vista previa del texto:
              </p>
              <p
                style={{
                  fontFamily: borrador.tipografia.fuente,
                  fontSize: `${borrador.tipografia.tamaño}pt`,
                  color: borrador.tipografia.color,
                  lineHeight: '1.6'
                }}
              >
                LA ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP certifica que{' '}
                <strong>MARÍA FERNANDA RODRÍGUEZ LÓPEZ</strong>, identificada con cédula de
                ciudadanía No. <strong>52.345.678</strong>, labora en esta institución desde el{' '}
                <strong>15 de marzo de 2018</strong> en el cargo de{' '}
                <strong>Docente Tiempo Completo</strong> con grado de{' '}
                <strong>Maestría en Educación</strong>, adscrita a la{' '}
                <strong>Dirección Territorial Bogotá</strong>.
              </p>
            </div>
          </Card>

          {/* Botones de Acción */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDescartarCambios}
                disabled={!hasChanges}
              >
                <X className="w-4 h-4 mr-2" />
                Descartar Cambios
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleGuardarBorrador}
                disabled={!hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Borrador
              </Button>
              <Button
                variant="outline"
                onClick={handleVistaPrevia}
                className="border-[#003DA5] text-[#003DA5] hover:bg-blue-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                Vista Previa
              </Button>
              <Button
                onClick={handleSolicitarAutorizacion}
                disabled={!hasChanges}
                className="bg-[#003DA5] hover:bg-[#002873]"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Solicitar Autorización
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Vista Previa - DISEÑO UNIFICADO MODERNO */}
        <TabsContent value="preview" className="mt-6">
          <Card className="p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Vista Previa del Certificado
              </h3>
              <Badge variant="outline" className="text-sm">
                Ejemplo con datos reales
              </Badge>
            </div>

            {/* Certificado Preview - DISEÑO UNIFICADO MODERNO */}
            <div 
              className="bg-white shadow-2xl max-w-[800px] mx-auto p-12 relative overflow-hidden border-4 border-gray-200"
              style={{ minHeight: '1100px' }}
            >
              {/* Marca de Agua */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <div className="text-9xl font-bold text-gray-400 rotate-[-45deg] select-none">
                  ESAP
                </div>
              </div>

              {/* Header Institucional */}
              <div className="border-b-4 border-[#003DA5] pb-6 mb-8 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Logo de la entidad si existe */}
                    {borrador.logoEntidad && (
                      <div className="mb-4">
                        <img
                          src={borrador.logoEntidad.url}
                          alt="Logo ESAP"
                          className="h-12 object-contain"
                        />
                      </div>
                    )}
                    <h1 
                      className="font-bold text-[#003DA5] mb-2"
                      style={{ fontSize: `${borrador.tipografia.tamaño + 10}pt` }}
                    >
                      ESCUELA SUPERIOR DE<br />ADMINISTRACIÓN PÚBLICA
                    </h1>
                    <p className="text-sm text-gray-600 mb-1">ESAP</p>
                    <p className="text-sm text-gray-600">NIT: 899.999.090-1</p>
                    <p className="text-sm text-gray-600">Calle 44 No. 53-37 • Bogotá D.C., Colombia</p>
                    <p className="text-sm text-gray-600">www.esap.edu.co</p>
                  </div>
                  <div className="text-right">
                    <div className="bg-[#003DA5] text-white px-4 py-2 rounded-lg inline-block">
                      <p className="text-xs mb-1">Consecutivo</p>
                      <p className="text-lg font-bold font-mono">ESAP-CERT-2025-51NXK</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Título del Documento */}
              <div className="text-center mb-8 relative z-10">
                <h2 
                  className="font-bold mb-2"
                  style={{ 
                    fontSize: `${borrador.tipografia.tamaño + 14}pt`,
                    color: borrador.tipografia.color
                  }}
                >
                  CERTIFICACIÓN LABORAL
                </h2>
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-semibold">DOCUMENTO VÁLIDO Y VERIFICABLE</span>
                </div>
              </div>

              {/* Contenido Principal */}
              <div 
                className="space-y-6 relative z-10"
                style={{ 
                  fontFamily: borrador.tipografia.fuente,
                  fontSize: `${borrador.tipografia.tamaño}pt`,
                  color: borrador.tipografia.color,
                  lineHeight: '1.8'
                }}
              >
                <p className="text-justify">
                  La Dirección de Talento Humano de la <strong>Escuela Superior de Administración Pública - ESAP</strong>, certifica que:
                </p>

                {/* Datos del Empleado - TABLA MODERNA */}
                <div className="bg-blue-50 border-l-4 border-[#003DA5] p-6 my-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Nombre Completo</p>
                      <p className="font-bold text-lg text-gray-900">MARÍA FERNANDA RODRÍGUEZ LÓPEZ</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Documento de Identidad</p>
                      <p className="font-bold text-lg text-gray-900">C.C. 52.345.678</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Cargo</p>
                      <p className="font-semibold text-gray-900">Docente Tiempo Completo</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Tipo de Vinculación</p>
                      <p className="font-semibold text-gray-900">Planta Permanente</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Dependencia</p>
                      <p className="font-semibold text-gray-900">Dirección Territorial Bogotá</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Grado</p>
                      <p className="font-semibold text-gray-900">Maestría en Educación</p>
                    </div>
                  </div>
                </div>

                <p className="text-justify">
                  Labora con nosotros desde el <strong>15 de marzo de 2018</strong>, completando a la fecha{' '}
                  <strong>6 años y 10 meses</strong> de servicio ininterrumpido.
                </p>

                <p className="text-justify">
                  Durante su vinculación, María ha desempeñado sus funciones con responsabilidad, compromiso y profesionalismo, 
                  contribuyendo significativamente al cumplimiento de la misión institucional de la ESAP.
                </p>

                <p className="text-justify">
                  La presente certificación se expide a solicitud de la interesada el día{' '}
                  <strong>
                    {new Date().toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </strong>, para los fines que la interesada estime conveniente.
                </p>

                {/* Validez */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm mb-1">Validez del Documento</p>
                      <p className="text-sm text-gray-700">
                        Este certificado tiene una validez de <strong>3 meses</strong> a partir de su fecha de expedición. 
                        Pasado este tiempo, deberá solicitarse uno nuevo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Firma Digital */}
              <div className="mt-12 pt-8 border-t-2 border-gray-300 relative z-10">
                <div className="text-center">
                  <div className="inline-block">
                    {/* Imagen de firma si existe */}
                    {borrador.grafoFirma && (
                      <div className="mb-4">
                        <div className="h-16 flex items-center justify-center">
                          <img 
                            src={borrador.grafoFirma.url}
                            alt="Firma"
                            className="max-h-16 object-contain"
                          />
                        </div>
                      </div>
                    )}
                    <div className="border-t-2 border-gray-800 pt-2 px-8">
                      <p className="font-bold text-gray-900">{borrador.firmante.nombre}</p>
                      <p className="text-sm text-gray-600">{borrador.firmante.cargo}</p>
                      <p className="text-xs text-gray-500 mt-1">C.C. {borrador.firmante.documento}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie de Página con QR */}
              <div className="mt-12 pt-6 border-t border-gray-300 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-3">
                      <Shield className="w-4 h-4 text-[#003DA5] flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-xs font-semibold text-gray-900 mb-1">Verificación de Autenticidad</p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Este certificado puede ser verificado escaneando el código QR o ingresando 
                          el consecutivo en: <span className="text-[#003DA5] font-semibold">www.esap.edu.co/verificar-certificado</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p><strong>Documento electrónico:</strong> Generado automáticamente</p>
                      <p><strong>Fecha de expedición:</strong> {new Date().toLocaleString('es-CO')}</p>
                      <p><strong>Código de verificación:</strong> <span className="font-mono">ESAP-CERT-2025-51NXK</span></p>
                    </div>
                  </div>
                  <div className="ml-6 text-center">
                    <div className="bg-white border-2 border-gray-300 p-3 rounded-lg">
                      <QrCode className="w-24 h-24 text-gray-400 mx-auto" />
                      <p className="text-xs text-gray-600 mt-2 font-mono">51NXK</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Legal */}
              <div className="mt-6 pt-4 border-t border-gray-200 relative z-10">
                <p className="text-xs text-gray-500 text-center">
                  Documento generado electrónicamente por el Sistema de Gestión de Certificados Laborales - ESAP
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => toast.info('Descargando PDF de ejemplo')}>
                <Download className="w-4 h-4 mr-2" />
                Descargar Ejemplo
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Historial - CON RESTAURACIÓN DE VERSIONES - RESPONSIVE OPTIMIZADO */}
        <TabsContent value="historial" className="space-y-4 mt-6">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-4 h-4 sm:w-5 sm:h-5 text-[#003DA5] flex-shrink-0" />
                  <span className="truncate">Historial de Cambios</span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
                  Registro completo de modificaciones. Restaura versiones anteriores.
                </p>
              </div>
              <Badge variant="outline" className="text-xs sm:text-sm whitespace-nowrap self-start">
                {logCambios.length} versiones
              </Badge>
            </div>

            {/* Info de restauración */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2 sm:gap-3">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-blue-800 min-w-0">
                  <p className="font-semibold mb-1">Sistema de Restauración Activo</p>
                  <p className="leading-relaxed">
                    Mantenemos las <strong>últimas 5 versiones</strong> de la plantilla para que puedas 
                    restaurar configuraciones anteriores en cualquier momento.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {logCambios.map((log, index) => (
                <div key={log.id} className="relative">
                  {index !== logCambios.length - 1 && (
                    <div className="absolute left-5 sm:left-6 top-12 sm:top-14 bottom-0 w-0.5 bg-gray-200 hidden sm:block" />
                  )}
                  <Card className={`p-3 sm:p-4 hover:shadow-md transition-shadow ${index === 0 ? 'border-2 border-green-300' : ''}`}>
                    <div className="flex gap-2 sm:gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <History className={`w-5 h-5 sm:w-6 sm:h-6 ${index === 0 ? 'text-green-600' : 'text-[#003DA5]'}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header - Responsive Stack */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{log.accion}</h4>
                              {index === 0 && (
                                <Badge className="bg-green-600 text-white text-[10px] sm:text-xs flex-shrink-0">
                                  Actual
                                </Badge>
                              )}
                              {log.plantillaSnapshot && index > 0 && (
                                <Badge variant="outline" className="text-[10px] sm:text-xs border-blue-300 text-blue-700 flex-shrink-0">
                                  Restaurable
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">
                              Por: <strong>{log.usuario}</strong>
                            </p>
                          </div>
                          
                          {/* Fecha - Mobile/Desktop */}
                          <div className="text-left sm:text-right flex-shrink-0">
                            <p className="text-xs sm:text-sm text-gray-600">
                              {new Date(log.fecha).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              {new Date(log.fecha).toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Cambios */}
                        <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 mt-2 sm:mt-3">
                          <p className="text-[10px] sm:text-xs font-semibold text-gray-700 mb-1.5 sm:mb-2">
                            Cambios realizados:
                          </p>
                          <ul className="text-xs sm:text-sm text-gray-700 space-y-1">
                            {log.cambios.map((cambio, i) => (
                              <li key={i} className="flex items-start gap-1.5 sm:gap-2">
                                <span className="text-[#003DA5] mt-0.5 flex-shrink-0">•</span>
                                <span className="break-words">{cambio}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Footer - Actions Responsive */}
                        <div className="mt-2 sm:mt-3 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-500 overflow-x-auto scrollbar-hide">
                            <span className="whitespace-nowrap">
                              Versión: <strong>{log.versionAnterior}</strong> → <strong>{log.versionNueva}</strong>
                            </span>
                          </div>

                          {/* Botón de restaurar (solo si tiene snapshot y no es la versión actual) */}
                          {log.plantillaSnapshot && index > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAbrirRestaurar(log)}
                              className="gap-1.5 sm:gap-2 text-blue-600 border-blue-300 hover:bg-blue-50 text-xs sm:text-sm min-h-[44px] sm:min-h-[36px] w-full xs:w-auto"
                            >
                              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="whitespace-nowrap">Restaurar versión</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>

            {logCambios.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <History className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-gray-500">No hay cambios registrados aún</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Autorización */}
      <Dialog open={isAutorizacionOpen} onOpenChange={setIsAutorizacionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#003DA5]" />
              Autorizar Publicación de Plantilla
            </DialogTitle>
            <DialogDescription>
              Revisa los cambios antes de publicar la nueva plantilla. Esta acción afectará todos los certificados futuros.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Resumen de cambios */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-3">Cambios a aplicar:</h4>
              <div className="space-y-2 text-sm">
                {borrador.firmante.nombre !== plantilla.firmante.nombre && (
                  <p className="text-gray-700">
                    • Firmante: <strong>{plantilla.firmante.nombre}</strong> → <strong>{borrador.firmante.nombre}</strong>
                  </p>
                )}
                {borrador.firmante.cargo !== plantilla.firmante.cargo && (
                  <p className="text-gray-700">
                    • Cargo: <strong>{plantilla.firmante.cargo}</strong> → <strong>{borrador.firmante.cargo}</strong>
                  </p>
                )}
                {borrador.tipografia.fuente !== plantilla.tipografia.fuente && (
                  <p className="text-gray-700">
                    • Fuente: <strong>{plantilla.tipografia.fuente}</strong> → <strong>{borrador.tipografia.fuente}</strong>
                  </p>
                )}
                {borrador.tipografia.tamaño !== plantilla.tipografia.tamaño && (
                  <p className="text-gray-700">
                    • Tamaño: <strong>{plantilla.tipografia.tamaño}pt</strong> → <strong>{borrador.tipografia.tamaño}pt</strong>
                  </p>
                )}
                {borrador.tipografia.color !== plantilla.tipografia.color && (
                  <p className="text-gray-700">
                    • Color: <strong>{plantilla.tipografia.color}</strong> → <strong>{borrador.tipografia.color}</strong>
                  </p>
                )}
                {selectedFile && (
                  <p className="text-gray-700">
                    • Imagen de firma actualizada
                  </p>
                )}
              </div>
            </Card>

            {/* Advertencia */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">
                    Importante
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Esta plantilla se aplicará a TODOS los certificados futuros</li>
                    <li>• Los certificados ya generados NO se modificarán</li>
                    <li>• El cambio quedará registrado en el log de auditoría</li>
                    <li>• La versión actual pasará de <strong>{plantilla.version}</strong> a <strong>{incrementVersion(plantilla.version)}</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAutorizacionOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAutorizar}
              className="bg-[#003DA5] hover:bg-[#002873]"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Autorizar y Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Vista Previa */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#003DA5]" />
                  Vista Previa del Certificado
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs">
                  Visualiza cómo se verá el certificado con la configuración {hasChanges ? 'actual (cambios sin guardar)' : 'publicada'}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs py-0.5 px-2">
                    Sin guardar
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs py-0.5 px-2">
                  v{borrador.version}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto bg-gray-100 p-8" style={{ maxHeight: 'calc(95vh - 130px)' }}>
            {/* Certificado Preview - DISEÑO UNIFICADO MODERNO */}
            <div 
              id="certificado-preview"
              className="bg-white shadow-2xl mx-auto p-12 relative overflow-hidden border-4 border-gray-200"
              style={{
                width: '100%',
                maxWidth: '950px',
                minHeight: '1100px'
              }}
            >
              {/* Marca de Agua */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <div className="text-9xl font-bold text-gray-400 rotate-[-45deg] select-none">
                  ESAP
                </div>
              </div>

              {/* Header Institucional */}
              <div className="border-b-4 border-[#003DA5] pb-6 mb-8 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Logo de la entidad si existe */}
                    {borrador.logoEntidad && (
                      <div className="mb-4">
                        <img
                          src={borrador.logoEntidad.url}
                          alt="Logo ESAP"
                          className="h-12 object-contain"
                        />
                      </div>
                    )}
                    <h1 
                      className="font-bold text-[#003DA5] mb-2"
                      style={{ fontSize: `${borrador.tipografia.tamaño + 10}pt` }}
                    >
                      ESCUELA SUPERIOR DE<br />ADMINISTRACIÓN PÚBLICA
                    </h1>
                    <p className="text-sm text-gray-600 mb-1">ESAP</p>
                    <p className="text-sm text-gray-600">NIT: 899.999.090-1</p>
                    <p className="text-sm text-gray-600">Calle 44 No. 53-37 • Bogotá D.C., Colombia</p>
                    <p className="text-sm text-gray-600">www.esap.edu.co</p>
                  </div>
                  <div className="text-right">
                    <div className="bg-[#003DA5] text-white px-4 py-2 rounded-lg inline-block">
                      <p className="text-xs mb-1">Consecutivo</p>
                      <p className="text-lg font-bold font-mono">ESAP-CERT-2025-51NXK</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Título del Documento */}
              <div className="text-center mb-8 relative z-10">
                <h2 
                  className="font-bold mb-2"
                  style={{ 
                    fontSize: `${borrador.tipografia.tamaño + 14}pt`,
                    color: borrador.tipografia.color
                  }}
                >
                  CERTIFICACIÓN LABORAL
                </h2>
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-semibold">DOCUMENTO VÁLIDO Y VERIFICABLE</span>
                </div>
              </div>

              {/* Contenido Principal */}
              <div 
                className="space-y-6 relative z-10"
                style={{ 
                  fontFamily: borrador.tipografia.fuente,
                  fontSize: `${borrador.tipografia.tamaño}pt`,
                  color: borrador.tipografia.color,
                  lineHeight: '1.8'
                }}
              >
                <p className="text-justify">
                  La Dirección de Talento Humano de la <strong>Escuela Superior de Administración Pública - ESAP</strong>, certifica que:
                </p>

                {/* Datos del Empleado - TABLA MODERNA */}
                <div className="bg-blue-50 border-l-4 border-[#003DA5] p-6 my-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Nombre Completo</p>
                      <p className="font-bold text-lg text-gray-900">MARÍA FERNANDA RODRÍGUEZ LÓPEZ</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Documento de Identidad</p>
                      <p className="font-bold text-lg text-gray-900">C.C. 52.345.678</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Cargo</p>
                      <p className="font-semibold text-gray-900">Docente Tiempo Completo</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Tipo de Vinculación</p>
                      <p className="font-semibold text-gray-900">Planta Permanente</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Dependencia</p>
                      <p className="font-semibold text-gray-900">Dirección Territorial Bogotá</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase mb-1">Grado</p>
                      <p className="font-semibold text-gray-900">Maestría en Educación</p>
                    </div>
                  </div>
                </div>

                <p className="text-justify">
                  Labora con nosotros desde el <strong>15 de marzo de 2018</strong>, completando a la fecha{' '}
                  <strong>6 años y 10 meses</strong> de servicio ininterrumpido.
                </p>

                <p className="text-justify">
                  Durante su vinculación, María ha desempeñado sus funciones con responsabilidad, compromiso y profesionalismo, 
                  contribuyendo significativamente al cumplimiento de la misión institucional de la ESAP.
                </p>

                <p className="text-justify">
                  La presente certificación se expide a solicitud de la interesada el día{' '}
                  <strong>
                    {new Date().toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </strong>, para los fines que la interesada estime conveniente.
                </p>

                {/* Validez */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm mb-1">Validez del Documento</p>
                      <p className="text-sm text-gray-700">
                        Este certificado tiene una validez de <strong>3 meses</strong> a partir de su fecha de expedición. 
                        Pasado este tiempo, deberá solicitarse uno nuevo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Firma Digital */}
              <div className="mt-12 pt-8 border-t-2 border-gray-300 relative z-10">
                <div className="text-center">
                  <div className="inline-block">
                    {/* Imagen de firma si existe */}
                    {borrador.grafoFirma && (
                      <div className="mb-4">
                        <div className="h-16 flex items-center justify-center">
                          <img 
                            src={borrador.grafoFirma.url}
                            alt="Firma"
                            className="max-h-16 object-contain"
                          />
                        </div>
                      </div>
                    )}
                    <div className="border-t-2 border-gray-800 pt-2 px-8">
                      <p className="font-bold text-gray-900">{borrador.firmante.nombre}</p>
                      <p className="text-sm text-gray-600">{borrador.firmante.cargo}</p>
                      <p className="text-xs text-gray-500 mt-1">C.C. {borrador.firmante.documento}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie de Página con QR */}
              <div className="mt-12 pt-6 border-t border-gray-300 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-3">
                      <Shield className="w-4 h-4 text-[#003DA5] flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-xs font-semibold text-gray-900 mb-1">Verificación de Autenticidad</p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Este certificado puede ser verificado escaneando el código QR o ingresando 
                          el consecutivo en: <span className="text-[#003DA5] font-semibold">www.esap.edu.co/verificar-certificado</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p><strong>Documento electrónico:</strong> Generado automáticamente</p>
                      <p><strong>Fecha de expedición:</strong> {new Date().toLocaleString('es-CO')}</p>
                      <p><strong>Código de verificación:</strong> <span className="font-mono">ESAP-CERT-2025-51NXK</span></p>
                    </div>
                  </div>
                  <div className="ml-6 text-center">
                    <div className="bg-white border-2 border-gray-300 p-3 rounded-lg">
                      <QrCode className="w-24 h-24 text-gray-400 mx-auto" />
                      <p className="text-xs text-gray-600 mt-2 font-mono">51NXK</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Legal */}
              <div className="mt-6 pt-4 border-t border-gray-200 relative z-10">
                <p className="text-xs text-gray-500 text-center">
                  Documento generado electrónicamente por el Sistema de Gestión de Certificados Laborales - ESAP
                </p>
              </div>
            </div>

            {/* Nota informativa */}
            <div className="mt-5 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-[950px] mx-auto">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Este es un ejemplo con datos ficticios. Los certificados reales se generan con datos específicos de cada empleado.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-between w-full gap-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info('Función de impresión', {
                      description: 'Esta función estará disponible en la versión final'
                    });
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Imprimir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info('Descarga de PDF', {
                      description: 'Esta función estará disponible en la versión final'
                    });
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </Button>
              </div>
              <Button
                size="sm"
                onClick={() => setIsPreviewOpen(false)}
                className="bg-[#003DA5] hover:bg-[#002873]"
              >
                Cerrar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Restauración de Versión */}
      <Dialog open={isRestaurarOpen} onOpenChange={setIsRestaurarOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              Restaurar Versión de Plantilla
            </DialogTitle>
            <DialogDescription>
              Vas a restaurar la plantilla a una configuración anterior. Esta acción creará una nueva versión.
            </DialogDescription>
          </DialogHeader>

          {versionARestaurar && (
            <div className="space-y-4 py-4">
              {/* Info de la versión */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Información de la versión a restaurar:
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Versión:</p>
                    <p className="font-semibold text-gray-900">{versionARestaurar.versionNueva}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Fecha:</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(versionARestaurar.fecha).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Modificado por:</p>
                    <p className="font-semibold text-gray-900">{versionARestaurar.usuario}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Acción:</p>
                    <p className="font-semibold text-gray-900">{versionARestaurar.accion}</p>
                  </div>
                </div>
              </Card>

              {/* Comparación de configuraciones */}
              {versionARestaurar.plantillaSnapshot && (
                <Card className="p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Configuración que se restaurará:
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Firmante</p>
                        <p className="font-medium text-gray-900">
                          {versionARestaurar.plantillaSnapshot.firmante.nombre}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {versionARestaurar.plantillaSnapshot.firmante.cargo}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Tipografía</p>
                        <p className="font-medium text-gray-900">
                          {versionARestaurar.plantillaSnapshot.tipografia.fuente}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Tamaño: {versionARestaurar.plantillaSnapshot.tipografia.tamaño}pt
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-2">Cambios que se aplicaron en esa versión:</p>
                      <ul className="space-y-1">
                        {versionARestaurar.cambios.map((cambio, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>{cambio}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {/* Advertencia */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">
                      Importante
                    </h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Se restaurará la configuración completa de esta versión</li>
                      <li>• Se creará una nueva versión ({incrementVersion(plantilla.version)})</li>
                      <li>• Los cambios sin guardar en el borrador actual se perderán</li>
                      <li>• Esta acción quedará registrada en el historial</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRestaurarOpen(false);
                setVersionARestaurar(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRestaurarVersion}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restaurar Versión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}