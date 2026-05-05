import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  FolderOpen,
  File,
  FileText,
  Image,
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  Eye,
  Search,
  Filter,
  FolderPlus,
  Calendar,
  User,
  HardDrive,
} from "lucide-react";
import { CardSIGL } from "../gestion-legal/design-system/CardSIGL";
import { ButtonSIGL } from "../gestion-legal/design-system/ButtonSIGL";
import { BadgeSIGL } from "../gestion-legal/design-system/BadgeSIGL";
import { ModalSIGL } from "../gestion-legal/design-system/ModalSIGL";
import { InputSIGL } from "../gestion-legal/design-system/InputSIGL";
import { toast } from "sonner";

// ====================================
// TIPOS
// ====================================

interface Documento {
  id: string;
  nombre: string;
  tipo: "pdf" | "excel" | "word" | "imagen" | "otro";
  tamano: number; // bytes
  carpeta: string;
  fechaCreacion: string;
  creadoPor: string;
  url: string;
  etiquetas: string[];
}

interface Carpeta {
  id: string;
  nombre: string;
  descripcion: string;
  parent: string | null;
  color: string;
  documentosCount: number;
}

type VistaActual = "CARPETAS" | "RECIENTES" | "BUSQUEDA";

// ====================================
// DATOS MOCK
// ====================================

const CARPETAS_MOCK: Carpeta[] = [
  {
    id: "c2",
    nombre: "Planes Anuales",
    descripcion: "Planes anuales de auditoría",
    parent: null,
    color: "blue",
    documentosCount: 8,
  },
  {
    id: "c3",
    nombre: "Auditorías 2025",
    descripcion: "Documentos de auditorías del año",
    parent: null,
    color: "purple",
    documentosCount: 156,
  },
  {
    id: "c4",
    nombre: "Planes de Mejoramiento",
    descripcion: "Planes y seguimientos",
    parent: null,
    color: "emerald",
    documentosCount: 42,
  },
  {
    id: "c5",
    nombre: "Evidencias",
    descripcion: "Evidencias de auditorías",
    parent: null,
    color: "yellow",
    documentosCount: 312,
  },
  {
    id: "c6",
    nombre: "Actas",
    descripcion: "Actas de reuniones",
    parent: null,
    color: "orange",
    documentosCount: 18,
  },
];

const DOCUMENTOS_MOCK: Documento[] = [
  {
    id: "d1",
    nombre: "Informe_Pormenorizado_2025_S1.pdf",
    tipo: "pdf",
    tamano: 2458624, // ~2.4MB
    carpeta: "c1",
    fechaCreacion: "2025-02-20T10:30:00",
    creadoPor: "Fernando Ávila",
    url: "/mock/documentos/pormenorizado.pdf",
    etiquetas: ["Informe", "Ley 1474", "Semestral"],
  },
  {
    id: "d2",
    nombre: "Plan_Anual_2025.xlsx",
    tipo: "excel",
    tamano: 1245680,
    carpeta: "c2",
    fechaCreacion: "2025-01-15T09:00:00",
    creadoPor: "Fernando Ávila",
    url: "/mock/documentos/plan-anual.xlsx",
    etiquetas: ["Plan Anual", "Decreto 648"],
  },
  {
    id: "d3",
    nombre: "Evidencia_Conciliaciones_Feb_Jun.pdf",
    tipo: "pdf",
    tamano: 5242880, // 5MB
    carpeta: "c5",
    fechaCreacion: "2025-07-10T14:22:00",
    creadoPor: "Carlos Méndez",
    url: "/mock/documentos/evidencia.pdf",
    etiquetas: [
      "Evidencia",
      "Plan Mejoramiento",
      "Seguimiento",
    ],
  },
  {
    id: "d4",
    nombre: "Acta_Reunion_Apertura_AUD_005.docx",
    tipo: "word",
    tamano: 524288,
    carpeta: "c6",
    fechaCreacion: "2025-03-05T11:15:00",
    creadoPor: "Natalia Cañón",
    url: "/mock/documentos/acta.docx",
    etiquetas: ["Acta", "Auditoría", "Reunión"],
  },
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export const GestionDocumentalModule: React.FC = () => {
  const [vistaActual, setVistaActual] =
    useState<VistaActual>("CARPETAS");
  const [carpetaSeleccionada, setCarpetaSeleccionada] =
    useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [modalUpload, setModalUpload] = useState(false);
  const [modalNuevaCarpeta, setModalNuevaCarpeta] =
    useState(false);

  // Documentos filtrados
  const documentosFiltrados = useMemo(() => {
    let docs = DOCUMENTOS_MOCK;

    if (carpetaSeleccionada) {
      docs = docs.filter(
        (d) => d.carpeta === carpetaSeleccionada,
      );
    }

    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.nombre.toLowerCase().includes(termino) ||
          d.etiquetas.some((e) =>
            e.toLowerCase().includes(termino),
          ),
      );
    }

    return docs;
  }, [carpetaSeleccionada, busqueda]);

  // Documentos recientes
  const documentosRecientes = useMemo(() => {
    return [...DOCUMENTOS_MOCK]
      .sort(
        (a, b) =>
          new Date(b.fechaCreacion).getTime() -
          new Date(a.fechaCreacion).getTime(),
      )
      .slice(0, 10);
  }, []);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const totalDocumentos = DOCUMENTOS_MOCK.length;
    const totalCarpetas = CARPETAS_MOCK.length;
    const totalTamano = DOCUMENTOS_MOCK.reduce(
      (sum, d) => sum + d.tamano,
      0,
    );
    const documentosHoy = DOCUMENTOS_MOCK.filter((d) => {
      const hoy = new Date().toISOString().split("T")[0];
      const fecha = d.fechaCreacion.split("T")[0];
      return fecha === hoy;
    }).length;

    return {
      totalDocumentos,
      totalCarpetas,
      totalTamano,
      documentosHoy,
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Gestión Documental
                  </h1>
                  <p className="text-sm text-gray-500">
                    Repositorio centralizado de documentos de
                    Control Interno
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <ButtonSIGL
                variant="secondary"
                onClick={() => setModalNuevaCarpeta(true)}
              >
                <FolderPlus className="w-4 h-4" />
                Nueva Carpeta
              </ButtonSIGL>
              <ButtonSIGL
                variant="primary"
                onClick={() => setModalUpload(true)}
              >
                <Upload className="w-4 h-4" />
                Subir Documento
              </ButtonSIGL>
            </div>
          </div>
        </motion.div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSIGL>
            <div className="p-6">
              <File className="w-8 h-8 text-sky-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {estadisticas.totalDocumentos}
              </div>
              <div className="text-sm text-gray-600">
                Total Documentos
              </div>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="p-6">
              <FolderOpen className="w-8 h-8 text-blue-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {estadisticas.totalCarpetas}
              </div>
              <div className="text-sm text-gray-600">
                Carpetas
              </div>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="p-6">
              <HardDrive className="w-8 h-8 text-purple-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatBytes(estadisticas.totalTamano)}
              </div>
              <div className="text-sm text-gray-600">
                Almacenamiento
              </div>
            </div>
          </CardSIGL>

          <CardSIGL>
            <div className="p-6">
              <Calendar className="w-8 h-8 text-green-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {estadisticas.documentosHoy}
              </div>
              <div className="text-sm text-gray-600">
                Subidos Hoy
              </div>
            </div>
          </CardSIGL>
        </div>

        {/* NAVEGACIÓN */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2">
            <ButtonSIGL
              variant={
                vistaActual === "CARPETAS"
                  ? "primary"
                  : "secondary"
              }
              onClick={() => {
                setVistaActual("CARPETAS");
                setCarpetaSeleccionada(null);
              }}
            >
              <FolderOpen className="w-4 h-4" />
              Carpetas
            </ButtonSIGL>
            <ButtonSIGL
              variant={
                vistaActual === "RECIENTES"
                  ? "primary"
                  : "secondary"
              }
              onClick={() => {
                setVistaActual("RECIENTES");
                setCarpetaSeleccionada(null);
              }}
            >
              <Calendar className="w-4 h-4" />
              Recientes
            </ButtonSIGL>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA */}
        <CardSIGL>
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar documentos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </CardSIGL>

        {/* CONTENIDO */}
        {vistaActual === "CARPETAS" && !carpetaSeleccionada && (
          <VistaCarpetas
            carpetas={CARPETAS_MOCK}
            onSeleccionar={(id) => setCarpetaSeleccionada(id)}
          />
        )}

        {vistaActual === "CARPETAS" && carpetaSeleccionada && (
          <VistaDocumentos
            documentos={documentosFiltrados}
            carpeta={
              CARPETAS_MOCK.find(
                (c) => c.id === carpetaSeleccionada,
              )!
            }
            onVolver={() => setCarpetaSeleccionada(null)}
          />
        )}

        {vistaActual === "RECIENTES" && (
          <VistaRecientes documentos={documentosRecientes} />
        )}

        {/* MODAL UPLOAD */}
        {modalUpload && (
          <ModalUpload onClose={() => setModalUpload(false)} />
        )}

        {/* MODAL NUEVA CARPETA */}
        {modalNuevaCarpeta && (
          <ModalNuevaCarpeta
            onClose={() => setModalNuevaCarpeta(false)}
          />
        )}
      </div>
    </div>
  );
};

// ====================================
// VISTA: CARPETAS
// ====================================

const VistaCarpetas: React.FC<{
  carpetas: Carpeta[];
  onSeleccionar: (id: string) => void;
}> = ({ carpetas, onSeleccionar }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {carpetas.map((carpeta, index) => (
        <motion.div
          key={carpeta.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <CardSIGL>
            <button
              onClick={() => onSeleccionar(carpeta.id)}
              className="w-full p-6 text-left hover:bg-gray-50 transition-colors rounded-xl"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 bg-${carpeta.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <FolderOpen
                    className={`w-8 h-8 text-${carpeta.color}-600`}
                  />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {carpeta.nombre}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {carpeta.descripcion}
                  </p>
                  <div className="flex items-center gap-2">
                    <BadgeSIGL variant="info">
                      <File className="w-3 h-3" />
                      {carpeta.documentosCount} documentos
                    </BadgeSIGL>
                  </div>
                </div>
              </div>
            </button>
          </CardSIGL>
        </motion.div>
      ))}
    </div>
  );
};

// ====================================
// VISTA: DOCUMENTOS
// ====================================

const VistaDocumentos: React.FC<{
  documentos: Documento[];
  carpeta: Carpeta;
  onVolver: () => void;
}> = ({ documentos, carpeta, onVolver }) => {
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <ButtonSIGL variant="secondary" onClick={onVolver}>
          ← Volver
        </ButtonSIGL>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">
          {carpeta.nombre}
        </span>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {documentos.map((doc, index) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <CardSIGL>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getIconoTipo(doc.tipo)}
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {doc.nombre}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{formatBytes(doc.tamano)}</span>
                        <span>•</span>
                        <span>
                          {new Date(
                            doc.fechaCreacion,
                          ).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>{doc.creadoPor}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {doc.etiquetas.map((etiqueta, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                        >
                          {etiqueta}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <ButtonSIGL variant="secondary">
                      <Eye className="w-4 h-4" />
                    </ButtonSIGL>
                    <ButtonSIGL variant="secondary">
                      <Download className="w-4 h-4" />
                    </ButtonSIGL>
                  </div>
                </div>
              </div>
            </CardSIGL>
          </motion.div>
        ))}

        {documentos.length === 0 && (
          <CardSIGL>
            <div className="p-12 text-center">
              <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay documentos
              </h3>
              <p className="text-gray-600">
                Esta carpeta está vacía
              </p>
            </div>
          </CardSIGL>
        )}
      </div>
    </div>
  );
};

// ====================================
// VISTA: RECIENTES
// ====================================

const VistaRecientes: React.FC<{ documentos: Documento[] }> = ({
  documentos,
}) => {
  return (
    <div className="space-y-2">
      {documentos.map((doc, index) => (
        <motion.div
          key={doc.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <CardSIGL>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    {getIconoTipo(doc.tipo)}
                  </div>

                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {doc.nombre}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{formatBytes(doc.tamano)}</span>
                      <span>•</span>
                      <span>
                        {formatFechaRelativa(doc.fechaCreacion)}
                      </span>
                      <span>•</span>
                      <span>{doc.creadoPor}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <ButtonSIGL variant="secondary">
                    <Eye className="w-4 h-4" />
                  </ButtonSIGL>
                  <ButtonSIGL variant="secondary">
                    <Download className="w-4 h-4" />
                  </ButtonSIGL>
                </div>
              </div>
            </div>
          </CardSIGL>
        </motion.div>
      ))}
    </div>
  );
};

// ====================================
// MODAL: UPLOAD
// ====================================

const ModalUpload: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [carpeta, setCarpeta] = useState("");

  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title="Subir Documento"
      size="medium"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Carpeta *
          </label>
          <select
            value={carpeta}
            onChange={(e) => setCarpeta(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Seleccione una carpeta...</option>
            {CARPETAS_MOCK.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Archivo *
          </label>
          <input
            type="file"
            onChange={(e) =>
              setArchivo(e.target.files?.[0] || null)
            }
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-sky-50 file:text-sky-700
              hover:file:bg-sky-100"
          />
          {archivo && (
            <p className="text-sm text-green-600 mt-2">
              ✓ {archivo.name} ({formatBytes(archivo.size)})
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="secondary" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={() => {
              toast.success("Documento subido exitosamente");
              onClose();
            }}
            disabled={!archivo || !carpeta}
          >
            <Upload className="w-4 h-4" />
            Subir
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

// ====================================
// MODAL: NUEVA CARPETA
// ====================================

const ModalNuevaCarpeta: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  return (
    <ModalSIGL
      isOpen={true}
      onClose={onClose}
      title="Nueva Carpeta"
      size="medium"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de la Carpeta *
          </label>
          <InputSIGL
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Auditorías 2026"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <InputSIGL
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción de la carpeta..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <ButtonSIGL variant="secondary" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={() => {
              toast.success("Carpeta creada exitosamente");
              onClose();
            }}
            disabled={!nombre.trim()}
          >
            <FolderPlus className="w-4 h-4" />
            Crear Carpeta
          </ButtonSIGL>
        </div>
      </div>
    </ModalSIGL>
  );
};

// ====================================
// FUNCIONES AUXILIARES
// ====================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Math.round((bytes / Math.pow(k, i)) * 100) / 100 +
    " " +
    sizes[i]
  );
}

function formatFechaRelativa(fecha: string): string {
  const ahora = new Date();
  const fechaDoc = new Date(fecha);
  const diff = ahora.getTime() - fechaDoc.getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`;
  return fechaDoc.toLocaleDateString();
}

function getIconoTipo(tipo: string) {
  switch (tipo) {
    case "pdf":
      return <FileText className="w-5 h-5 text-red-600" />;
    case "excel":
      return (
        <FileSpreadsheet className="w-5 h-5 text-green-600" />
      );
    case "word":
      return <FileText className="w-5 h-5 text-blue-600" />;
    case "imagen":
      return <Image className="w-5 h-5 text-purple-600" />;
    default:
      return <File className="w-5 h-5 text-gray-600" />;
  }
}

export default GestionDocumentalModule;