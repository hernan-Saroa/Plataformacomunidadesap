import { useState } from "react";
import {
  ClipboardCheck,
  FileText,
  History,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Edit,
  Copy,
  Trash2,
  Eye,
  MoreVertical,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { useListasChequeo } from "./ListasChequeoContext";
import { ModalCrearPlantilla } from "./ModalCrearPlantilla";
import { ModalAplicarLista } from "./ModalAplicarLista";
import { LlenarListaChequeo } from "./LlenarListaChequeo";
import { VisualizadorPDF } from "./VisualizadorPDF";
import { DashboardReportes } from "./DashboardReportes";
import { ModalGenerarHallazgo } from "./ModalGenerarHallazgo";
import { PlantillaLista } from "./plantillas-predefinidas";
import { toast } from "sonner@2.0.3";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MÓDULO DE LISTAS DE CHEQUEO DIGITALES - VERSIÓN COMPLETA
// RF007 - Sistema de Control Interno de Gestión - ESAP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type TabActiva = "plantillas" | "mis-listas" | "historial" | "reportes";
type ModoModal = "crear" | "editar" | "duplicar" | "ver";
type Vista = "menu" | "llenar-lista";

export function ListasChequeoModule() {
  const [tabActiva, setTabActiva] = useState<TabActiva>("plantillas");
  const { plantillas, obtenerListasPorEstado, eliminarPlantilla, aplicarPlantilla } = useListasChequeo();

  // Estados del modal crear/editar
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [modoModal, setModoModal] = useState<ModoModal>("crear");
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaLista | undefined>(undefined);

  // Estado del modal aplicar lista
  const [modalAplicarOpen, setModalAplicarOpen] = useState(false);
  const [plantillaParaAplicar, setPlantillaParaAplicar] = useState<PlantillaLista | undefined>(undefined);

  // Estado de vista de llenado
  const [vista, setVista] = useState<Vista>("menu");
  const [listaIdLlenar, setListaIdLlenar] = useState<string | null>(null);

  // Contadores para badges
  const misListasCount =
    obtenerListasPorEstado("en-proceso").length +
    obtenerListasPorEstado("borrador").length;
  const historialCount = obtenerListasPorEstado("completada").length;

  // Handlers
  const handleNuevaPlantilla = () => {
    setModoModal("crear");
    setPlantillaSeleccionada(undefined);
    setModalCrearOpen(true);
  };

  const handleVerPlantilla = (plantilla: PlantillaLista) => {
    setModoModal("ver");
    setPlantillaSeleccionada(plantilla);
    setModalCrearOpen(true);
  };

  const handleEditarPlantilla = (plantilla: PlantillaLista) => {
    if (plantilla.esPlantillaSistema) {
      toast.error("No se pueden editar plantillas del sistema");
      return;
    }
    setModoModal("editar");
    setPlantillaSeleccionada(plantilla);
    setModalCrearOpen(true);
  };

  const handleDuplicarPlantilla = (plantilla: PlantillaLista) => {
    setModoModal("duplicar");
    setPlantillaSeleccionada(plantilla);
    setModalCrearOpen(true);
  };

  const handleEliminarPlantilla = (plantilla: PlantillaLista) => {
    if (plantilla.esPlantillaSistema) {
      toast.error("No se pueden eliminar plantillas del sistema");
      return;
    }

    if (confirm(`¿Está seguro de eliminar la plantilla "${plantilla.nombre}"?`)) {
      eliminarPlantilla(plantilla.id);
      toast.success("Plantilla eliminada correctamente");
    }
  };

  const handleAplicarPlantilla = (plantilla: PlantillaLista) => {
    setPlantillaParaAplicar(plantilla);
    setModalAplicarOpen(true);
  };

  const handleLlenarLista = (listaId: string) => {
    setListaIdLlenar(listaId);
    setVista("llenar-lista");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* HEADER */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Título y descripción */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#003DA5] to-[#0051D5] flex items-center justify-center shadow-lg">
                  <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Listas de Chequeo Digitales
                  </h1>
                  <p className="text-sm text-slate-600">
                    Gestión de plantillas y aplicación de listas durante auditorías
                  </p>
                </div>
              </div>
            </div>

            {/* Botón crear nueva plantilla */}
            <button
              onClick={handleNuevaPlantilla}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Nueva Plantilla</span>
            </button>
          </div>

          {/* Navegación por tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setTabActiva("plantillas")}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all duration-200
                ${
                  tabActiva === "plantillas"
                    ? "bg-white text-[#003DA5] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }
              `}
            >
              <FileText className="w-4 h-4" />
              <span>Plantillas</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {plantillas.length}
              </span>
            </button>

            <button
              onClick={() => setTabActiva("mis-listas")}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all duration-200
                ${
                  tabActiva === "mis-listas"
                    ? "bg-white text-[#003DA5] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }
              `}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Mis Listas</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                {misListasCount}
              </span>
            </button>

            <button
              onClick={() => setTabActiva("historial")}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all duration-200
                ${
                  tabActiva === "historial"
                    ? "bg-white text-[#003DA5] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }
              `}
            >
              <History className="w-4 h-4" />
              <span>Historial</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                {historialCount}
              </span>
            </button>

            <button
              onClick={() => setTabActiva("reportes")}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all duration-200
                ${
                  tabActiva === "reportes"
                    ? "bg-white text-[#003DA5] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }
              `}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reportes</span>
            </button>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* CONTENIDO DE TABS */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {tabActiva === "plantillas" && (
          <PlantillasTab
            onVerPlantilla={handleVerPlantilla}
            onEditarPlantilla={handleEditarPlantilla}
            onDuplicarPlantilla={handleDuplicarPlantilla}
            onEliminarPlantilla={handleEliminarPlantilla}
            onAplicarPlantilla={handleAplicarPlantilla}
          />
        )}
        {tabActiva === "mis-listas" && <MisListasTab onLlenarLista={handleLlenarLista} />}
        {tabActiva === "historial" && <HistorialTab />}
        {tabActiva === "reportes" && <DashboardReportes />}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODALES */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      
      {/* Modal Crear/Editar/Duplicar Plantilla */}
      <ModalCrearPlantilla
        isOpen={modalCrearOpen}
        onClose={() => {
          setModalCrearOpen(false);
          setPlantillaSeleccionada(undefined);
        }}
        plantillaEditar={plantillaSeleccionada}
        modo={modoModal}
      />

      {/* Modal Aplicar Lista */}
      {plantillaParaAplicar && (
        <ModalAplicarLista
          isOpen={modalAplicarOpen}
          onClose={() => {
            setModalAplicarOpen(false);
            setPlantillaParaAplicar(undefined);
          }}
          plantilla={plantillaParaAplicar}
        />
      )}

      {/* Vista de Llenado de Lista */}
      {vista === "llenar-lista" && listaIdLlenar && (
        <div className="fixed inset-0 bg-white z-50">
          <LlenarListaChequeo
            listaId={listaIdLlenar}
            onVolver={() => {
              setVista("menu");
              setListaIdLlenar(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB: PLANTILLAS - VERSIÓN COMPLETA CON DATOS REALES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PlantillasTabProps {
  onVerPlantilla: (plantilla: PlantillaLista) => void;
  onEditarPlantilla: (plantilla: PlantillaLista) => void;
  onDuplicarPlantilla: (plantilla: PlantillaLista) => void;
  onEliminarPlantilla: (plantilla: PlantillaLista) => void;
  onAplicarPlantilla: (plantilla: PlantillaLista) => void;
}

function PlantillasTab({
  onVerPlantilla,
  onEditarPlantilla,
  onDuplicarPlantilla,
  onEliminarPlantilla,
  onAplicarPlantilla,
}: PlantillasTabProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<string>("todos");
  const { plantillas } = useListasChequeo();

  // Filtrar plantillas
  const plantillasFiltradas = plantillas.filter((plantilla) => {
    // Filtro por búsqueda
    const matchBusqueda =
      busqueda === "" ||
      plantilla.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      plantilla.proceso.toLowerCase().includes(busqueda.toLowerCase()) ||
      plantilla.codigo.toLowerCase().includes(busqueda.toLowerCase());

    // Filtro por tipo
    const matchTipo =
      filtroActivo === "todos" ||
      (filtroActivo === "sistema" && plantilla.esPlantillaSistema) ||
      (filtroActivo === "personalizadas" && !plantilla.esPlantillaSistema);

    return matchBusqueda && matchTipo;
  });

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar plantillas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
            />
          </div>

          {/* Filtro */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <select
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
            >
              <option value="todos">Todas las plantillas</option>
              <option value="sistema">Plantillas del sistema</option>
              <option value="personalizadas">Personalizadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de plantillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plantillasFiltradas.map((plantilla) => (
          <PlantillaCard
            key={plantilla.id}
            plantilla={plantilla}
            onVer={() => onVerPlantilla(plantilla)}
            onEditar={() => onEditarPlantilla(plantilla)}
            onDuplicar={() => onDuplicarPlantilla(plantilla)}
            onEliminar={() => onEliminarPlantilla(plantilla)}
            onAplicar={() => onAplicarPlantilla(plantilla)}
          />
        ))}
      </div>

      {/* Estado vacío si no hay resultados */}
      {plantillasFiltradas.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No se encontraron plantillas
          </h3>
          <p className="text-slate-600 mb-4">
            Intenta con otros términos de búsqueda o ajusta los filtros
          </p>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE: CARD DE PLANTILLA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PlantillaCardProps {
  plantilla: PlantillaLista;
  onVer: () => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
  onAplicar: () => void;
}

function PlantillaCard({
  plantilla,
  onVer,
  onEditar,
  onDuplicar,
  onEliminar,
  onAplicar,
}: PlantillaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Header de la card */}
      <div className="bg-gradient-to-r from-[#E0EDFF] to-[#F0F7FF] p-4 border-b border-slate-200">
        <div className="flex items-start justify-between">
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
            <h3 className="font-semibold text-slate-900 leading-snug">
              {plantilla.nombre}
            </h3>
          </div>

          {/* Menú de acciones */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 hover:bg-white/50 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-slate-600" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 min-w-[160px]">
                <button
                  onClick={() => {
                    onVer();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver Detalles
                </button>
                
                {!plantilla.esPlantillaSistema && (
                  <button
                    onClick={() => {
                      onEditar();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                )}

                <button
                  onClick={() => {
                    onDuplicar();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Duplicar
                </button>

                <div className="h-px bg-slate-200 my-1" />

                <button
                  onClick={() => {
                    // TODO: Exportar plantilla
                    toast.success("Exportando plantilla...");
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </button>

                {!plantilla.esPlantillaSistema && (
                  <>
                    <div className="h-px bg-slate-200 my-1" />
                    <button
                      onClick={() => {
                        onEliminar();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-3">
        {/* Información */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Ítems:</span>
            <span className="font-semibold text-slate-900">
              {plantilla.items.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Proceso:</span>
            <span className="font-medium text-slate-900 text-right text-xs">
              {plantilla.procesoAsociado}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Versión:</span>
            <span className="font-medium text-slate-900">{plantilla.version}</span>
          </div>
        </div>

        {/* Última actualización */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>Actualizado: {plantilla.fechaCreacion}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onAplicar}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white text-sm font-medium rounded-lg hover:shadow-md transition-all duration-200"
          >
            Aplicar Lista
          </button>
          <button
            onClick={onVer}
            className="px-3 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-all duration-200"
          >
            Ver
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB: MIS LISTAS (En proceso/Borrador) - CON DATOS REALES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MisListasTab({ onLlenarLista }: { onLlenarLista: (listaId: string) => void }) {
  const { obtenerListasPorEstado } = useListasChequeo();
  
  const listasEnProceso = obtenerListasPorEstado("en-proceso");
  const listasBorrador = obtenerListasPorEstado("borrador");
  const misListas = [...listasEnProceso, ...listasBorrador];

  return (
    <div className="space-y-4">
      {misListas.map((lista) => (
        <div
          key={lista.id}
          className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-[#003DA5] bg-[#E0EDFF] px-2 py-0.5 rounded">
                  {lista.id}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    lista.estado === "en-proceso"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {lista.estado === "en-proceso" ? "En Proceso" : "Borrador"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {lista.plantillaNombre}
              </h3>
              <p className="text-sm text-slate-600">
                Auditoría: {lista.auditoriaCodigo}
              </p>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onLlenarLista(lista.id)}
                className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#0051D5] text-white text-sm font-medium rounded-lg hover:shadow-md transition-all duration-200"
              >
                Continuar
              </button>
              <button className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Progreso</span>
              <span className="font-semibold text-slate-900">
                {lista.progreso}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#003DA5] to-[#0051D5] rounded-full transition-all duration-300"
                style={{ width: `${lista.progreso}%` }}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>Iniciado: {lista.fechaInicio}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Estado vacío */}
      {misListas.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No tienes listas en proceso
          </h3>
          <p className="text-slate-600 mb-4">
            Aplica una plantilla desde la sección de Plantillas para comenzar
          </p>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB: HISTORIAL (Listas completadas) - CON DATOS REALES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function HistorialTab() {
  const { obtenerListasPorEstado, obtenerPlantillaPorId } = useListasChequeo();
  const historial = obtenerListasPorEstado("completada");
  const [modalPDFOpen, setModalPDFOpen] = useState(false);
  const [modalHallazgoOpen, setModalHallazgoOpen] = useState(false);
  const [listaSeleccionada, setListaSeleccionada] = useState<any>(null);

  const handleVerPDF = (lista: any) => {
    setListaSeleccionada(lista);
    setModalPDFOpen(true);
  };

  const handleGenerarHallazgo = (lista: any) => {
    setListaSeleccionada(lista);
    setModalHallazgoOpen(true);
  };

  return (
    <div className="space-y-4">
      {historial.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded">
                  {item.id}
                </span>
                <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  ✓ Completada
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {item.plantillaNombre}
              </h3>
              <p className="text-sm text-slate-600 mb-3">
                Auditoría: {item.auditoriaCodigo}
              </p>

              {/* Información adicional */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Auditor:</span>
                  <p className="font-medium text-slate-900">
                    {item.auditorNombre || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">Completado:</span>
                  <p className="font-medium text-slate-900">
                    {item.fechaCompletado}
                  </p>
                </div>
              </div>

              {/* Fecha de firma */}
              {item.firmaDigital && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  Firmado digitalmente el {item.firmaDigital.fecha}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => handleVerPDF(item)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-all duration-200"
              >
                Ver PDF
              </button>
              <button
                onClick={() => handleGenerarHallazgo(item)}
                className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Estado vacío */}
      {historial.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No hay listas completadas
          </h3>
          <p className="text-slate-600">
            Las listas completadas y firmadas aparecerán aquí
          </p>
        </div>
      )}
    </div>
  );
}