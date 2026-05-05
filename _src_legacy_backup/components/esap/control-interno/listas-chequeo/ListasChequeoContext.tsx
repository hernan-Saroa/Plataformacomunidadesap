import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  PlantillaLista,
  ItemLista,
  PLANTILLAS_PREDEFINIDAS,
} from "./plantillas-predefinidas";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIPOS ADICIONALES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ListaAplicada {
  id: string;
  plantillaId: string;
  plantillaNombre: string;
  auditoriaId: string;
  auditoriaCodigo: string;
  estado: "borrador" | "en-proceso" | "completada";
  fechaInicio: string;
  fechaCompletado?: string;
  fechaFirma?: string;
  auditorId?: string;
  auditorNombre?: string;
  progreso: number; // 0-100
  respuestas: RespuestaItem[];
  firmaDigital?: FirmaDigital;
}

export interface RespuestaItem {
  itemId: string;
  respuesta: "cumple" | "no-cumple" | "si" | "no" | "n-a" | string;
  observaciones?: string;
  evidencias: Evidencia[];
  fechaRespuesta: string;
}

export interface Evidencia {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  url: string; // URL simulada o blob
  fechaCarga: string;
}

export interface FirmaDigital {
  nombreCompleto: string;
  cargo: string;
  fecha: string;
  timestamp: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ListasChequeoContextType {
  // Plantillas
  plantillas: PlantillaLista[];
  plantillasPersonalizadas: PlantillaLista[];
  obtenerPlantillaPorId: (id: string) => PlantillaLista | undefined;
  crearPlantilla: (plantilla: Omit<PlantillaLista, "id" | "fechaCreacion">) => PlantillaLista;
  actualizarPlantilla: (id: string, plantilla: Partial<PlantillaLista>) => void;
  eliminarPlantilla: (id: string) => void;
  duplicarPlantilla: (id: string) => PlantillaLista | null;

  // Listas aplicadas
  listasAplicadas: ListaAplicada[];
  obtenerListaPorId: (id: string) => ListaAplicada | undefined;
  aplicarPlantilla: (plantillaId: string, auditoriaId: string, auditoriaCodigo: string) => ListaAplicada;
  actualizarLista: (id: string, lista: Partial<ListaAplicada>) => void;
  guardarRespuesta: (listaId: string, itemId: string, respuesta: Partial<RespuestaItem>) => void;
  firmarLista: (listaId: string, firma: FirmaDigital) => void;
  eliminarLista: (id: string) => void;

  // Utilidades
  calcularProgreso: (listaId: string) => number;
  obtenerListasPorEstado: (estado: ListaAplicada["estado"]) => ListaAplicada[];
  obtenerListasPorAuditoria: (auditoriaId: string) => ListaAplicada[];
}

const ListasChequeoContext = createContext<ListasChequeoContextType | undefined>(
  undefined
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROVIDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STORAGE_KEY_PLANTILLAS = "esap_listas_chequeo_plantillas_personalizadas";
const STORAGE_KEY_LISTAS = "esap_listas_chequeo_aplicadas";

export function ListasChequeoProvider({ children }: { children: ReactNode }) {
  // ──────────────────────────────────────────────────────────────────
  // ESTADO
  // ──────────────────────────────────────────────────────────────────

  const [plantillasPersonalizadas, setPlantillasPersonalizadas] = useState<PlantillaLista[]>([]);
  const [listasAplicadas, setListasAplicadas] = useState<ListaAplicada[]>([]);

  // ──────────────────────────────────────────────────────────────────
  // CARGAR DESDE LOCALSTORAGE AL INICIAR
  // ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Cargar plantillas personalizadas
    const plantillasGuardadas = localStorage.getItem(STORAGE_KEY_PLANTILLAS);
    if (plantillasGuardadas) {
      try {
        const parsed = JSON.parse(plantillasGuardadas);
        setPlantillasPersonalizadas(parsed);
      } catch (error) {
        console.error("Error al cargar plantillas personalizadas:", error);
      }
    }

    // Cargar listas aplicadas
    const listasGuardadas = localStorage.getItem(STORAGE_KEY_LISTAS);
    if (listasGuardadas) {
      try {
        const parsed = JSON.parse(listasGuardadas);
        setListasAplicadas(parsed);
      } catch (error) {
        console.error("Error al cargar listas aplicadas:", error);
      }
    }

    // Cargar datos mock iniciales si no hay nada guardado
    if (!listasGuardadas) {
      const mockListas: ListaAplicada[] = [
        {
          id: "LST-001",
          plantillaId: "PLT-001",
          plantillaNombre: "Gestión Financiera",
          auditoriaId: "AUD-001",
          auditoriaCodigo: "AUD-2025-001",
          estado: "en-proceso",
          fechaInicio: "2025-01-20",
          progreso: 80,
          respuestas: [],
        },
        {
          id: "LST-002",
          plantillaId: "PLT-002",
          plantillaNombre: "Gestión Administrativa",
          auditoriaId: "AUD-003",
          auditoriaCodigo: "AUD-2025-003",
          estado: "borrador",
          fechaInicio: "2025-01-21",
          progreso: 45,
          respuestas: [],
        },
        {
          id: "LST-003",
          plantillaId: "PLT-005",
          plantillaNombre: "Gestión del Talento Humano",
          auditoriaId: "AUD-005",
          auditoriaCodigo: "AUD-2025-005",
          estado: "borrador",
          fechaInicio: "2025-01-22",
          progreso: 25,
          respuestas: [],
        },
        // Listas completadas (historial)
        {
          id: "LST-H-001",
          plantillaId: "PLT-001",
          plantillaNombre: "Gestión Financiera",
          auditoriaId: "AUD-045",
          auditoriaCodigo: "AUD-2024-045",
          estado: "completada",
          fechaInicio: "2025-01-10",
          fechaCompletado: "2025-01-18",
          fechaFirma: "2025-01-18T16:30:00",
          auditorId: "USR-001",
          auditorNombre: "Fernando Ávila",
          progreso: 100,
          respuestas: [],
          firmaDigital: {
            nombreCompleto: "Fernando Ávila",
            cargo: "Jefe OCI",
            fecha: "18/01/2025",
            timestamp: "2025-01-18T16:30:00",
          },
        },
        {
          id: "LST-H-002",
          plantillaId: "PLT-004",
          plantillaNombre: "Adquisición de Bienes y Servicios",
          auditoriaId: "AUD-042",
          auditoriaCodigo: "AUD-2024-042",
          estado: "completada",
          fechaInicio: "2025-01-08",
          fechaCompletado: "2025-01-15",
          fechaFirma: "2025-01-15T14:15:00",
          auditorId: "USR-002",
          auditorNombre: "Lucila Villamil",
          progreso: 100,
          respuestas: [],
          firmaDigital: {
            nombreCompleto: "Lucila Villamil",
            cargo: "Auditora Líder",
            fecha: "15/01/2025",
            timestamp: "2025-01-15T14:15:00",
          },
        },
      ];
      setListasAplicadas(mockListas);
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────
  // GUARDAR EN LOCALSTORAGE CUANDO CAMBIA
  // ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_PLANTILLAS,
      JSON.stringify(plantillasPersonalizadas)
    );
  }, [plantillasPersonalizadas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LISTAS, JSON.stringify(listasAplicadas));
  }, [listasAplicadas]);

  // ──────────────────────────────────────────────────────────────────
  // FUNCIONES - PLANTILLAS
  // ──────────────────────────────────────────────────────────────────

  const plantillas = [...PLANTILLAS_PREDEFINIDAS, ...plantillasPersonalizadas];

  const obtenerPlantillaPorId = (id: string): PlantillaLista | undefined => {
    return plantillas.find((p) => p.id === id);
  };

  const crearPlantilla = (
    plantilla: Omit<PlantillaLista, "id" | "fechaCreacion">
  ): PlantillaLista => {
    const nuevaPlantilla: PlantillaLista = {
      ...plantilla,
      id: `PLT-CUSTOM-${Date.now()}`,
      fechaCreacion: new Date().toISOString().split("T")[0],
      esPlantillaSistema: false,
      activa: true,
    };

    setPlantillasPersonalizadas((prev) => [...prev, nuevaPlantilla]);
    return nuevaPlantilla;
  };

  const actualizarPlantilla = (
    id: string,
    plantilla: Partial<PlantillaLista>
  ): void => {
    // Solo permitir actualizar plantillas personalizadas
    setPlantillasPersonalizadas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...plantilla } : p))
    );
  };

  const eliminarPlantilla = (id: string): void => {
    // Solo permitir eliminar plantillas personalizadas
    setPlantillasPersonalizadas((prev) => prev.filter((p) => p.id !== id));
  };

  const duplicarPlantilla = (id: string): PlantillaLista | null => {
    const original = obtenerPlantillaPorId(id);
    if (!original) return null;

    const duplicada: PlantillaLista = {
      ...original,
      id: `PLT-CUSTOM-${Date.now()}`,
      codigo: `${original.codigo}-COPY`,
      nombre: `${original.nombre} (Copia)`,
      fechaCreacion: new Date().toISOString().split("T")[0],
      esPlantillaSistema: false,
      activa: true,
      version: "1.0",
    };

    setPlantillasPersonalizadas((prev) => [...prev, duplicada]);
    return duplicada;
  };

  // ──────────────────────────────────────────────────────────────────
  // FUNCIONES - LISTAS APLICADAS
  // ──────────────────────────────────────────────────────────────────

  const obtenerListaPorId = (id: string): ListaAplicada | undefined => {
    return listasAplicadas.find((l) => l.id === id);
  };

  const aplicarPlantilla = (
    plantillaId: string,
    auditoriaId: string,
    auditoriaCodigo: string
  ): ListaAplicada => {
    const plantilla = obtenerPlantillaPorId(plantillaId);
    if (!plantilla) {
      throw new Error("Plantilla no encontrada");
    }

    const nuevaLista: ListaAplicada = {
      id: `LST-${Date.now()}`,
      plantillaId: plantilla.id,
      plantillaNombre: plantilla.nombre,
      auditoriaId,
      auditoriaCodigo,
      estado: "borrador",
      fechaInicio: new Date().toISOString().split("T")[0],
      progreso: 0,
      respuestas: [],
    };

    setListasAplicadas((prev) => [...prev, nuevaLista]);
    return nuevaLista;
  };

  const actualizarLista = (id: string, lista: Partial<ListaAplicada>): void => {
    setListasAplicadas((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...lista } : l))
    );
  };

  const guardarRespuesta = (
    listaId: string,
    itemId: string,
    respuesta: Partial<RespuestaItem>
  ): void => {
    setListasAplicadas((prev) =>
      prev.map((lista) => {
        if (lista.id !== listaId) return lista;

        const respuestasActualizadas = [...lista.respuestas];
        const indiceExistente = respuestasActualizadas.findIndex(
          (r) => r.itemId === itemId
        );

        const nuevaRespuesta: RespuestaItem = {
          itemId,
          respuesta: respuesta.respuesta || "n-a",
          observaciones: respuesta.observaciones || "",
          evidencias: respuesta.evidencias || [],
          fechaRespuesta: new Date().toISOString(),
        };

        if (indiceExistente >= 0) {
          respuestasActualizadas[indiceExistente] = {
            ...respuestasActualizadas[indiceExistente],
            ...nuevaRespuesta,
          };
        } else {
          respuestasActualizadas.push(nuevaRespuesta);
        }

        // Recalcular progreso
        const plantilla = obtenerPlantillaPorId(lista.plantillaId);
        const totalItems = plantilla?.items.length || 1;
        const itemsRespondidos = respuestasActualizadas.filter(
          (r) => r.respuesta !== "n-a"
        ).length;
        const progreso = Math.round((itemsRespondidos / totalItems) * 100);

        return {
          ...lista,
          respuestas: respuestasActualizadas,
          progreso,
          estado: progreso > 0 ? "en-proceso" : "borrador",
        };
      })
    );
  };

  const firmarLista = (listaId: string, firma: FirmaDigital): void => {
    setListasAplicadas((prev) =>
      prev.map((lista) =>
        lista.id === listaId
          ? {
              ...lista,
              estado: "completada" as const,
              fechaCompletado: new Date().toISOString().split("T")[0],
              fechaFirma: firma.timestamp,
              firmaDigital: firma,
              progreso: 100,
            }
          : lista
      )
    );
  };

  const eliminarLista = (id: string): void => {
    setListasAplicadas((prev) => prev.filter((l) => l.id !== id));
  };

  // ──────────────────────────────────────────────────────────────────
  // FUNCIONES - UTILIDADES
  // ──────────────────────────────────────────────────────────────────

  const calcularProgreso = (listaId: string): number => {
    const lista = obtenerListaPorId(listaId);
    if (!lista) return 0;

    const plantilla = obtenerPlantillaPorId(lista.plantillaId);
    if (!plantilla) return 0;

    const totalItems = plantilla.items.length;
    const itemsRespondidos = lista.respuestas.filter(
      (r) => r.respuesta !== "n-a"
    ).length;

    return Math.round((itemsRespondidos / totalItems) * 100);
  };

  const obtenerListasPorEstado = (
    estado: ListaAplicada["estado"]
  ): ListaAplicada[] => {
    return listasAplicadas.filter((l) => l.estado === estado);
  };

  const obtenerListasPorAuditoria = (auditoriaId: string): ListaAplicada[] => {
    return listasAplicadas.filter((l) => l.auditoriaId === auditoriaId);
  };

  // ──────────────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ──────────────────────────────────────────────────────────────────

  const value: ListasChequeoContextType = {
    // Plantillas
    plantillas,
    plantillasPersonalizadas,
    obtenerPlantillaPorId,
    crearPlantilla,
    actualizarPlantilla,
    eliminarPlantilla,
    duplicarPlantilla,

    // Listas aplicadas
    listasAplicadas,
    obtenerListaPorId,
    aplicarPlantilla,
    actualizarLista,
    guardarRespuesta,
    firmarLista,
    eliminarLista,

    // Utilidades
    calcularProgreso,
    obtenerListasPorEstado,
    obtenerListasPorAuditoria,
  };

  return (
    <ListasChequeoContext.Provider value={value}>
      {children}
    </ListasChequeoContext.Provider>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HOOK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useListasChequeo() {
  const context = useContext(ListasChequeoContext);
  if (!context) {
    throw new Error(
      "useListasChequeo debe ser usado dentro de ListasChequeoProvider"
    );
  }
  return context;
}
