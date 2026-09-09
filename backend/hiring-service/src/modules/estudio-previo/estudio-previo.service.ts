import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, In } from 'typeorm';
import { createHash } from 'crypto';

import { EstadoProceso, Proceso } from '../../entities/proceso.entity';
import { Expediente } from '../../entities/expediente.entity';
import {
  EstadoActividad,
  NUMERAL_ESTUDIO_PREVIO,
  ProcesoActividad,
} from '../../entities/proceso-actividad.entity';
import { CampoFormulario, TipoCampo } from '../../entities/campo-formulario.entity';
import { Documento } from '../../entities/documento.entity';
import { Trazabilidad, AccionTraza } from '../../entities/trazabilidad.entity';
import { DecisionRevision, Revision } from '../../entities/revision.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  PERMISO_ACTIVIDAD_APROBAR,
  PERMISO_PROCESO_TOMAR,
  PERMISO_PROCESO_VER_TODOS,
  tienePermiso,
} from '../../auth/permisos';
import { CrearProcesoDto, GuardarBorradorDto } from './dto/estudio-previo.dto';
import { UmbralesService } from '../umbrales/umbrales.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { ParticipacionService, esSuya } from '../participacion/participacion.service';

const ETAPA_ESTUDIOS_PREVIOS = 3;

/**
 * En qué queda la actividad según lo que decidió el revisor (EFDS-1183).
 *
 * Devolver la regresa a BORRADOR para que el área corrija y reenvíe. Negar la
 * deja NEGADA, que no vuelve a ser editable: si negar reusara DEVUELTO, el riel
 * le ofrecería al área editar y reenviar algo que ya nadie va a mirar.
 *
 * Función pura para poder fijar la regla sin base de datos.
 */
export function estadoTrasDecision(decision: DecisionRevision): EstadoActividad {
  if (decision === 'APROBADO') return 'APROBADO';
  if (decision === 'NEGADO') return 'NEGADO';
  return 'BORRADOR';
}

/**
 * Numeral 3.2: el análisis del sector, que el área entrega junto al estudio
 * previo y que la 3.4 revisa con él.
 */
export const NUMERAL_ANALISIS_SECTOR = '3.2';

/**
 * Si el estudio previo de este proceso es de quien intenta tocarlo (EFDS-1183).
 *
 * `contratacion.actividad.edit` dice que alguien diligencia estudios previos, no
 * que diligencie el de cualquier expediente de la entidad. Hasta ahora era lo
 * segundo: un estructurador de un área podía abrir y reescribir el estudio
 * previo que otra área había radicado.
 *
 * Es suyo si lo radicó —el área responde por lo que cargó— o si está en el
 * proceso, que es el caso de la Dirección cuando lo recibe y tiene que
 * completar algo antes de repartirlo.
 *
 * Tener «ver todos» no basta: ver el expediente de toda la entidad y poder
 * reescribirlo son cosas distintas, y confundirlas convierte un permiso de
 * consulta en uno de edición.
 *
 * Función pura para poder fijar la regla sin base de datos.
 */
export function esSuElEstudioPrevio(loRadico: boolean, estaEnElProceso: boolean): boolean {
  return loRadico || estaEnElProceso;
}

/** Por qué alguien no puede decidir sobre este proceso, o `null` si sí puede. */
export type MotivoNoDecide = 'SIN_ABOGADO' | 'NO_ES_TUYO' | 'SIN_PERMISO';

/**
 * Quién puede resolver la revisión de la 3.4 (EFDS-1183).
 *
 * El abogado asignado en la 3.3, y nadie más. No basta con tener el permiso de
 * aprobar: eso lo tienen todos los revisores de la Dirección, y el flujo dice
 * que de este expediente responde el que lo recibió. El Director que quiera
 * decidirlo se lo reasigna a sí mismo, que deja constancia de quién lo hizo.
 *
 * Sin abogado asignado no se decide. Es deliberado y no un descuido: el reparto
 * de la 3.3 es lo que pone a alguien a responder por el proceso, y aprobar
 * saltándoselo dejaría el expediente sin decir quién lo revisó. Un proceso en
 * revisión y sin abogado aparece en las alertas para que se reparta.
 *
 * Función pura para poder fijar la regla sin base de datos.
 */
export function motivoParaNoDecidir(
  tienePermisoDeAprobar: boolean,
  hayAbogado: boolean,
  esElAbogado: boolean,
): MotivoNoDecide | null {
  if (!tienePermisoDeAprobar) return 'SIN_PERMISO';
  if (!hayAbogado) return 'SIN_ABOGADO';
  if (!esElAbogado) return 'NO_ES_TUYO';
  return null;
}

/**
 * Si la decisión termina el proceso, y con qué desenlace.
 *
 * Solo negar. Dejar el proceso EN_CURSO con su estudio previo negado haría que
 * el listado y las estadísticas contaran como vivo un expediente que nadie va a
 * volver a tocar.
 */
export function desenlaceTrasDecision(decision: DecisionRevision): EstadoProceso | null {
  return decision === 'NEGADO' ? 'NEGADO' : null;
}

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
export function jsonCanonico(valor: any): string {
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
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly umbrales: UmbralesService,
    private readonly configuracionService: ConfiguracionService,
    private readonly participacion: ParticipacionService,
  ) {}

  /**
   * Quién es el abogado del proceso y si quien pregunta puede decidir por él.
   *
   * Lo usan la pantalla —para no ofrecer botones que la API va a rechazar— y
   * las tres decisiones, que lo exigen. Tenerlo en un solo sitio es lo que
   * impide que el aviso de la pantalla y el rechazo del servidor digan cosas
   * distintas sobre el mismo proceso.
   */
  /**
   * Exige que el estudio previo sea de quien lo está tocando.
   *
   * Se comprueba en guardar y en enviar, que son los dos puntos por donde entra
   * contenido. Leerlo sigue abierto a quien tenga acceso al proceso: el
   * problema nunca fue que se viera, sino que cualquiera pudiera reescribirlo.
   */
  private async exigirQueSeaSuyo(procesoId: string, acceso: HiringAccess) {
    const proceso = await this.dataSource.getRepository(Proceso).findOne({
      where: { id: procesoId },
    });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');

    const loRadico =
      !!proceso.createdBy &&
      !!acceso.userName &&
      proceso.createdBy.trim().toLowerCase() === acceso.userName.trim().toLowerCase();

    const enElProceso = (await this.participacion.procesosDe(acceso)).includes(procesoId);

    if (!esSuElEstudioPrevio(loRadico, enElProceso)) {
      throw new ForbiddenException(
        'Este estudio previo lo diligencia el área que radicó el proceso: tener permiso de editar no da acceso a los expedientes de otras áreas',
      );
    }
  }

  private async quienDecide(procesoId: string, acceso: HiringAccess) {
    const abogado = await this.participacion.vigente(procesoId, 'ABOGADO');
    const motivo = motivoParaNoDecidir(
      tienePermiso(acceso, PERMISO_ACTIVIDAD_APROBAR),
      !!abogado,
      !!abogado && esSuya(abogado, acceso),
    );
    return { abogado, motivo };
  }

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

      // Antes de gastar consecutivos: si la cuantía obliga a licitación
      // pública, el proceso no puede nacer con una modalidad de menor cuantía
      // (RF-EST-03). Se valida aquí y no solo en el formulario porque es una
      // regla de negocio, no una ayuda de interfaz.
      await this.umbrales.exigirModalidadPermitida(dto.valorEstimado, modalidad);

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

      // Instancia las 63 actividades de la matriz según la modalidad: las que
      // no aplican quedan en NO_APLICA en vez de omitirse, para que el
      // expediente deje constancia de por qué el proceso tuvo menos pasos.
      await this.configuracionService.instanciarActividades(em, proceso.id, modalidad.codigo);

      // El estudio previo (3.1) es la primera con la que trabaja el gestor.
      const actividad = await em.findOneOrFail(ProcesoActividad, {
        where: { procesoId: proceso.id, numeral: NUMERAL_ESTUDIO_PREVIO },
      });

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
   * Los procesos que le corresponde ver a quien consulta, con su avance.
   *
   * El listado trae qué actividades faltan y qué bloquea cada proceso: en qué
   * etapa está es lo menos útil para el gestor.
   *
   * Y trae solo los suyos, salvo que tenga «ver todos» (EFDS-1183). El formato
   * de roles marca «Visualizar todos los procesos» con una sola X —el Jefe de
   * Oficina—, y sin este filtro cualquiera con acceso al módulo veía el
   * expediente de toda la entidad.
   *
   * `acceso` es opcional para no romper a quien ya llamaba sin él; sin acceso
   * se devuelve todo, que es el comportamiento anterior.
   */
  async listarProcesos(acceso?: HiringAccess) {
    const verTodos =
      !acceso || tienePermiso(acceso, PERMISO_PROCESO_VER_TODOS);

    /**
     * «Los míos» son tres cosas y no una (EFDS-1183): los que radiqué, los que
     * me repartieron, y —si puedo tomar— los que están en la bandeja esperando
     * que alguien los reciba.
     *
     * La tercera es la que hace posible el reparto por bandeja compartida: sin
     * ella el listado solo devuelve procesos en los que ya estás, así que nadie
     * podría ver, ni mucho menos tomar, uno que todavía no es de nadie.
     *
     * Las condiciones se construyen en vez de meter siempre un `In`: con la
     * lista vacía —un abogado al que aún no le han repartido nada— el `IN ()`
     * que genera TypeORM no es el filtro que uno espera, y aquí el error se
     * pagaría enseñando procesos ajenos.
     */
    const mios: FindOptionsWhere<Proceso>[] = [];
    if (!verTodos) {
      mios.push({ createdBy: acceso!.userName });

      const alcanzables = new Set(await this.participacion.procesosDe(acceso!));
      if (tienePermiso(acceso!, PERMISO_PROCESO_TOMAR)) {
        for (const id of await this.participacion.idsEnBandeja()) alcanzables.add(id);
      }
      if (alcanzables.size) mios.push({ id: In([...alcanzables]) });
    }

    const procesos = await this.dataSource.getRepository(Proceso).find({
      relations: ['expediente'],
      where: verTodos ? {} : mios,
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

    // Una sola lectura del catálogo para todo el listado, en vez de una por
    // proceso: son once filas y no cambian dentro de la misma respuesta.
    const nombreModalidad = new Map(
      (await this.dataSource.getRepository(Modalidad).find()).map((m) => [m.codigo, m.nombre]),
    );

    // Quién está en cada proceso, en una sola consulta para todo el listado.
    // Sin este dato la lista no puede distinguir un proceso que alguien lleva de
    // uno que sigue en la bandeja esperando que lo reciban.
    const participantes = await this.participacion.vigentesDe(ids);

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

      const enElProceso = participantes.get(proceso.id) ?? [];
      const quien = (papel: 'CONTRATACION' | 'ABOGADO') => {
        const p = enElProceso.find((x) => x.papel === papel);
        return p
          ? { nombre: p.nombre, usuarioNombre: p.usuarioNombre, esMio: acceso ? esSuya(p, acceso) : false }
          : null;
      };
      const contratacion = quien('CONTRATACION');

      return {
        ...proceso,
        modalidadNombre: proceso.modalidad
          ? (nombreModalidad.get(proceso.modalidad) ?? proceso.modalidad)
          : null,
        /**
         * Quién lo lleva. `enBandeja` no es «falta un dato»: es un proceso que
         * llegó a la Dirección y que nadie ha recibido, y decirlo es lo único
         * que impide que se quede ahí semanas.
         */
        participacion: {
          contratacion,
          abogado: quien('ABOGADO'),
          enBandeja: !contratacion && estudioPrevio?.estado === 'EN_REVISION',
        },
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
  async obtener(procesoId: string, acceso?: HiringAccess) {
    const proceso = await this.obtenerProceso(procesoId);
    const actividad = await this.obtenerActividad(this.dataSource.manager, procesoId);
    const campos = await this.camposDe(this.dataSource.manager);

    // El nombre y no solo el código: la pantalla debe decir "Mínima Cuantía",
    // no "MINIMA_CUANTIA", y resolverlo en el cliente obligaría a pedir el
    // catálogo entero solo para traducir una palabra.
    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    return {
      proceso: {
        id: proceso.id,
        radicado: proceso.radicado,
        objeto: proceso.objeto,
        modalidad: proceso.modalidad,
        modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
        valorEstimado: proceso.valorEstimado,
        etapa: proceso.etapa,
        expediente: proceso.expediente?.numeroExpediente,
      },
      estado: actividad.estado,
      version: actividad.version,
      // El valor estimado vive en el proceso desde EFDS-1147. Se inyecta aquí
      // para que el estudio previo lo siga mostrando en su sitio sin duplicar
      // el dato en el JSON de la actividad.
      datos: { ...actividad.datos, valor_estimado: proceso.valorEstimado } as Record<string, any>,
      definicionCampos: campos,
      editable: actividad.estado === 'BORRADOR',
      /**
       * Quién resuelve la 3.4 y si le toca a quien está mirando (EFDS-1183).
       *
       * Va aquí y no en una consulta aparte porque la pantalla lo necesita en
       * el mismo momento en que dibuja los botones: pedirlo después dejaría un
       * instante en que ofrece decidir a quien no puede.
       */
      revision: acceso ? await this.quienRevisa(procesoId, acceso) : null,
    };
  }

  /** El abogado del proceso y por qué quien pregunta puede o no decidir. */
  private async quienRevisa(procesoId: string, acceso: HiringAccess) {
    const { abogado, motivo } = await this.quienDecide(procesoId, acceso);
    return {
      abogado: abogado
        ? { nombre: abogado.nombre, usuarioNombre: abogado.usuarioNombre, cargo: abogado.cargo }
        : null,
      puedeDecidir: motivo === null,
      /** Para que la pantalla explique en vez de esconder sin más. */
      motivo,
    };
  }

  /** Guarda sin validar obligatorios: el usuario puede dejarlo a medias. */
  async guardarBorrador(procesoId: string, dto: GuardarBorradorDto, acceso: HiringAccess) {
    await this.exigirQueSeaSuyo(procesoId, acceso);

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
      actividad.datos = await this.filtrarYValidar(em, dto.datos, campos);
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
    await this.exigirQueSeaSuyo(procesoId, acceso);

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

    // La misma regla que aplica el cliente: alcance vacío significa todas, y
    // si el formato declara modalidades, la de este proceso tiene que estar.
    // El antiguo «si ninguna casa se devuelven todas» existía porque la
    // siembra escribía nombres donde el filtro esperaba códigos y nada casaba
    // nunca; la migración 034 unificó la convención y el parche sobra — y
    // ofrecería el pliego de licitación en una contratación directa.
    return todas.filter(
      (p) => p.modalidades.length === 0 || p.modalidades.includes(modalidad),
    );
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

  /**
   * Niega el proceso: la contratación no procede (EFDS-1183).
   *
   * No es devolver. Devolver es «corrígelo y vuelve» y deja el proceso vivo
   * esperando una corrección; negar cierra el expediente y no admite reenvío.
   * Antes solo existía la primera, así que un proceso rechazado de plano se
   * devolvía —y el área se quedaba esperando saber qué corregir— o se quedaba
   * en revisión para siempre.
   *
   * El desenlace es del proceso y no solo de la actividad: si la Dirección dice
   * que la contratación no procede, lo que termina es la contratación.
   *
   * No se puede deshacer mientras la Dirección de Contratación no diga lo
   * contrario: reabrir un proceso negado es una actuación con su propia
   * justificación, no un botón de «me equivoqué».
   */
  async negar(procesoId: string, observaciones: string, acceso: HiringAccess) {
    if (!observaciones?.trim()) {
      throw new BadRequestException(
        'El motivo es obligatorio al negar: a quien le niegan un proceso hay que decirle por qué, y no va a tener ocasión de preguntarlo corrigiendo',
      );
    }
    return this.decidirRevision(procesoId, 'NEGADO', observaciones, acceso);
  }

  private async decidirRevision(
    procesoId: string,
    decision: DecisionRevision,
    observaciones: string | undefined,
    acceso: HiringAccess,
  ) {
    // Quién puede decidir se resuelve antes de abrir la transacción: no toca
    // nada y así el error de autorización no arrastra un lock.
    const { abogado, motivo } = await this.quienDecide(procesoId, acceso);
    if (motivo === 'SIN_ABOGADO') {
      throw new ConflictException(
        'Este proceso todavía no tiene abogado asignado: se reparte en la actividad 3.3 y después se revisa',
      );
    }
    if (motivo === 'NO_ES_TUYO') {
      throw new ForbiddenException(
        `Este proceso lo revisa ${abogado!.nombre}: la 3.4 la resuelve el abogado al que se le asignó`,
      );
    }

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

      actividad.estado = estadoTrasDecision(decision);
      actividad.revisadoPor = acceso.userName;
      actividad.revisadoAt = new Date();
      await em.save(ProcesoActividad, actividad);

      // La 3.4 revisa lo que el área entregó en 3.1 **y en 3.2**, así que la
      // decisión alcanza a las dos. Devolver solo la 3.1 dejaba al área
      // corrigiendo el estudio previo mientras su análisis del sector seguía
      // dado por bueno, y negar dejaba una actividad aprobada colgando de un
      // proceso muerto.
      await this.arrastrarALaDelSector(em, procesoId, actividad.estado);

      // El proceso termina con la actividad cuando la decisión lo cierra.
      const desenlace = desenlaceTrasDecision(decision);
      if (desenlace) {
        await em.update(Proceso, { id: procesoId }, { estado: desenlace });
      }

      await this.traza(
        em,
        procesoId,
        'estudio_previo',
        actividad.id,
        decision === 'APROBADO' ? 'APROBAR' : decision === 'NEGADO' ? 'RECHAZAR' : 'DEVOLVER',
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

  /**
   * Lleva la 3.2 al mismo sitio que la 3.1 cuando la 3.4 la devuelve o la niega.
   *
   * Solo hacia atrás: aprobar la 3.1 no aprueba la 3.2, porque el análisis del
   * sector tiene su propio registro y darlo por bueno desde aquí sellaría como
   * revisado algo que nadie miró.
   *
   * Una 3.2 que no aplica a la modalidad se queda como está: NO_APLICA no es un
   * estado del que se pueda devolver a nadie.
   */
  private async arrastrarALaDelSector(
    em: EntityManager,
    procesoId: string,
    estadoDeLa31: EstadoActividad,
  ) {
    if (estadoDeLa31 !== 'BORRADOR' && estadoDeLa31 !== 'NEGADO') return;

    const sector = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_ANALISIS_SECTOR },
    });
    if (!sector || sector.estado === 'NO_APLICA') return;

    sector.estado = estadoDeLa31;
    sector.revisadoPor = null as any;
    sector.revisadoAt = null as any;
    await em.save(ProcesoActividad, sector);
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
  private async filtrarYValidar(
    em: EntityManager,
    datos: Record<string, any>,
    campos: CampoFormulario[],
  ) {
    const porCodigo = new Map(campos.map((c) => [c.codigo, c]));
    const desconocidos = Object.keys(datos ?? {}).filter((k) => !porCodigo.has(k));

    if (desconocidos.length > 0) {
      // Un código que existe pero está desactivado es un campo retirado del
      // formulario: los procesos que alcanzaron a diligenciarlo siguen
      // enviándolo, y rechazarlos los dejaría sin poder guardar. Se descarta.
      // Uno que no existe en absoluto sí es un cliente inventando claves, y
      // ahí el rechazo protege el expediente.
      const retirados = await em.find(CampoFormulario, {
        where: { numeral: NUMERAL_ESTUDIO_PREVIO, codigo: In(desconocidos) },
        select: ['codigo'],
      });
      const conocidos = new Set(retirados.map((c) => c.codigo));
      const inventados = desconocidos.filter((c) => !conocidos.has(c));

      if (inventados.length > 0) {
        throw new BadRequestException(
          `Campos no definidos para el estudio previo: ${inventados.join(', ')}`,
        );
      }

      for (const codigo of desconocidos) delete datos[codigo];
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
