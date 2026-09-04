import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../entities/documento-soporte.entity';
import { RutaRestringidaEntity } from '../../entities/tickets/ruta-restringida.entity';
import { ExcepcionTiqueteEntity } from '../../entities/tickets/excepcion-tiquete.entity';
import { SaldoTiqueteEntity } from '../../entities/tickets/saldo-tiquete.entity';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import {
  EstadoSolicitud,
  ESTADOS_CONSOLIDABLES,
  ESTADOS_SOLO_LECTURA,
} from '../../entities/estado-solicitud.enum';
import { ConfigService } from '../config/config.service';
import { ConfigTipoComisionadoEntity } from '../../entities/config/config-tipo-comisionado.entity';

/**
 * Estado al que se transiciona el expediente consolidado (RF-LIQ-004).
 *
 * NOTA DE TERMINOLOGÍA: la regla de negocio habla de estado `SOLICITADA`
 * ("la solicitud queda solicitada/enviada"). En el modelo de datos el estado
 * canónico es `SOLICITADO` (masculino) y es el mismo que ya consumen la lista
 * "En Aprobación" del frontend y el seed de solicitudes. Por coherencia con
 * todo el código existente la transición apunta a `EstadoSolicitud.SOLICITADO`.
 */
const ESTADO_EXPEDIENTE_SOLICITADO = EstadoSolicitud.SOLICITADO;

/** Grupo al que pertenece cada ítem de la validación de consolidación. */
type GrupoValidacion =
  | 'FORMATO_023'
  | 'AUTOLIQUIDACION'
  | 'TIQUETES'
  | 'DOCUMENTOS';

/** Estado de cada ítem del checklist de integridad del expediente. */
type EstadoItem = 'OK' | 'FALTA';

/** Ítem estructurado del resumen de consolidación (para la UI "Paso 4"). */
export interface ValidacionItem {
  codigo: string;
  etiqueta: string;
  grupo: GrupoValidacion;
  estado: EstadoItem;
  detalle?: string;
}

/** Resultado de la previsualización (no muta) del estado de consolidación. */
export interface ResumenConsolidacion {
  solicitudId: string;
  consecutivoUnico: string;
  estadoSolicitud: string;
  esConsolidable: boolean;
  /** Estados válidos para continuar. */
  requiereEstado: string[];
  errores: string[];
  items: ValidacionItem[];
  documentos: Array<{
    codigo: string;
    nombre: string;
    cargado: boolean;
    pdf: boolean;
  }>;
}

/**
 * Resultado de la consolidación exitosa (mutación dentro de transacción ACID).
 */
export interface ResultadoConsolidacion {
  success: true;
  id: string;
  consecutivoUnico: string;
  estadoAnterior: string;
  estadoSolicitud: string;
  mensaje: string;
}

/**
 * Servicio de consolidación y cierre del expediente de comisión (RF-LIQ-004).
 *
 * Responsabilidades:
 *  1. Previsualizar la integridad del expediente (`obtenerResumenConsolidacion`).
 *  2. Consolidar y enviar a revisión (`consolidarExpediente`) dentro de una
 *     transacción ACID con bloqueo pesimista (`SELECT ... FOR UPDATE`), que:
 *       - Valida el estado de entrada (RADICADA / EXTEMPORANEA / DEVUELTA).
 *       - Ejecuta el "Validator" de integridad (Formato 023 + autoliquidación +
 *         tiquetes/presupuesto + checklist de soportes por rol).
 *       - Si está incompleto, responde HTTP 422 con el detalle estructurado.
 *       - Si es íntegro, congela el expediente (SOLICITADO = solo lectura) y
 *         registra la transición en `solicitudes_historial_estados`.
 */
@Injectable()
export class ConsolidacionService {
  private readonly logger = new Logger(ConsolidacionService.name);

  constructor(
    @InjectRepository(SolicitudComisionEntity)
    private readonly solicitudRepo: Repository<SolicitudComisionEntity>,
    @InjectRepository(DocumentoSoporteEntity)
    private readonly documentoRepo: Repository<DocumentoSoporteEntity>,
    @InjectRepository(RutaRestringidaEntity)
    private readonly rutaRepo: Repository<RutaRestringidaEntity>,
    @InjectRepository(ExcepcionTiqueteEntity)
    private readonly excepcionRepo: Repository<ExcepcionTiqueteEntity>,
    @InjectRepository(SaldoTiqueteEntity)
    private readonly saldoRepo: Repository<SaldoTiqueteEntity>,
    @InjectRepository(SolicitudHistorialEstadoEntity)
    private readonly historialRepo: Repository<SolicitudHistorialEstadoEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // ========================================================================
  // Previsualización (solo lectura, no muta nada)
  // ========================================================================

  /**
   * Obtiene el resumen de integridad del expediente sin mutar la base de datos.
   * Lo consume la vista "Paso 4: Resumen de Expediente y Envío" del frontend
   * para pintar el checklist de documentos, el semáforo de tiquetes y las
   * tareas pendientes antes de habilitar el botón de envío.
   */
  async obtenerResumenConsolidacion(
    solicitudId: string,
  ): Promise<ResumenConsolidacion> {
    const expediente = await this.cargarExpedienteConRelaciones(solicitudId);
    if (!expediente) {
      throw new NotFoundException(
        `El expediente ${solicitudId} no existe o no es consultable.`,
      );
    }

    const esConsolidablePorEstado = ESTADOS_CONSOLIDABLES.has(
      expediente.estadoSolicitud as EstadoSolicitud,
    );

    // Rechazo temprano por estado (400 en el envío real; aquí solo informativo).
    if (ESTADOS_SOLO_LECTURA.has(expediente.estadoSolicitud as EstadoSolicitud)) {
      return this.construirResumenBloqueado(
        expediente,
        'El expediente ya fue consolidado y se encuentra en estado de solo lectura. No puede enviarse nuevamente.',
      );
    }

    if (!esConsolidablePorEstado) {
      return this.construirResumenBloqueado(
        expediente,
        'El expediente debe estar RADICADO (o devuelto por el Grupo de Viáticos) antes de poder consolidarse.',
      );
    }

    const { errores, items, documentos } = await this.validarIntegridad(
      expediente,
    );

    return {
      solicitudId: expediente.id,
      consecutivoUnico: expediente.consecutivoUnico,
      estadoSolicitud: expediente.estadoSolicitud,
      esConsolidable: errores.length === 0,
      requiereEstado: [...ESTADOS_CONSOLIDABLES],
      errores,
      items,
      documentos,
    };
  }

  // ========================================================================
  // Consolidación transaccional (RF-LIQ-004)
  // ========================================================================

  /**
   * Consolida el expediente y lo envía a revisión del Grupo de Viáticos.
   *
   * Garantías:
   *  - Transacción ACID mediante `dataSource.transaction`.
   *  - Bloqueo pesimista de la fila (`SELECT ... FOR UPDATE`) para evitar
   *    colisiones de estado ante envíos concurrentes del mismo expediente.
   *  - Si alguna validación falla se retorna HTTP 422 sin mutar nada (rollback).
   *  - Si todo es correcto: `SOLICITADO` + registro en el historial inmutable.
   *
   * @throws NotFoundException         si el expediente no existe.
   * @throws BadRequestException(400)  si el estado no permite consolidar.
   * @throws HttpException(422)        si el expediente está incompleto, con el
   *                                   cuerpo `{ success:false, errors:[...] }`.
   */
  async consolidarExpediente(
    solicitudId: string,
    usuarioId?: string,
  ): Promise<ResultadoConsolidacion> {
    return this.dataSource.transaction(async (manager) => {
      // 1) Recuperar y BLOQUEAR la fila (pessimistic lock) hasta el COMMIT.
      const expediente = await manager
        .createQueryBuilder(SolicitudComisionEntity, 's')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('s.comisionado', 'comisionado')
        .leftJoinAndSelect('s.documentosSoporte', 'documentos')
        .where('s.id = :id', { id: solicitudId })
        .getOne();

      if (!expediente) {
        throw new NotFoundException('Solicitud no encontrada.');
      }

      // 2) Validar el estado de entrada.
      this.verificarEstadoConsolidable(expediente);

      // 3) Validar la integridad del expediente (el "Validator" de consolidación).
      const { errores } = await this.validarIntegridad(expediente, manager);
      if (errores.length > 0) {
        this.logger.warn(
          `[consolidacion] Expediente ${expediente.consecutivoUnico} incompleto: ` +
            errores.join(' | '),
        );
        // 422 con el arreglo estructurado que exige la HU RF-LIQ-004.
        throw new HttpException({ success: false, errors: errores }, 422);
      }

      // 4) Transición y cierre de seguridad (inmutabilidad).
      const estadoAnterior = expediente.estadoSolicitud;
      expediente.estadoSolicitud = ESTADO_EXPEDIENTE_SOLICITADO;
      await manager.save(SolicitudComisionEntity, expediente);

      // 5) Registrar la transición en el historial de auditoría (append-only).
      const historial = manager.create(SolicitudHistorialEstadoEntity, {
        solicitudId: expediente.id,
        estadoAnterior,
        estadoNuevo: ESTADO_EXPEDIENTE_SOLICITADO,
        usuarioId:
          usuarioId ?? expediente.creadoPorUsuarioId ?? '00000000-0000-0000-0000-000000000000',
        comentarios: `Expediente consolidado y enviado a revisión del Grupo de Viáticos (RF-LIQ-004).`,
      });
      await manager.save(SolicitudHistorialEstadoEntity, historial);

      this.logger.log(
        `[consolidacion] Expediente ${expediente.consecutivoUnico} consolidado: ` +
          `${estadoAnterior} -> ${ESTADO_EXPEDIENTE_SOLICITADO}`,
      );

      return {
        success: true,
        id: expediente.id,
        consecutivoUnico: expediente.consecutivoUnico,
        estadoAnterior,
        estadoSolicitud: ESTADO_EXPEDIENTE_SOLICITADO,
        mensaje: `El expediente ${expediente.consecutivoUnico} fue consolidado y enviado a revisión del Grupo de Viáticos.`,
      };
    });
  }

  // ========================================================================
  // Validaciones internas
  // ========================================================================

  /**
   * Verifica que el expediente pueda transicionar a consolidado.
   * - Ya consolidado / avanzado (solo lectura) -> 400.
   * - Estado distinto a RADICADA/EXTEMPORANEA/DEVUELTA -> 400.
   */
  private verificarEstadoConsolidable(expediente: SolicitudComisionEntity): void {
    const estado = expediente.estadoSolicitud as EstadoSolicitud;
    if (ESTADOS_SOLO_LECTURA.has(estado)) {
      throw new BadRequestException(
        `El expediente tiene estado ${expediente.estadoSolicitud} (solo lectura) y no puede consolidarse de nuevo.`,
      );
    }
    if (!ESTADOS_CONSOLIDABLES.has(estado)) {
      throw new BadRequestException(
        `El expediente tiene estado ${expediente.estadoSolicitud} y aún no está radicado. ` +
          `Solo pueden consolidarse comisiones en estado ${[...ESTADOS_CONSOLIDABLES].join(' / ')}.`,
      );
    }
  }

  /** Carga el expediente con comisionado y documentos para previsualización. */
  private async cargarExpedienteConRelaciones(
    solicitudId: string,
  ): Promise<SolicitudComisionEntity | null> {
    return this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado', 'documentosSoporte'],
    });
  }

  /**
   * Núcleo del "Validator" de consolidación. Evalúa los cuatro bloques:
   *  1. Formato 023 (campos mínimos del expediente).
   *  2. Autoliquidación financiera (montos liquidados > 0).
   *  3. Tiquetes y presupuesto (ruta corta restringida + saldo).
   *  4. Checklist de documentos de soporte exigido por rol.
   *
   * `manager` es opcional: cuando se pasa (dentro de la transacción de envío)
   * las consultas de tiquetes/excepciones/saldo se ejecutan con el mismo
   * `EntityManager` para mantener la consistencia transaccional.
   */
  private async validarIntegridad(
    expediente: SolicitudComisionEntity,
    manager?: EntityManager,
  ): Promise<{
    errores: string[];
    items: ValidacionItem[];
    documentos: ResumenConsolidacion['documentos'];
  }> {
    const errores: string[] = [];
    const items: ValidacionItem[] = [];
    const comisionado = expediente.comisionado;
    const documentos = expediente.documentosSoporte ?? [];

    // Configuración parametrizable del tipo de comisionado
    // (`config_tipo_comisionado` + relación `config_tipo_comisionado_documentos`).
    // Es la FUENTE DE VERDAD para decidir dinámicamente qué CAMPOS del Formato
    // 023 y qué SOPORTES son obligatorios según el rol (igual que la lógica de
    // creación/radicación existente). Si un administrador parametriza nuevos
    // campos/documentos, esta consolidación se adapta sin tocar código.
    const tipoConfig = this.tipoConfigParaExpediente(expediente);
    const config = tipoConfig
      ? await this.configService.obtenerConfiguracionPorTipo(tipoConfig)
      : null;

    // ---------- 1) Formato 023: campos obligatorios (según configuración) ----------
    this.validarCamposFormato023(expediente, comisionado, config, errores, items);

    // ---------- 2) Autoliquidación financiera ----------
    this.validarAutoliquidacion(expediente, errores, items);

    // ---------- 3) Tiquetes y presupuesto (solo si requiere tiquetes) ----------
    if (expediente.requiereTiquetes) {
      await this.validarTiquetesYPresupuesto(expediente, manager, errores, items);
    }

    // ---------- 4) Checklist de documentos de soporte por rol ----------
    const { erroresDocs, itemsDocs, documentosEstado } =
      await this.validarChecklistDocumentos(expediente, documentos, config);
    errores.push(...erroresDocs);
    items.push(...itemsDocs);

    return { errores, items, documentos: documentosEstado };
  }

  /**
   * Bloque 1: Formato 023 — campos obligatorios del expediente.
   *
   * IMPORTANTE: la lista NO está fija en código. Se deriva de la configuración
   * parametrizable `config_tipo_comisionado.campos_obligatorios` del tipo de
   * comisionado (restando `camposOpcionales` y `camposOcultos`), replicando el
   * comportamiento de `TravelExpensesService.validarCamposObligatorios`. Si un
   * administrador agrega, oculta o vuelve opcional un campo, esta validación se
   * adapta automáticamente.
   */
  private validarCamposFormato023(
    expediente: SolicitudComisionEntity,
    comisionado: SolicitudComisionEntity['comisionado'] | undefined,
    config: ConfigTipoComisionadoEntity | null,
    errores: string[],
    items: ValidacionItem[],
  ): void {
    const agregar = (
      codigo: string,
      etiqueta: string,
      ok: boolean,
      detalle?: string,
    ) => {
      items.push({
        codigo,
        etiqueta,
        grupo: 'FORMATO_023',
        estado: ok ? 'OK' : 'FALTA',
        detalle,
      });
      if (!ok) errores.push(detalle ?? etiqueta);
    };

    // El comisionado es requisito estructural: define el rol del checklist.
    agregar('COMISIONADO', 'Datos del comisionado', Boolean(comisionado?.id));

    const opcionales = new Set(config?.camposOpcionales ?? []);
    const ocultos = new Set(config?.camposOcultos ?? []);
    // Campos efectivamente obligatorios según la parametrización por rol.
    const obligatorios = (config?.camposObligatorios ?? []).filter(
      (campo) => !opcionales.has(campo) && !ocultos.has(campo),
    );

    for (const clave of obligatorios) {
      const etiqueta = ETIQUETAS_CAMPOS_FORMATO[clave] ?? clave;
      const valor = obtenerValorCampoFormato(expediente, comisionado, clave);

      // Regla específica del objeto: fue sanitizado (máx. 250) al crear/actualizar.
      if (clave === 'objetoComision') {
        const objeto = typeof valor === 'string' ? valor.trim() : '';
        agregar(
          'OBJETO_COMISION',
          etiqueta,
          objeto.length > 0 && objeto.length <= 250,
          objeto.length === 0
            ? 'Falta el objeto de la comisión.'
            : objeto.length > 250
              ? 'El objeto de la comisión supera los 250 caracteres.'
              : undefined,
        );
        continue;
      }

      agregar(
        clave.toUpperCase(),
        etiqueta,
        campoPresente(valor),
        campoPresente(valor) ? undefined : `Falta el campo: ${etiqueta}.`,
      );
    }
  }

  /** Bloque 2: Autoliquidación financiera calculada con el Autoliquidador. */
  private validarAutoliquidacion(
    expediente: SolicitudComisionEntity,
    errores: string[],
    items: ValidacionItem[],
  ): void {
    const montoViaticos = Number(expediente.montoViaticos || 0);
    const dias = Number(expediente.diasComision || 0);

    const itemsAutoliquidacion: Array<{
      codigo: string;
      etiqueta: string;
      ok: boolean;
      detalle?: string;
    }> = [
      {
        codigo: 'TARIFA_BASE',
        etiqueta: 'Autoliquidación de viáticos calculada (> $0)',
        ok: montoViaticos > 0,
        detalle:
          montoViaticos <= 0
            ? 'La autoliquidación no registra un valor total de viáticos mayor a cero. Ejecute el Autoliquidador.'
            : undefined,
      },
      {
        codigo: 'DIAS_COMISION',
        etiqueta: 'Días de comisión (> 0)',
        ok: dias > 0,
        detalle: dias <= 0 ? 'La comisión no registra días de comisión válidos.' : undefined,
      },
    ];

    for (const it of itemsAutoliquidacion) {
      items.push({
        codigo: it.codigo,
        etiqueta: it.etiqueta,
        grupo: 'AUTOLIQUIDACION',
        estado: it.ok ? 'OK' : 'FALTA',
        detalle: it.detalle,
      });
      if (!it.ok) errores.push(it.detalle ?? it.etiqueta);
    }
  }

  /**
   * Bloque 3: Tiquetes y presupuesto (RF-LIQ-003 / RF-LIQ-004).
   *  - Si el destino es una ruta corta restringida (p. ej. Bogotá-Ibagué),
   *    exige una excepción `RUTA_CORTA` con PDF de soporte firmado.
   *  - Como defensa en profundidad valida que exista configuración de saldo
   *    presupuestal (o una excepción de presupuesto) asociada a la solicitud.
   */
  private async validarTiquetesYPresupuesto(
    expediente: SolicitudComisionEntity,
    manager: EntityManager | undefined,
    errores: string[],
    items: ValidacionItem[],
  ): Promise<void> {
    const destinoNorm = this.normalizarCiudad(expediente.destinoCiudad);

    // Rutas activas que involucran el destino (cualquier dirección), ya que el
    // origen de las comisiones de la Sede Nacional es Bogotá.
    const rutas = manager
      ? await manager.find(RutaRestringidaEntity, {
          where: [
            { origenCiudad: destinoNorm, activo: true },
            { destinoCiudad: destinoNorm, activo: true },
          ],
        })
      : await this.rutaRepo.find({
          where: [
            { origenCiudad: destinoNorm, activo: true },
            { destinoCiudad: destinoNorm, activo: true },
          ],
        });

    const rutaRestringida = rutas.length > 0 ? rutas[0] : null;

    // Excepciones de la solicitud (RUTA_CORTA / PRESUPUESTO_AGOTADO).
    const excepciones = manager
      ? await manager.find(ExcepcionTiqueteEntity, {
          where: { solicitudId: expediente.id },
        })
      : await this.excepcionRepo.find({
          where: { solicitudId: expediente.id },
        });

    const excepcionRuta = excepciones.find(
      (e) => e.tipoExcepcion === 'RUTA_CORTA',
    );
    const excepcionPresupuesto = excepciones.find(
      (e) => e.tipoExcepcion === 'PRESUPUESTO_AGOTADO',
    );

    if (rutaRestringida) {
      const soporteCompleto =
        excepcionRuta &&
        excepcionRuta.numeroDocumentoSoporte?.trim() &&
        excepcionRuta.documentoSoporteUrl;
      items.push({
        codigo: 'EXCEPCION_RUTA_CORTA',
        etiqueta: `Excepción de ruta corta (${expediente.destinoCiudad})`,
        grupo: 'TIQUETES',
        estado: soporteCompleto ? 'OK' : 'FALTA',
        detalle: soporteCompleto
          ? undefined
          : 'La ruta requiere soporte de excepción aérea: registre el acto administrativo y adjunte el PDF firmado (Dirección Nacional o Sindicato).',
      });
      if (!soporteCompleto) {
        errores.push('La ruta requiere soporte de excepción aérea (ruta corta restringida).');
      }
    }

    // Validación de registro de saldo presupuestal o excepción de presupuesto.
    const haySaldoConfigurado = manager
      ? await manager.findOne(SaldoTiqueteEntity, { where: { activo: true } })
      : await this.saldoRepo.findOne({ where: { activo: true } });

    const presupuestoValidado = Boolean(haySaldoConfigurado) || Boolean(excepcionPresupuesto);
    items.push({
      codigo: 'SALDO_TIQUETES',
      etiqueta: 'Validación de saldo presupuestal de tiquetes',
      grupo: 'TIQUETES',
      estado: presupuestoValidado ? 'OK' : 'FALTA',
      detalle: presupuestoValidado
        ? undefined
        : 'No existe registro de validación de saldo presupuestal en saldos_tiquetes para la dependencia.',
    });
    if (!presupuestoValidado) {
      errores.push(
        'Falta la validación de saldo presupuestal de tiquetes (saldos_tiquetes) o una excepción de presupuesto autorizada.',
      );
    }
  }

  /**
   * Bloque 4: Checklist de documentos de soporte (RF-SOL-003).
   * Valida contra `config_tipo_comisionado_documentos` según el rol del
   * comisionado (o el checklist especial para comisiones internacionales /
   * acto administrativo).
   */
  private async validarChecklistDocumentos(
    expediente: SolicitudComisionEntity,
    documentos: DocumentoSoporteEntity[],
    config: ConfigTipoComisionadoEntity | null,
  ): Promise<{
    erroresDocs: string[];
    itemsDocs: ValidacionItem[];
    documentosEstado: ResumenConsolidacion['documentos'];
  }> {
    const erroresDocs: string[] = [];
    const itemsDocs: ValidacionItem[] = [];
    const documentosEstado: ResumenConsolidacion['documentos'] = [];

    const obligatorios = (config?.documentos ?? [])
      .filter((d) => d.tipoRequisito === 'OBLIGATORIO' && d.tipoDocumentoSoporte)
      .map((d) => ({
        codigo: d.tipoDocumentoSoporte!.codigo,
        nombre: d.tipoDocumentoSoporte!.nombre,
      }));

    const cargadosPorTipo = new Map<string, DocumentoSoporteEntity[]>();
    for (const doc of documentos) {
      const lista = cargadosPorTipo.get(doc.tipoDocumento) || [];
      lista.push(doc);
      cargadosPorTipo.set(doc.tipoDocumento, lista);
    }

    for (const req of obligatorios) {
      const docs = cargadosPorTipo.get(req.codigo) || [];
      const cargado = docs.length > 0;
      const pdf = docs.some((d) => this.esPdf(d.tipoMime));

      documentosEstado.push({ codigo: req.codigo, nombre: req.nombre, cargado, pdf });

      itemsDocs.push({
        codigo: req.codigo,
        etiqueta: req.nombre,
        grupo: 'DOCUMENTOS',
        estado: cargado && pdf ? 'OK' : 'FALTA',
        detalle:
          !cargado
            ? `Falta documento obligatorio: ${req.nombre}`
            : !pdf
              ? `El documento ${req.nombre} debe cargarse en formato PDF.`
              : undefined,
      });
      if (!cargado) {
        erroresDocs.push(`Falta documento obligatorio: ${req.nombre}`);
      } else if (!pdf) {
        erroresDocs.push(`El documento ${req.nombre} debe cargarse en formato PDF.`);
      }
    }

    return { erroresDocs, itemsDocs, documentosEstado };
  }

  /**
   * Resuelve la configuración aplicable según el tipo de comisión
   * (rol del comisionado, o el perfil especial de internacional /
   * acto administrativo).
   */
  private tipoConfigParaExpediente(
    expediente: SolicitudComisionEntity,
  ): string | null {
    if (expediente.esInternacional) return 'INTERNACIONAL';
    if ((expediente.tipoComision || '').toUpperCase() === 'ACTO_ADMINISTRATIVO') {
      return 'ACTO_ADMINISTRATIVO';
    }
    return expediente.comisionado?.tipoComisionado ?? null;
  }

  /** Construye un resumen de consolidación bloqueado (no consolidable). */
  private construirResumenBloqueado(
    expediente: SolicitudComisionEntity,
    razon: string,
  ): ResumenConsolidacion {
    return {
      solicitudId: expediente.id,
      consecutivoUnico: expediente.consecutivoUnico,
      estadoSolicitud: expediente.estadoSolicitud,
      esConsolidable: false,
      requiereEstado: [...ESTADOS_CONSOLIDABLES],
      errores: [razon],
      items: [],
      documentos: [],
    };
  }

  // ========================================================================
  // Utilidades
  // ========================================================================

  /** Normaliza una ciudad para compararla contra `rutas_restringidas`. */
  private normalizarCiudad(ciudad: string): string {
    return (ciudad || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Indica si un tipo MIME corresponde a un PDF válido. */
  private esPdf(tipoMime: string | undefined | null): boolean {
    if (!tipoMime) return false;
    const mime = tipoMime.toLowerCase();
    return mime === 'application/pdf' || mime === 'pdf' || mime.endsWith('/pdf');
  }
}

// ============================================================================
// Helpers de la validación DINÁMICA de campos del Formato 023 (RF-LIQ-004)
//
// La lista de campos obligatorios proviene de `config_tipo_comisionado
// .campos_obligatorios` (parametrizable). Estas claves coinciden con las
// propiedades camelCase de `SolicitudComisionEntity` y con las claves de
// `config_campos_formulario`. Aquí solo se resuelve el valor/etiqueta legible;
// nunca se define qué campos son obligatorios (eso lo decide la configuración).
// ============================================================================

/** Etiquetas legibles para las claves de campos conocidas del Formato 023. */
const ETIQUETAS_CAMPOS_FORMATO: Record<string, string> = {
  comisionadoId: 'Comisionado',
  documentoComisionado: 'Número de documento del comisionado',
  destinoCiudad: 'Ciudad de destino',
  destinoDepartamento: 'Departamento de destino',
  fechaInicio: 'Fecha de inicio',
  fechaFin: 'Fecha de finalización',
  objetoComision: 'Objeto de la comisión (sanitizado, máx. 250 caracteres)',
  prioridad: 'Prioridad',
  rubroPresupuestal: 'Rubro presupuestal',
  requiereTiquetes: 'Requiere tiquetes aéreos / pasajes',
  montoViaticos: 'Viáticos (COP)',
  montoGastosViaje: 'Gastos de viaje (COP)',
  diasComision: 'Días de comisión',
};

/**
 * Obtiene el valor actual de un campo obligatorio parametrizado.
 * Las claves coinciden con las propiedades camelCase de la entidad; la única
 * excepción es `documentoComisionado`, que se resuelve desde el comisionado.
 */
function obtenerValorCampoFormato(
  expediente: SolicitudComisionEntity,
  comisionado: SolicitudComisionEntity['comisionado'] | undefined,
  clave: string,
): unknown {
  if (clave === 'documentoComisionado') {
    return comisionado?.numeroDocumento;
  }
  // Las claves parametrizadas coinciden con las propiedades camelCase de la
  // entidad; se accede de forma genérica sin hardcodear la lista de campos.
  return (expediente as unknown as Record<string, unknown>)[clave];
}

/**
 * Determina si un valor se considera "presente/diligenciado". Los valores
 * numéricos (incluso 0) y booleanos cuentan como presentes; solo se marcan
 * como faltantes los nulos, vacíos o espacios en blanco.
 */
function campoPresente(valor: unknown): boolean {
  if (valor === undefined || valor === null) return false;
  if (typeof valor === 'string') return valor.trim().length > 0;
  if (typeof valor === 'number') return !Number.isNaN(valor);
  if (valor instanceof Date) return !Number.isNaN(valor.getTime());
  return true;
}
