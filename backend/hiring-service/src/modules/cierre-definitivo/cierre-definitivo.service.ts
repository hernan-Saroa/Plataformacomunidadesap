import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { CierreContrato } from '../../entities/cierre-contrato.entity';
import { ActaLiquidacion } from '../../entities/acta-liquidacion.entity';
import { CierreFinanciero } from '../../entities/cierre-financiero.entity';
import { Garantia } from '../../entities/garantia.entity';
import { Amparo, TipoAmparo } from '../../entities/amparo.entity';
import { Contrato } from '../../entities/contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { amparosParaCerrar, AmparoParaCierre, EstadoDeAmparos } from './amparos-de-estabilidad';
import {
  CerrarDefinitivamenteDto,
  RevertirCierreDefinitivoDto,
} from './dto/cierre-definitivo.dto';

export { amparosParaCerrar };

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Cierre definitivo del contrato (EFDS-1175, RF-LIQ-05 y RF-SIS-01).
 *
 * Liquidado el contrato, cuando vencen los amparos de estabilidad y calidad ya
 * no queda nada que reclamar y la entidad lo cierra en firme.
 *
 * **Sin numeral y sin casilla en el riel**: la matriz da cuatro actividades a la
 * etapa 10 y las cuatro están tomadas por las historias 1171 a 1174. Llega por
 * su propio camino, como la declaratoria desierta (EFDS-1160).
 *
 * **Lo que se pide y lo que solo se advierte.** Se exige el acta de liquidación
 * vigente, que es lo que la historia condiciona, y que los amparos hayan
 * vencido. El expediente archivado y el cierre financiero se advierten pero no
 * bloquean: la estabilidad de obra vence años después del recibo, y encadenar
 * el cierre a un trámite administrativo pendiente impediría registrar un hecho
 * que ya ocurrió.
 */
@Injectable()
export class CierreDefinitivoService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const contrato = await this.contratoDelProceso(em, procesoId);

    if (!contrato) {
      return {
        contrato: null,
        tieneLiquidacion: false,
        amparos: null as EstadoDeAmparos | null,
        puedeCerrar: false,
        motivoNoPuede: 'el proceso todavía no tiene contrato generado',
        advertencias: [] as string[],
        cierre: null as unknown,
        historial: [] as unknown[],
      };
    }

    const liquidacion = await this.actaVigente(em, contrato.id);
    const amparos = await this.evaluarAmparos(em, contrato.id);
    const vigente = await this.cierreVigente(em, contrato.id);

    const cierres = await em.getRepository(CierreContrato).find({
      where: { contratoId: contrato.id },
      order: { createdAt: 'DESC' },
    });
    const soporte = vigente?.soporteDocumentoId
      ? await em.getRepository(Documento).findOne({ where: { id: vigente.soporteDocumentoId } })
      : null;

    return {
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        valor: contrato.valor,
      },
      tieneLiquidacion: !!liquidacion,
      amparos,
      puedeCerrar: !!liquidacion && amparos.puedeCerrar && !vigente,
      motivoNoPuede: this.porQueNoPuede(!!liquidacion, amparos, !!vigente),
      // Lo que conviene resolver antes, sin impedir el cierre.
      advertencias: await this.advertencias(em, procesoId, contrato.id),
      cierre: vigente
        ? {
            id: vigente.id,
            fechaCierre: vigente.fechaCierre,
            ultimoVencimiento: vigente.ultimoVencimiento,
            amparosVerificados: vigente.amparosVerificados,
            observaciones: vigente.observaciones,
            cerradoPor: vigente.cerradoPor,
            soporte: soporte
              ? { nombre: soporte.archivoNombreOriginal ?? soporte.nombre, url: soporte.archivoUrl }
              : null,
          }
        : null,
      historial: cierres
        .filter((c) => c.estado === 'REVERTIDO')
        .map((c) => ({
          fechaCierre: c.fechaCierre,
          ultimoVencimiento: c.ultimoVencimiento,
          revertidoAt: c.revertidoAt,
          revertidoPor: c.revertidoPor,
          motivoReversion: c.motivoReversion,
        })),
    };
  }

  // --------------------------------------------------------------- cierre --

  /**
   * Cierra el contrato en firme.
   *
   * Los amparos se congelan como se vieron ese día: si mañana se prorroga una
   * póliza, el cierre sigue explicando por qué se cerró cuando se cerró.
   */
  async cerrar(
    procesoId: string,
    dto: CerrarDefinitivamenteDto,
    soporte: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(em, procesoId);

      if (!(await this.actaVigente(em, contrato.id))) {
        throw new ConflictException(
          'El contrato todavía no está liquidado: el cierre definitivo va sobre el acta de liquidación (10.2)',
        );
      }

      if (await this.cierreVigente(em, contrato.id)) {
        throw new ConflictException('El contrato ya está cerrado definitivamente');
      }

      const amparos = await this.evaluarAmparos(em, contrato.id);
      if (!amparos.puedeCerrar) {
        throw new ConflictException(
          `Todavía no se puede cerrar el contrato: ${amparos.motivo}`,
        );
      }

      this.validarFecha(dto.fechaCierre);

      let documento: Documento | null = null;
      if (soporte && hash) {
        const expediente = await em.findOne(Expediente, { where: { procesoId } });
        if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

        documento = await this.guardarDocumento(
          em,
          expediente.id,
          `Contrato ${contrato.numero} · soporte del cierre definitivo`,
          soporte,
          hash,
          acceso,
        );
      }

      const registro = await em.save(
        em.create(CierreContrato, {
          contratoId: contrato.id,
          fechaCierre: dto.fechaCierre,
          amparosVerificados: amparos.verificados,
          ultimoVencimiento: amparos.ultimoVencimiento,
          soporteDocumentoId: documento?.id ?? null,
          observaciones: dto.observaciones ?? null,
          estado: 'VIGENTE' as const,
          cerradoPor: acceso.userName,
        } as Partial<CierreContrato>),
      );

      contrato.estado = 'CERRADO';
      await em.save(contrato);

      await this.traza(em, procesoId, registro.id, 'CERRAR', acceso, {
        contrato: contrato.numero,
        fechaCierre: dto.fechaCierre,
        ultimoVencimiento: amparos.ultimoVencimiento,
        amparosVerificados: amparos.verificados.length,
        // Que el contrato no llevaba estabilidad ni calidad queda dicho: es lo
        // que explica un cierre inmediato.
        sinAmparos: amparos.sinAmparos,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Revierte el cierre definitivo.
   *
   * El contrato vuelve a LIQUIDADO, que es de donde salió. No se borra el
   * cierre: se declaró en firme ante entes de control, y que existió es parte
   * de lo que el expediente prueba.
   */
  async revertir(procesoId: string, dto: RevertirCierreDefinitivoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(em, procesoId);

      const vigente = await this.cierreVigente(em, contrato.id);
      if (!vigente) {
        throw new NotFoundException('El contrato no tiene cierre definitivo vigente');
      }

      vigente.estado = 'REVERTIDO';
      vigente.revertidoAt = new Date();
      vigente.revertidoPor = acceso.userName;
      vigente.motivoReversion = dto.motivo;
      await em.save(vigente);

      contrato.estado = 'LIQUIDADO';
      await em.save(contrato);

      await this.traza(em, procesoId, vigente.id, 'REVOCAR', acceso, {
        contrato: contrato.numero,
        fechaCierre: vigente.fechaCierre,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Los amparos de estabilidad y calidad de las garantías **aprobadas**.
   *
   * Una garantía rechazada no ampara nada: contarla dejaría al contrato
   * esperando una cobertura que la entidad nunca aceptó. Una todavía cargada
   * tampoco, por lo mismo que en EFDS-1164: solo la aprobada legaliza.
   */
  private async evaluarAmparos(em: EntityManager, contratoId: string): Promise<EstadoDeAmparos> {
    const filas: Array<{
      tipo: string;
      nombre: string | null;
      numero_poliza: string;
      vigencia_hasta: string;
    }> = await em
      .getRepository(Amparo)
      .createQueryBuilder('a')
      .innerJoin(Garantia, 'g', 'g.id = a.garantia_id')
      .leftJoin(TipoAmparo, 't', 't.codigo = a.tipo')
      .select('a.tipo', 'tipo')
      .addSelect('t.nombre', 'nombre')
      .addSelect('g.numero_poliza', 'numero_poliza')
      .addSelect('a.vigencia_hasta', 'vigencia_hasta')
      .where('g.contrato_id = :contratoId', { contratoId })
      .andWhere("g.estado = 'APROBADA'")
      .getRawMany();

    const amparos: AmparoParaCierre[] = filas.map((f) => ({
      tipo: f.tipo,
      nombre: f.nombre ?? f.tipo,
      numeroPoliza: f.numero_poliza,
      vigenciaHasta: this.aYMD(f.vigencia_hasta),
    }));

    return amparosParaCerrar(amparos, this.hoy());
  }

  /**
   * Lo que conviene resolver antes de cerrar, sin impedirlo.
   *
   * El orden de la matriz pone el cierre financiero y el archivo antes, pero la
   * estabilidad de obra vence años después: bloquear el cierre por un trámite
   * pendiente impediría registrar un hecho que ya ocurrió. Se avisa.
   */
  private async advertencias(em: EntityManager, procesoId: string, contratoId: string) {
    const avisos: string[] = [];

    const cierreFinanciero = await em
      .getRepository(CierreFinanciero)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
    if (!cierreFinanciero) {
      avisos.push('el contrato no tiene cierre financiero: el saldo del RP sigue comprometido (10.3)');
    }

    const expediente = await em.getRepository(Expediente).findOne({ where: { procesoId } });
    if (expediente && expediente.estado !== 'ARCHIVADO') {
      avisos.push('el expediente todavía no está archivado (10.4)');
    }

    return avisos;
  }

  private porQueNoPuede(
    tieneLiquidacion: boolean,
    amparos: EstadoDeAmparos,
    yaCerrado: boolean,
  ): string | null {
    if (yaCerrado) return 'el contrato ya está cerrado definitivamente';
    if (!tieneLiquidacion) return 'el contrato todavía no tiene acta de liquidación vigente (10.2)';
    return amparos.motivo;
  }

  private hoy() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  /** `date` de Postgres llega como string o como Date según el driver. */
  private aYMD(valor: string | Date): string {
    return valor instanceof Date ? valor.toLocaleDateString('en-CA') : String(valor).slice(0, 10);
  }

  /** El cierre ya ocurrió; no se registra hacia el futuro. */
  private validarFecha(fecha: string) {
    if (fecha > this.hoy()) {
      throw new BadRequestException(
        'La fecha del cierre no puede ser posterior a hoy: es la del hecho ya ocurrido',
      );
    }
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'");

    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  private async exigirContrato(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');
    return contrato;
  }

  private actaVigente(em: EntityManager, contratoId: string) {
    return em.getRepository(ActaLiquidacion).findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  private cierreVigente(em: EntityManager, contratoId: string) {
    return em.getRepository(CierreContrato).findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  private guardarDocumento(
    em: EntityManager,
    expedienteId: string,
    nombre: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    return em.save(
      em.create(Documento, {
        expedienteId,
        // Sin numeral: el cierre definitivo no tiene actividad en la matriz.
        numeral: null,
        tipo: 'ADJUNTO',
        nombre,
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: hash,
        subidoPor: acceso.userName,
      } as Partial<Documento>),
    );
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad: 'cierre_contrato',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
