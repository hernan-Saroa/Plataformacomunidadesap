import { ModalNuevaDemandaRESTAURADO, NuevaDemandaData as NuevaDemandaDataRestaurado } from './ModalNuevaDemandaRESTAURADO';

interface ModalNuevaDemandaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demanda: NuevaDemandaData) => void;
}

export interface NuevaDemandaData {
  numeroRadicado: string;
  medioControl: string;
  tipoProceso: string;
  demandantes: Array<{
    id: string;
    nombre: string;
    tipoPersona: 'natural' | 'juridica';
    identificacion: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    apoderado?: string;
  }>;
  demandados: Array<{
    id: string;
    nombre: string;
    tipoPersona: 'natural' | 'juridica';
    identificacion: string;
    cargo?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    apoderado?: string;
  }>;
  otrosActores: Array<{
    id: string;
    nombre: string;
    tipoPersona: 'natural' | 'juridica';
    identificacion: string;
    rol: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    apoderado?: string;
  }>;
  cuantia: string;
  juzgado: string;
  ciudad: string;
  departamento: string;
  fechaNotificacion: string;
  fechaVencimiento: string;
  abogadoAsignado: string;
  etapa: string;
  pretensiones: string;
  hechos: string;
  observaciones: string;
  terminoProcesalDias?: number;
  tipoConteoTermino?: 'HABILES' | 'CALENDARIO';
}

function mapTipoPersona(tipo: 'Natural' | 'Juridica'): 'natural' | 'juridica' {
  return tipo === 'Natural' ? 'natural' : 'juridica';
}

function mapDemandaData(data: NuevaDemandaDataRestaurado): NuevaDemandaData {
  return {
    numeroRadicado: data.numeroRadicado,
    medioControl: data.medioControl,
    tipoProceso: data.tipoProcesoJudicial,
    demandantes: data.demandantes.map((item) => ({
      id: item.id,
      nombre: item.nombreCompleto,
      tipoPersona: mapTipoPersona(item.tipoPersona),
      identificacion: item.cedula,
      telefono: item.telefono,
      email: item.correo,
      direccion: item.direccion,
      apoderado: item.apoderado?.nombreCompleto || '',
    })),
    demandados: data.demandados.map((item) => ({
      id: item.id,
      nombre: item.nombreCompleto,
      tipoPersona: mapTipoPersona(item.tipoPersona),
      identificacion: item.cedula,
      cargo: item.cargoFuncion || '',
      telefono: item.telefono,
      email: item.correo,
      direccion: item.direccion,
      apoderado: item.apoderado?.nombreCompleto || '',
    })),
    otrosActores: data.otrosActores.map((item) => ({
      id: item.id,
      nombre: item.nombreCompleto,
      tipoPersona: mapTipoPersona(item.tipoPersona),
      identificacion: item.cedula,
      rol: item.rol,
      telefono: item.telefono,
      email: item.correo,
      direccion: item.direccion,
      apoderado: item.apoderado?.nombreCompleto || '',
    })),
    cuantia: data.cuantia ? String(data.cuantia) : '',
    juzgado: data.juzgadoTribunal,
    ciudad: data.ciudad,
    departamento: data.departamento,
    fechaNotificacion: data.fechaNotificacion,
    fechaVencimiento: data.fechaVencimiento,
    abogadoAsignado: data.abogadoResponsable,
    etapa: data.etapaProcesal,
    pretensiones: data.pretensiones,
    hechos: data.hechos,
    observaciones: data.observaciones,
    terminoProcesalDias: data.termino,
    tipoConteoTermino: data.tipoPlazo === 'Dias Calendario' ? 'CALENDARIO' : 'HABILES',
  };
}

export function ModalNuevaDemanda({ isOpen, onClose, onSave }: ModalNuevaDemandaProps) {
  const handleSave = (data: NuevaDemandaDataRestaurado) => {
    onSave(mapDemandaData(data));
  };

  return (
    <ModalNuevaDemandaRESTAURADO
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
    />
  );
}
