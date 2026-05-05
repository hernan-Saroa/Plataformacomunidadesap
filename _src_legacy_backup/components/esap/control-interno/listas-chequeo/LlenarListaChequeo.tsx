import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  FileText,
  Calendar,
  User,
  Clock,
  Download,
  Send,
} from "lucide-react";
import { useListasChequeo, ListaAplicada, RespuestaItem, Evidencia } from "./ListasChequeoContext";
import { toast } from "sonner@2.0.3";
import { ModalFirmaDigital } from "./ModalFirmaDigital";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE: LLENAR LISTA DE CHEQUEO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface LlenarListaChequeoProps {
  listaId: string;
  onVolver: () => void;
}

export function LlenarListaChequeo({ listaId, onVolver }: LlenarListaChequeoProps) {
  const {
    obtenerListaPorId,
    obtenerPlantillaPorId,
    guardarRespuesta,
    actualizarLista,
    firmarLista,
  } = useListasChequeo();

  const lista = obtenerListaPorId(listaId);
  const plantilla = lista ? obtenerPlantillaPorId(lista.plantillaId) : undefined;

  const [itemActual, setItemActual] = useState(0);
  const [guardadoAutomatico, setGuardadoAutomatico] = useState(false);
  const [mostrarFirma, setMostrarFirma] = useState(false);

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!plantilla) return;
      
      if (e.key === "ArrowRight" && itemActual < plantilla.items.length - 1) {
        setItemActual(itemActual + 1);
      } else if (e.key === "ArrowLeft" && itemActual > 0) {
        setItemActual(itemActual - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [itemActual, plantilla]);

  if (!lista || !plantilla) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Lista no encontrada
          </h2>
          <p className="text-slate-600 mb-4">
            No se pudo cargar la información de la lista de chequeo
          </p>
          <button
            onClick={onVolver}
            className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white rounded-lg hover:shadow-md transition-all duration-200"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const itemsPlantilla = plantilla.items;
  const item = itemsPlantilla[itemActual];
  const respuestaExistente = lista.respuestas.find((r) => r.itemId === item.id);

  const progreso = Math.round(
    (lista.respuestas.filter((r) => r.respuesta !== "n-a").length /
      itemsPlantilla.length) *
      100
  );

  const itemsRespondidos = lista.respuestas.filter((r) => r.respuesta !== "n-a").length;
  const todoRespondido = itemsRespondidos === itemsPlantilla.length;

  // Handlers
  const handleGuardarRespuesta = (
    respuesta: string,
    observaciones: string,
    evidencias: Evidencia[]
  ) => {
    guardarRespuesta(listaId, item.id, {
      respuesta,
      observaciones,
      evidencias,
      fechaRespuesta: new Date().toISOString(),
    });

    // Animación de guardado
    setGuardadoAutomatico(true);
    setTimeout(() => setGuardadoAutomatico(false), 2000);
  };

  const handleSiguiente = () => {
    if (itemActual < itemsPlantilla.length - 1) {
      setItemActual(itemActual + 1);
    }
  };

  const handleAnterior = () => {
    if (itemActual > 0) {
      setItemActual(itemActual - 1);
    }
  };

  const handleFinalizar = () => {
    if (!todoRespondido) {
      toast.error("Debe responder todos los ítems antes de finalizar");
      return;
    }
    setMostrarFirma(true);
  };

  const handleFirmar = (firma: any) => {
    firmarLista(listaId, firma);
    toast.success("Lista completada y firmada exitosamente");
    setMostrarFirma(false);
    onVolver();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* HEADER */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* Navegación superior */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onVolver}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Volver</span>
            </button>

            {/* Indicador de guardado */}
            {guardadoAutomatico && (
              <div className="flex items-center gap-2 text-green-600 animate-fade-in">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Guardado automático</span>
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200">
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleFinalizar}
                disabled={!todoRespondido}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span className="font-medium">Finalizar y Firmar</span>
              </button>
            </div>
          </div>

          {/* Información de la lista */}
          <div className="bg-gradient-to-r from-[#E0EDFF] to-[#F0F7FF] rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-[#003DA5] bg-white px-2 py-0.5 rounded">
                    {lista.id}
                  </span>
                  <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                    {lista.estado === "en-proceso" ? "En Proceso" : "Borrador"}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">
                  {plantilla.nombre}
                </h1>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>Auditoría: {lista.auditoriaCodigo}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Inicio: {lista.fechaInicio}</span>
                  </div>
                </div>
              </div>

              {/* Progreso circular */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="#E5E7EB"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="#003DA5"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${progreso * 1.76} ${176 - progreso * 1.76}`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-900">
                      {progreso}%
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-600 mt-1">Progreso</span>
              </div>
            </div>
          </div>

          {/* Barra de progreso lineal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                Ítem {itemActual + 1} de {itemsPlantilla.length}
              </span>
              <span className="font-semibold text-slate-900">
                {itemsRespondidos}/{itemsPlantilla.length} respondidos
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#003DA5] to-[#0051D5] transition-all duration-500"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* CONTENIDO - ÍTEM ACTUAL */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <ItemFormulario
          item={item}
          respuestaExistente={respuestaExistente}
          onGuardar={handleGuardarRespuesta}
          numero={itemActual + 1}
        />

        {/* Navegación entre ítems */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handleAnterior}
            disabled={itemActual === 0}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="flex items-center gap-2">
            {/* Indicadores de ítems */}
            <div className="flex items-center gap-1">
              {itemsPlantilla.slice(Math.max(0, itemActual - 2), itemActual + 3).map((_, idx) => {
                const globalIdx = Math.max(0, itemActual - 2) + idx;
                const respuesta = lista.respuestas.find(
                  (r) => r.itemId === itemsPlantilla[globalIdx].id
                );
                const respondido = respuesta && respuesta.respuesta !== "n-a";

                return (
                  <button
                    key={globalIdx}
                    onClick={() => setItemActual(globalIdx)}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200
                      ${
                        globalIdx === itemActual
                          ? "bg-[#003DA5] text-white scale-110"
                          : respondido
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }
                    `}
                  >
                    {globalIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSiguiente}
            disabled={itemActual === itemsPlantilla.length - 1}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Resumen de ítems respondidos */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            Resumen de Respuestas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total",
                value: itemsPlantilla.length,
                color: "text-slate-600",
              },
              {
                label: "Respondidos",
                value: itemsRespondidos,
                color: "text-blue-600",
              },
              {
                label: "Pendientes",
                value: itemsPlantilla.length - itemsRespondidos,
                color: "text-orange-600",
              },
              {
                label: "Progreso",
                value: `${progreso}%`,
                color: "text-green-600",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-slate-50 rounded-lg p-4 text-center"
              >
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-sm text-slate-600 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL FIRMA DIGITAL */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {mostrarFirma && (
        <ModalFirmaDigital
          isOpen={mostrarFirma}
          onClose={() => setMostrarFirma(false)}
          onFirmar={handleFirmar}
          lista={lista}
          plantilla={plantilla}
        />
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE: FORMULARIO DE ÍTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ItemFormularioProps {
  item: any;
  respuestaExistente?: RespuestaItem;
  onGuardar: (respuesta: string, observaciones: string, evidencias: Evidencia[]) => void;
  numero: number;
}

function ItemFormulario({
  item,
  respuestaExistente,
  onGuardar,
  numero,
}: ItemFormularioProps) {
  const [respuesta, setRespuesta] = useState(respuestaExistente?.respuesta || "");
  const [observaciones, setObservaciones] = useState(
    respuestaExistente?.observaciones || ""
  );
  const [evidencias, setEvidencias] = useState<Evidencia[]>(
    respuestaExistente?.evidencias || []
  );

  // Auto-guardar cuando cambia la respuesta
  useEffect(() => {
    if (respuesta) {
      const timer = setTimeout(() => {
        onGuardar(respuesta, observaciones, evidencias);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [respuesta, observaciones, evidencias]);

  const handleAgregarEvidencia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const nuevasEvidencias: Evidencia[] = Array.from(files).map((file) => ({
      id: `EV-${Date.now()}-${Math.random()}`,
      nombre: file.name,
      tipo: file.type,
      tamaño: file.size,
      url: URL.createObjectURL(file),
      fechaCarga: new Date().toISOString(),
    }));

    setEvidencias([...evidencias, ...nuevasEvidencias]);
    toast.success(`${nuevasEvidencias.length} evidencia(s) agregada(s)`);
  };

  const handleEliminarEvidencia = (id: string) => {
    setEvidencias(evidencias.filter((e) => e.id !== id));
    toast.info("Evidencia eliminada");
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header del ítem */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-lg">#{numero}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">{item.titulo}</h2>
            {item.descripcion && (
              <p className="text-blue-100 text-sm">{item.descripcion}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              {item.esObligatorio && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  ⚠️ Obligatorio
                </span>
              )}
              {item.requiereEvidencia && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  📎 Requiere evidencia
                </span>
              )}
              {item.categoria && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded">
                  {item.categoria}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6 space-y-6">
        {/* Selector de respuesta */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Respuesta {item.esObligatorio && <span className="text-red-500">*</span>}
          </label>

          {item.tipoRespuesta === "cumple-no-cumple" && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "cumple", label: "✓ Cumple", color: "green" },
                { value: "no-cumple", label: "✗ No Cumple", color: "red" },
                { value: "n-a", label: "N/A", color: "gray" },
              ].map((opcion) => (
                <button
                  key={opcion.value}
                  onClick={() => setRespuesta(opcion.value)}
                  className={`
                    px-4 py-3 rounded-lg border-2 font-medium transition-all duration-200
                    ${
                      respuesta === opcion.value
                        ? opcion.color === "green"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : opcion.color === "red"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-gray-500 bg-gray-50 text-gray-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }
                  `}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          )}

          {item.tipoRespuesta === "si-no" && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "si", label: "✓ Sí", color: "green" },
                { value: "no", label: "✗ No", color: "red" },
              ].map((opcion) => (
                <button
                  key={opcion.value}
                  onClick={() => setRespuesta(opcion.value)}
                  className={`
                    px-4 py-3 rounded-lg border-2 font-medium transition-all duration-200
                    ${
                      respuesta === opcion.value
                        ? opcion.color === "green"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-red-500 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }
                  `}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          )}

          {item.tipoRespuesta === "texto-libre" && (
            <textarea
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Escribe tu respuesta..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
            />
          )}
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Observaciones (Opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Agrega comentarios, aclaraciones o detalles adicionales..."
            rows={3}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
          />
        </div>

        {/* Evidencias */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-700">
              Evidencias
              {item.requiereEvidencia && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <label className="flex items-center gap-2 px-3 py-2 bg-[#003DA5] text-white text-sm rounded-lg cursor-pointer hover:bg-[#002D7A] transition-all duration-200">
              <Upload className="w-4 h-4" />
              Subir archivo
              <input
                type="file"
                multiple
                onChange={handleAgregarEvidencia}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
              />
            </label>
          </div>

          {/* Lista de evidencias */}
          {evidencias.length > 0 ? (
            <div className="space-y-2">
              {evidencias.map((evidencia) => (
                <div
                  key={evidencia.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {evidencia.nombre}
                    </p>
                    <p className="text-xs text-slate-600">
                      {(evidencia.tamaño / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => handleEliminarEvidencia(evidencia.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-6 text-center border border-dashed border-slate-300">
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                No hay evidencias cargadas
              </p>
              {item.requiereEvidencia && (
                <p className="text-xs text-red-600 mt-1">
                  Este ítem requiere al menos una evidencia
                </p>
              )}
            </div>
          )}
        </div>

        {/* Metadata de respuesta */}
        {respuestaExistente && (
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>
                Última actualización:{" "}
                {new Date(respuestaExistente.fechaRespuesta).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}