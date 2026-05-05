import { useState } from "react";
import { X, ClipboardCheck, AlertCircle, CheckCircle } from "lucide-react";
import { PlantillaLista } from "./plantillas-predefinidas";
import { useListasChequeo } from "./ListasChequeoContext";
import { toast } from "sonner@2.0.3";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODAL APLICAR LISTA A AUDITORÍA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ModalAplicarListaProps {
  isOpen: boolean;
  onClose: () => void;
  plantilla: PlantillaLista;
}

// Mock data de auditorías (en producción vendría del Context de Auditorías)
const AUDITORIAS_MOCK = [
  {
    id: "AUD-001",
    codigo: "AUD-2025-001",
    nombre: "Auditoría de Gestión Financiera",
    proceso: "Gestión Financiera",
    estado: "en-ejecucion",
    fechaInicio: "2025-01-15",
  },
  {
    id: "AUD-002",
    codigo: "AUD-2025-002",
    nombre: "Auditoría de Talento Humano",
    proceso: "Gestión Talento Humano",
    estado: "en-ejecucion",
    fechaInicio: "2025-01-18",
  },
  {
    id: "AUD-003",
    codigo: "AUD-2025-003",
    nombre: "Auditoría de Contratación",
    proceso: "Adquisición Bienes",
    estado: "en-ejecucion",
    fechaInicio: "2025-01-20",
  },
  {
    id: "AUD-004",
    codigo: "AUD-2025-004",
    nombre: "Auditoría de Control Interno",
    proceso: "Evaluación Control Mejora",
    estado: "programada",
    fechaInicio: "2025-02-01",
  },
  {
    id: "AUD-005",
    codigo: "AUD-2025-005",
    nombre: "Auditoría de Seguridad de la Información",
    proceso: "Modelo Seguridad Privacidad",
    estado: "programada",
    fechaInicio: "2025-02-05",
  },
];

export function ModalAplicarLista({
  isOpen,
  onClose,
  plantilla,
}: ModalAplicarListaProps) {
  const { aplicarPlantilla, obtenerListasPorAuditoria } = useListasChequeo();
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<string>("");

  if (!isOpen) return null;

  // Handlers
  const handleAplicar = () => {
    if (!auditoriaSeleccionada) {
      toast.error("Debe seleccionar una auditoría");
      return;
    }

    const auditoria = AUDITORIAS_MOCK.find((a) => a.id === auditoriaSeleccionada);
    if (!auditoria) return;

    // Verificar si ya existe una lista para esta auditoría con esta plantilla
    const listasExistentes = obtenerListasPorAuditoria(auditoria.id);
    const listaExistente = listasExistentes.find(
      (l) => l.plantillaId === plantilla.id && l.estado !== "completada"
    );

    if (listaExistente) {
      toast.error(
        `Ya existe una lista de "${plantilla.nombre}" en proceso para esta auditoría`
      );
      return;
    }

    try {
      const nuevaLista = aplicarPlantilla(
        plantilla.id,
        auditoria.id,
        auditoria.codigo
      );

      toast.success("Plantilla aplicada correctamente", {
        description: `Se creó la lista ${nuevaLista.id} para la auditoría ${auditoria.codigo}`,
      });

      onClose();

      // TODO: Navegar al llenado de la lista
      console.log("Navegar a llenado de lista:", nuevaLista.id);
    } catch (error) {
      toast.error("Error al aplicar la plantilla");
      console.error(error);
    }
  };

  // Filtrar auditorías compatibles (mismo proceso o todas si es personalizada)
  const auditoriasFiltradas = AUDITORIAS_MOCK.filter((auditoria) => {
    // Si la plantilla es de sistema, filtrar por proceso compatible
    if (plantilla.esPlantillaSistema) {
      return (
        auditoria.proceso === plantilla.procesoAsociado ||
        auditoria.estado === "en-ejecucion"
      );
    }
    // Si es personalizada, permitir todas las auditorías en ejecución
    return auditoria.estado === "en-ejecucion" || auditoria.estado === "programada";
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Aplicar Plantilla de Biblioteca</h2>
              <p className="text-blue-100 text-sm mt-1">
                Selecciona la auditoría donde aplicar esta plantilla de biblioteca
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información de la plantilla */}
          <div className="bg-gradient-to-r from-[#E0EDFF] to-[#F0F7FF] rounded-lg p-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#003DA5] flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-[#003DA5] bg-white px-2 py-0.5 rounded">
                    {plantilla.codigo}
                  </span>
                  {plantilla.esPlantillaSistema && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      Sistema
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">
                  {plantilla.nombre}
                </h3>
                <p className="text-sm text-slate-600">{plantilla.descripcion}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-slate-600">Proceso:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {plantilla.procesoAsociado}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Ítems:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {plantilla.items.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selector de auditoría */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Auditoría <span className="text-red-500">*</span>
            </label>
            
            {auditoriasFiltradas.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 mb-1">
                    No hay auditorías disponibles
                  </p>
                  <p className="text-sm text-amber-700">
                    No existen auditorías en ejecución compatibles con esta plantilla.
                    Crea una nueva auditoría o espera a que inicie una programada.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {auditoriasFiltradas.map((auditoria) => {
                  const listasExistentes = obtenerListasPorAuditoria(auditoria.id);
                  const tieneListaEnProceso = listasExistentes.some(
                    (l) => l.plantillaId === plantilla.id && l.estado !== "completada"
                  );

                  return (
                    <label
                      key={auditoria.id}
                      className={`
                        block cursor-pointer p-4 border-2 rounded-lg transition-all duration-200
                        ${
                          auditoriaSeleccionada === auditoria.id
                            ? "border-[#003DA5] bg-[#E0EDFF]"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }
                        ${tieneListaEnProceso ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="auditoria"
                          value={auditoria.id}
                          checked={auditoriaSeleccionada === auditoria.id}
                          onChange={(e) => setAuditoriaSeleccionada(e.target.value)}
                          disabled={tieneListaEnProceso}
                          className="mt-1 w-4 h-4 text-[#003DA5] border-slate-300 focus:ring-[#003DA5]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-[#003DA5] bg-white px-2 py-0.5 rounded">
                              {auditoria.codigo}
                            </span>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded ${
                                auditoria.estado === "en-ejecucion"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {auditoria.estado === "en-ejecucion"
                                ? "En Ejecución"
                                : "Programada"}
                            </span>
                            {tieneListaEnProceso && (
                              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                Ya tiene lista
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-slate-900 mb-1">
                            {auditoria.nombre}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span>Proceso: {auditoria.proceso}</span>
                            <span>•</span>
                            <span>Inicio: {auditoria.fechaInicio}</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Información adicional */}
          {auditoriaSeleccionada && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 mb-1">Lista preparada</p>
                <p className="text-sm text-green-700">
                  Se creará una nueva lista de chequeo basada en "{plantilla.nombre}"
                  para la auditoría seleccionada. Podrás comenzar a llenarla
                  inmediatamente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <div className="text-sm text-slate-600">
            {plantilla.items.length} ítems de verificación
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleAplicar}
              disabled={!auditoriaSeleccionada || auditoriasFiltradas.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Aplicar y Comenzar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
