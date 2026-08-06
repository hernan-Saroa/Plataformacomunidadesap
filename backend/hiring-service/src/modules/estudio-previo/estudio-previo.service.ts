import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { createHash } from 'crypto';

import { Proceso } from '../../entities/proceso.entity';
import { Expediente } from '../../entities/expediente.entity';
import { NUMERAL_ESTUDIO_PREVIO, ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { CampoFormulario, TipoCampo } from '../../entities/campo-formulario.entity';
import { Documento } from '../../entities/documento.entity';
import { Trazabilidad, AccionTraza } from '../../entities/trazabilidad.entity';
import { Revision } from '../../entities/revision.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { CrearProcesoDto, GuardarBorradorDto } from './dto/estudio-previo.dto';

const ETAPA_ESTUDIOS_PREVIOS = 3;

/**
 * "Vacío" depende del tipo: un 0 en un campo numérico está diligenciado,
 * mientras que una cadena de espacios no lo está. Sin esto, `0` y `false`
 * se reportarían como faltantes.
 */
export function esVacio(tipo: TipoCampo, valor: unknown): boolean {
  if (valor === undefined || valor === null) return true;

  switch (tipo) {
    case 'numero':
    case 'moneda':
      return typeof valor !== 'number' || Number.isNaN(valor);
    case 'seleccion':
      if (Array.isArray(valor)) return valor.length === 0;
      return typeof valor !== 'string' || valor.trim() === '';
    default:
      return typeof valor !== 'string' || valor.trim() === '';
  }
}

/**
 * Un campo bloquea el envío solo si es obligatorio, se diligencia en el
 * formulario y está vacío.
 *
 * Los de solo lectura quedan fuera aunque sean obligatorios: su valor vive en
 * el proceso y nunca aparece en el JSON de la actividad, así que contarlos los
 * dejaría como faltantes para siempre y ningún estudio previo podría enviarse.
 */
export function esFaltante(
  campo: Pick<CampoFormulario, 'codigo' | 'tipo' | 'obligatorio' | 'soloLectura'>,
  datos: Record<string, any> | null | undefined,
): boolean {
  if (!campo.obligatorio || campo.soloLectura) return false;
  return esVacio(campo.tipo, datos?.[campo.codigo]);
}

/** JSON con claves ordenadas: el hash de un mismo contenido no debe variar. */
function jsonCanonico(valor: any): string {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor);
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(',')}]`;
  const claves = Object.keys(valor).sort();
  return `{${claves.map((k) => `${JSON.stringify(k)}:${jsonCanonico(valor[k])}`).join(',')}}`;
}

function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

@Injectable()
export class EstudioPrevioService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- proceso ---

  /** Modalidades vigentes, en el orden de las columnas de la matriz. */
  async modalidades() {
    return this.dataSource.getRepository(Modalidad).find({
      where: { activa: true },
      order: { orden: 'ASC' },
    });
  }

  async crearProceso(dto: CrearProcesoDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const anio = new Date().getFullYear();

      // La FK ya lo impediría, pero devolvería un 500 sin explicación.
      const modalidad = await em.findOne(Modalidad, {
        where: { codigo: dto.modalidad, activa: true },
      });
      if (!modalidad) {
        throw new BadRequestException(
          `La modalidad "${dto.modalidad}" no existe o ya no está vigente`,
        );
      }

      // Secuencias en vez de SELECT MAX: dos creaciones simultáneas no colisionan.
      const [{ n: nRad }] = await em.query(`SELECT nextval('hiring.radicado_seq') AS n`);
      const [{ n: nExp }] = await em.query(`SELECT nextval('hiring.expediente_seq') AS n`);

      const proceso = await em.save(Proceso, {
        radicado: `CTO-${anio}-${String(nRad).padStart(4, '0')}`,
        objeto: dto.objeto,
        modalidad: modalidad.codigo,
        valorEstimado: dto.valorEstimado,
        etapa: ETAPA_ESTUDIOS_PREVIOS,
        createdBy: acceso.userName,
      } as Partial<Proceso>);

      const expediente = await em.save(Expediente, {
        procesoId: proceso.id,
        numeroExpediente: `EXP-${anio}-${String(nExp).padStart(4, '0')}`,
      } as Partial<Expediente>);

      // El estudio previo nace como borrador vacío junto con el proceso.
      const actividad = await em.save(ProcesoActividad, {
        procesoId: proceso.id,
        numeral: NUMERAL_ESTUDIO_PREVIO,
        estado: 'BORRADOR',
        datos: {},
      } as Partial<ProcesoActividad>);

      // La modalidad queda en la traza: si el catálogo cambia, el expediente
      // sigue mostrando con cuál nació el proceso.
      await this.traza(em, proceso.id, 'proceso', proceso.id, 'CREAR', acceso, {
        radicado: proceso.radicado,
        expediente: expediente.numeroExpediente,
        modalidad: modalidad.codigo,
        modalidadNombre: modalidad.nombre,
      });

      return { ...proceso, expediente, actividad };
    });
  }

  async obtenerProceso(procesoId: string) {
    const proceso = await this.dataSource.getRepository(Proceso).findOne({
      where: { id: procesoId },
      relations: ['expediente'],
    });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');
    return proceso;
  }

  /**
   * Listado con el avance de cada proceso: sin esto la vista solo podría
   * mostrar en qué etapa está, que es lo menos útil para el gestor —
   * lo que importa es qué actividades le faltan y qué lo bloquea.
   */
  async listarProcesos() {
    const procesos = await this.dataSource.getRepository(Proceso).find({
      relations: ['expediente'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    if (procesos.length === 0) return [];

    const ids = procesos.map((p) => p.id);
    const actividades = await this.dataSource.getRepository(ProcesoActividad).find({
      where: { procesoId: In(ids) },
    });
    // Los de solo lectura se llenan desde el proceso y nunca están en el JSON
    // de la actividad; contarlos los dejaría como faltantes para siempre.
    const obligatorios = await this.dataSource.getRepository(CampoFormulario).find({
      where: {
        numeral: NUMERAL_ESTUDIO_PREVIO,
        obligatorio: true,
        activo: true,
        soloLectura: false,
      },
    });

    const porProceso = new Map<string, ProcesoActividad[]>();
    for (const a of actividades) {
      if (!porProceso.has(a.procesoId)) porProceso.set(a.procesoId, []);
      porProceso.get(a.procesoId)!.push(a);
    }

    return procesos.map((proceso) => {
      const propias = porProceso.get(proceso.id) ?? [];
      const estudioPrevio = propias.find((a) => a.numeral === NUMERAL_ESTUDIO_PREVIO);

      const faltantes = estudioPrevio
        ? obligatorios.filter((c) => esVacio(c.tipo, estudioPrevio.datos?.[c.codigo])).length
        : obligatorios.length;

      return {
        ...proceso,
        // Estado del numeral 3.1 y cuánto le falta para poder enviarse
        estudioPrevio: estudioPrevio
          ? {
              estado: estudioPrevio.estado,
              version: estudioPrevio.version,
              camposFaltantes: faltantes,
              camposObligatorios: obligatorios.length,
              actualizadoEn: estudioPrevio.updatedAt,
            }
          : null,
        actividades: propias.map((a) => ({ numeral: a.numeral, estado: a.estado })),
      };
    });
  }

  // ------------------------------------------------------ estudio previo ---

  /** Devuelve los datos y la definición de campos: el front dibuja desde aquí. */
  async obtener(procesoId: string) {
    const proceso = await this.obtenerProceso(procesoId);
    const actividad = await this.obtenerActividad(this.dataSource.manager, procesoId);
    const campos = await this.camposDe(this.dataSource.manager);

    return {
      proceso: {
        id: proceso.id,
        radicado: proceso.radicado,
        objeto: proceso.objeto,
        modalidad: proceso.modalidad,
        valorEstimado: proceso.valorEstimado,
        etapa: proceso.etapa,
        expediente: proceso.expediente?.numeroExpediente,
      },
      estado: actividad.estado,
      version: actividad.version,
      // El valor estimado vive en el proceso desde EFDS-1147. Se inyecta aquí
      // para que el estudio previo lo siga mostrando en su sitio sin duplicar
      // el dato en el JSON de la actividad.
      datos: { ...actividad.datos, valor_estimado: proceso.valorEstimado },
      definicionCampos: campos,
      editable: actividad.estado === 'BORRADOR',
    };
  }

  /** Guarda sin validar obligatorios: el usuario puede dejarlo a medias. */
  async guardarBorrador(procesoId: string, dto: GuardarBorradorDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      await this.validarEtapa(em, procesoId);

      const actividad = await this.obtenerActividad(em, procesoId, true);
      if (actividad.estado === 'EN_REVISION') {
        throw new ConflictException('El estudio previo está en revisión y no admite cambios');
      }
      if (actividad.estado === 'APROBADO') {
        throw new ConflictException('El estudio previo ya fue aprobado y no admite cambios');
      }
      if (dto.version !== undefined && dto.version !== actividad.version) {
        throw new ConflictException(
          'Otra sesión guardó cambios sobre este estudio previo. Recarga antes de continuar.',
        );
      }

      const campos = await this.camposDe(em);
      actividad.datos = this.filtrarYValidar(dto.datos, campos);
      actividad.version += 1;
      await em.save(ProcesoActividad, actividad);

      await this.traza(em, procesoId, 'estudio_previo', actividad.id, 'GUARDAR', acceso, {
        version: actividad.version,
      });

      return { estado: actividad.estado, version: actividad.version, datos: actividad.datos };
    });
  }

  /**
   * Criterio 2: si faltan obligatorios devuelve 422 con la lista.
   * Criterio 1: si está completo, registra el estudio previo como documento
   * del expediente electrónico.
   */
  async enviar(procesoId: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      await this.validarEtapa(em, procesoId);

      // Lock pesimista: sin esto, dos envíos simultáneos pasarían ambos la
      // verificación de estado y registrarían dos snapshots.
      const actividad = await this.obtenerActividad(em, procesoId, true);
      if (actividad.estado === 'EN_REVISION') {
        throw new ConflictException('El estudio previo ya fue enviado');
      }
      if (actividad.estado === 'APROBADO') {
        throw new ConflictException('El estudio previo ya fue aprobado');
      }

      const campos = await this.camposDe(em);
      const faltantes = campos
        .filter((c) => esFaltante(c, actividad.datos))
        .map((c) => ({ codigo: c.codigo, etiqueta: c.etiqueta, grupo: c.grupo }));

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      // El entregable de esta actividad es el estudio previo firmado, no los
      // metadatos: sin el documento la actividad estaría incompleta aunque
      // todos los campos estén diligenciados.
      const adjuntos = await em.count(Documento, {
        where: {
          expedienteId: expediente.id,
          numeral: NUMERAL_ESTUDIO_PREVIO,
          tipo: 'ADJUNTO',
        },
      });

      if (faltantes.length > 0 || adjuntos === 0) {
        throw new UnprocessableEntityException({
          message:
            adjuntos === 0 && faltantes.length === 0
              ? 'Debe adjuntar el estudio previo diligenciado y firmado'
              : 'Faltan datos obligatorios para enviar a revisión',
          camposFaltantes: faltantes,
          documentoFaltante: adjuntos === 0,
        });
      }

      // Copia inmutable de lo enviado: es lo que queda como documento del
      // expediente, con hash para poder probar que no se alteró.
      const snapshot = { ...actividad.datos };
      await em.save(Documento, {
        expedienteId: expediente.id,
        numeral: NUMERAL_ESTUDIO_PREVIO,
        tipo: 'SNAPSHOT_FORMULARIO',
        nombre: 'Estudio previo',
        contenidoSnapshot: snapshot,
        hashSha256: sha256(jsonCanonico(snapshot)),
        version: actividad.version,
        subidoPor: acceso.userName,
      } as Partial<Documento>);

      actividad.estado = 'EN_REVISION';
      actividad.enviadoPor = acceso.userName;
      actividad.enviadoAt = new Date();
      await em.save(ProcesoActividad, actividad);

      await this.traza(em, procesoId, 'estudio_previo', actividad.id, 'ENVIAR', acceso, {
        version: actividad.version,
        fundamentoJuridico: snapshot['fundamento_juridico'],
      });

      return {
        estado: actividad.estado,
        enviadoPor: actividad.enviadoPor,
        enviadoAt: actividad.enviadoAt,
      };
    });
  }

  // ------------------------------------------------------------ plantillas ---

  /**
   * Formatos oficiales aplicables a una actividad. Si se indica la modalidad
   * se devuelve solo el que corresponde: el estudio previo tiene cuatro
   * formatos distintos según cómo se contrate.
   */
  async plantillas(numeral: string, modalidad?: string) {
    const todas = await this.dataSource.getRepository(Plantilla).find({
      where: { numeral, activo: true },
      order: { codigo: 'ASC' },
    });

    if (!modalidad) return todas;

    const aplicables = todas.filter(
      (p) => p.modalidades.length === 0 || p.modalidades.includes(modalidad),
    );
    // Si ninguna declara la modalidad se devuelven todas, para no dejar al
    // usuario sin formato por un dato aún no parametrizado.
    return aplicables.length > 0 ? aplicables : todas;
  }

  // ------------------------------------------------------------- revisión ---

  /**
   * Aprueba el estudio previo enviado (numeral 3.4). A partir de aquí el
   * proceso puede continuar a las etapas siguientes.
   */
  async aprobar(procesoId: string, observaciones: string | undefined, acceso: HiringAccess) {
    return this.decidirRevision(procesoId, 'APROBADO', observaciones, acceso);
  }

  /**
   * Devuelve el estudio previo al gestor con observaciones. Vuelve a
   * BORRADOR para que pueda corregirlo y reenviarlo.
   */
  async devolver(procesoId: string, observaciones: string, acceso: HiringAccess) {
    if (!observaciones?.trim()) {
      throw new BadRequestException(
        'Las observaciones son obligatorias al devolver un estudio previo',
      );
    }
    return this.decidirRevision(procesoId, 'DEVUELTO', observaciones, acceso);
  }

  private async decidirRevision(
    procesoId: string,
    decision: 'APROBADO' | 'DEVUELTO',
    observaciones: string | undefined,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      // Lock pesimista: dos revisores simultáneos no deben registrar dos
      // decisiones sobre el mismo envío.
      const actividad = await this.obtenerActividad(em, procesoId, true);

      if (actividad.estado !== 'EN_REVISION') {
        throw new ConflictException(
          actividad.estado === 'APROBADO'
            ? 'El estudio previo ya fue aprobado'
            : 'El estudio previo no está en revisión',
        );
      }

      await em.save(Revision, {
        procesoActividadId: actividad.id,
        decision,
        observaciones: observaciones?.trim() || null,
        versionRevisada: actividad.version,
        revisadoPor: acceso.userName,
        revisadoPorId: acceso.userId,
      } as Partial<Revision>);

      // Devolver lo regresa a BORRADOR para que el gestor pueda editarlo.
      actividad.estado = decision === 'APROBADO' ? 'APROBADO' : 'BORRADOR';
      actividad.revisadoPor = acceso.userName;
      actividad.revisadoAt = new Date();
      await em.save(ProcesoActividad, actividad);

      await this.traza(
        em,
        procesoId,
        'estudio_previo',
        actividad.id,
        decision === 'APROBADO' ? 'APROBAR' : 'DEVOLVER',
        acceso,
        { version: actividad.version, observaciones },
      );

      return {
        estado: actividad.estado,
        decision,
        revisadoPor: actividad.revisadoPor,
        revisadoAt: actividad.revisadoAt,
      };
    });
  }

  /** Historial de revisiones del estudio previo, de la más reciente a la más antigua. */
  async revisiones(procesoId: string) {
    const actividad = await this.obtenerActividad(this.dataSource.manager, procesoId);
    return this.dataSource.getRepository(Revision).find({
      where: { procesoActividadId: actividad.id },
      order: { createdAt: 'DESC' },
    });
  }

  // ----------------------------------------------------------- expediente ---

  async expediente(procesoId: string) {
    const proceso = await this.obtenerProceso(procesoId);
    const expediente = proceso.expediente;
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    const documentos = await this.dataSource.getRepository(Documento).find({
      where: { expedienteId: expediente.id },
      order: { createdAt: 'DESC' },
    });

    return {
      numeroExpediente: expediente.numeroExpediente,
      estado: expediente.estado,
      fechaApertura: expediente.fechaApertura,
      documentos: documentos.map((d) => ({
        id: d.id,
        tipo: d.tipo,
        nombre: d.nombre,
        numeral: d.numeral,
        mimeType: d.archivoMimeType,
        tamano: d.archivoTamano ? Number(d.archivoTamano) : null,
        hashSha256: d.hashSha256,
        version: d.version,
        subidoPor: d.subidoPor,
        createdAt: d.createdAt,
        // El snapshot se devuelve completo: es el estudio previo registrado
        contenido: d.tipo === 'SNAPSHOT_FORMULARIO' ? d.contenidoSnapshot : undefined,
        descargaUrl: d.archivoUrl ? `/files/${d.archivoUrl.split('/').pop()}` : undefined,
      })),
    };
  }

  async registrarAdjunto(
    procesoId: string,
    archivo: { filename: string; originalname: string; mimetype: string; size: number; buffer?: Buffer; path?: string },
    hash: string,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const actividad = await this.obtenerActividad(em, procesoId);
      if (actividad.estado === 'EN_REVISION') {
        throw new ConflictException('El estudio previo ya fue enviado; no admite nuevos adjuntos');
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const documento = await em.save(Documento, {
        expedienteId: expediente.id,
        numeral: NUMERAL_ESTUDIO_PREVIO,
        tipo: 'ADJUNTO',
        nombre: archivo.originalname,
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: hash,
        subidoPor: acceso.userName,
      } as Partial<Documento>);

      await this.traza(em, procesoId, 'documento', documento.id, 'ADJUNTAR', acceso, {
        nombre: archivo.originalname,
      });

      return documento;
    });
  }

  // --------------------------------------------------------------- apoyo ---

  private async obtenerActividad(em: EntityManager, procesoId: string, bloquear = false) {
    const actividad = await em.findOne(ProcesoActividad, {
      where: { procesoId, numeral: NUMERAL_ESTUDIO_PREVIO },
      lock: bloquear ? { mode: 'pessimistic_write' } : undefined,
    });
    if (!actividad) throw new NotFoundException('El proceso no tiene estudio previo iniciado');
    return actividad;
  }

  private async validarEtapa(em: EntityManager, procesoId: string) {
    const proceso = await em.findOne(Proceso, { where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');
    if (proceso.etapa !== ETAPA_ESTUDIOS_PREVIOS) {
      throw new ConflictException(
        `El proceso está en la etapa ${proceso.etapa}; el estudio previo solo se edita en la etapa ${ETAPA_ESTUDIOS_PREVIOS}`,
      );
    }
    return proceso;
  }

  private camposDe(em: EntityManager) {
    return em.find(CampoFormulario, {
      where: { numeral: NUMERAL_ESTUDIO_PREVIO, activo: true },
      order: { orden: 'ASC' },
    });
  }

  /**
   * Solo entran códigos definidos en la configuración, con el tipo correcto.
   * Evita que el expediente termine guardando basura enviada por el cliente.
   */
  private filtrarYValidar(datos: Record<string, any>, campos: CampoFormulario[]) {
    const porCodigo = new Map(campos.map((c) => [c.codigo, c]));
    const desconocidos = Object.keys(datos ?? {}).filter((k) => !porCodigo.has(k));
    if (desconocidos.length > 0) {
      throw new BadRequestException(
        `Campos no definidos para el estudio previo: ${desconocidos.join(', ')}`,
      );
    }

    const limpio: Record<string, any> = {};
    for (const [codigo, valor] of Object.entries(datos ?? {})) {
      const campo = porCodigo.get(codigo)!;
      if (valor === null || valor === undefined) continue;

      // Los campos de solo lectura se devuelven al front para que los muestre,
      // así que vuelven en el guardado. No se persisten aquí: su origen es el
      // proceso, y guardarlos crearía una segunda copia que puede divergir.
      if (campo.soloLectura) continue;

      switch (campo.tipo) {
        case 'numero':
        case 'moneda': {
          const n = typeof valor === 'string' ? Number(valor) : valor;
          if (typeof n !== 'number' || Number.isNaN(n)) {
            throw new BadRequestException(`El campo "${campo.etiqueta}" debe ser numérico`);
          }
          limpio[codigo] = n;
          break;
        }
        case 'seleccion': {
          const opciones = campo.opciones ?? [];
          const valores = Array.isArray(valor) ? valor : [valor];
          const invalido = valores.find((v) => v !== '' && !opciones.includes(v));
          if (invalido !== undefined) {
            throw new BadRequestException(
              `El valor "${invalido}" no es una opción válida de "${campo.etiqueta}"`,
            );
          }
          limpio[codigo] = valor;
          break;
        }
        default: {
          if (typeof valor !== 'string') {
            throw new BadRequestException(`El campo "${campo.etiqueta}" debe ser texto`);
          }
          if (valor.length > 20000) {
            throw new BadRequestException(`El campo "${campo.etiqueta}" excede el tamaño permitido`);
          }
          limpio[codigo] = valor;
        }
      }
    }
    return limpio;
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidad: string,
    entidadId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle?: Record<string, any>,
  ) {
    return em.save(Trazabilidad, {
      procesoId,
      entidad,
      entidadId,
      accion,
      detalle,
      usuarioId: acceso.userId,
      usuarioNombre: acceso.userName,
    } as Partial<Trazabilidad>);
  }
}
