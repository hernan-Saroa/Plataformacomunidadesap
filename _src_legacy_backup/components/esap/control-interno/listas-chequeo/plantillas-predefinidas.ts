// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLANTILLAS PREDEFINIDAS DE LISTAS DE CHEQUEO (VACÍO)
// Sistema de Control Interno de Gestión - ESAP
// Archivo stub - datos eliminados para reducir tamaño del proyecto
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ItemLista {
  id: string;
  orden: number;
  titulo: string;
  descripcion?: string;
  tipoRespuesta: 'cumple-no-cumple' | 'si-no' | 'texto-libre';
  requiereEvidencia: boolean;
  esObligatorio: boolean;
  categoria?: string;
}

export interface PlantillaLista {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  procesoAsociado: string;
  version: string;
  fechaCreacion: string;
  items: ItemLista[];
  esPlantillaSistema: boolean;
  activa: boolean;
}

// Array vacío - plantillas eliminadas para reducir tamaño del proyecto
// Las plantillas se pueden crear manualmente desde la interfaz
export const PLANTILLAS_PREDEFINIDAS: PlantillaLista[] = [];
