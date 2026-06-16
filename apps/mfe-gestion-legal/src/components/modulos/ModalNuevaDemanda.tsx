import { ModalNuevaDemandaRESTAURADO, NuevaDemandaData as NuevaDemandaDataRestaurado } from './ModalNuevaDemandaRESTAURADO';

interface ModalNuevaDemandaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demanda: NuevaDemandaData) => void;
  tableroSeleccionado?: string;
}

export interface NuevaDemandaData {
  numeroRadicado: string;
  medioControl: string;
  tipoProceso: string;
  territorial?: string;
  cetap?: string;
  dependencia?: string;
  territorialNombre?: string;
  cetapNombre?: string;
  dependenciaNombre?: string;
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
  nivelRiesgo?: string;
  provisionContable?: number;
  fechaEstimacionProvision?: string;
  observacionesProvision?: string;
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
  esDelitoAdminPublica?: boolean;
  esConductaPatrimonioPublico?: boolean;
  camposAdicionales?: Record<string, any>;
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
    nivelRiesgo: data.nivelRiesgo,
    provisionContable: data.provisionContable,
    fechaEstimacionProvision: data.fechaEstimacionProvision,
    observacionesProvision: data.observacionesProvision,
    fechaNotificacion: data.fechaNotificacion,
    fechaVencimiento: data.fechaVencimiento,
    abogadoAsignado: data.abogadoResponsable,
    etapa: data.etapaProcesal,
    pretensiones: data.pretensiones,
    hechos: data.hechos,
    observaciones: data.observaciones,
    terminoProcesalDias: data.termino,
    tipoConteoTermino: data.tipoPlazo === 'Horas' ? 'HORAS' : data.tipoPlazo === 'Dias Calendario' ? 'CALENDARIO' : 'HABILES',
    esDelitoAdminPublica: data.esDelitoAdminPublica || false,
    esConductaPatrimonioPublico: data.esConductaPatrimonioPublico || false,
    territorial: data.territorial,
    cetap: data.cetap,
    dependencia: data.dependencia,
    territorialNombre: (data as any).territorialNombre,
    cetapNombre: (data as any).cetapNombre,
    dependenciaNombre: (data as any).dependenciaNombre,
    camposAdicionales: data.camposAdicionales,
  };
}

export function ModalNuevaDemanda({ isOpen, onClose, onSave, tableroSeleccionado }: ModalNuevaDemandaProps) {
  const handleSave = (data: NuevaDemandaDataRestaurado) => {
    onSave(mapDemandaData(data));
  };

  return (
    <ModalNuevaDemandaRESTAURADO
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      tableroSeleccionado={tableroSeleccionado}
    />
  );
}
