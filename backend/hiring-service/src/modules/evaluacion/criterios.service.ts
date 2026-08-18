import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';

import {
  CriterioEvaluacion,
  DimensionEvaluacion,
  DIMENSION_CALCULADA,
  TipoCriterio,
} from '../../entities/criterio-evaluacion.entity';
import { EvaluacionCriterio } from '../../entities/evaluacion-criterio.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess, ROLES_ADMIN_CRITERIOS } from '../../auth/hiring-access';
import {
  ActualizarCriterioDto,
  CambiarActivoCriterioDto,
  CrearCriterioDto,
} from './dto/criterios.dto';

/** Las cuatro dimensiones, con el orden en que se leen en el pliego. */
const DIMENSIONES: { codigo: DimensionEvaluacion; nombre: string }[] = [
  { codigo: 'JURIDICO', nombre: 'Jurídica' },
  { codigo: 'FINANCIERO', nombre: 'Financiera' },
  { codigo: 'TECNICO', nombre: 'Técnica y de experiencia' },
  { codigo: 'ECONOMICO', nombre: 'Económica' },
];

/**
 * Administración del catálogo de criterios de evaluación (EFDS-1443).
 *
 * Mismo criterio que los umbrales de cuantía (EFDS-1331) y los plazos de
 * publicidad (EFDS-1387): los pesos de una evaluación cambian con la normativa
 * y con la modalidad, y una cifra incrustada en el código obligaría a desplegar
 * para corregir un dato de negocio.
 *
 * Escribe la Dirección de Contratación y no el comité: quien evalúa no
 * reescribe la regla con la que se le evalúa.
 */
@Injectable()
export class CriteriosService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // -------------------------------------------------------------- consulta -

  /**
   * El catálogo completo, activos e inactivos.
   *
   * Los inactivos no se esconden: un criterio retirado explica por qué una
   * evaluación vieja tiene un renglón que ya no aparece en las nuevas, y
   * esconderlo obligaría a ir a la base para reactivarlo.
   */
  async catalogo(acceso?: HiringAccess, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;

    const [criterios, modalidades] = await Promise.all([
      manager.getRepository(CriterioEvaluacion).find({ order: { orden: 'ASC' } }),
      manager.getRepository(Modalidad).find({ order: { orden: 'ASC' } }),
    ]);

    const usos = await this.usosDe(
      criterios.map((c) => c.id),
      manager,
    );
    const nombreModalidad = new Map(modalidades.map((m) => [m.codigo, m.nombre]));

    return {
      // Lo decide el backend, que ya tiene los roles del token: replicar la
      // matriz de permisos en el cliente la dejaría desactualizada en cuanto
      // cambie aquí, y la pantalla ofrecería acciones que la API rechaza.
      puedeEditar: ROLES_ADMIN_CRITERIOS.some((r) => acceso?.roles.includes(r) ?? false),
      dimensiones: DIMENSIONES.map((d) => ({
        ...d,
        // La económica no la califica una persona: se calcula sobre el precio.
        calculada: d.codigo === DIMENSION_CALCULADA,
      })),
      modalidades: modalidades.map((m) => ({ codigo: m.codigo, nombre: m.nombre })),
      // Para que la pantalla pueda advertirlo de entrada, sin recorrer la lista.
      haySinConfirmar: criterios.some((c) => c.activo && !c.confirmado),
      criterios: criterios.map((c) => ({
        id: c.id,
        modalidad: c.modalidad,
        modalidadNombre: c.modalidad ? nombreModalidad.get(c.modalidad) ?? c.modalidad : null,
        dimension: c.dimension,
        tipo: c.tipo,
        nombre: c.nombre,
        descripcion: c.descripcion,
        puntajeMaximo: c.puntajeMaximo != null ? Number(c.puntajeMaximo) : null,
        orden: c.orden,
        activo: c.activo,
        fundamento: c.fundamento,
        confirmado: c.confirmado,
        actualizadoEn: c.updatedAt,
        // Por qué un criterio no se borra: el expediente tiene que poder
        // explicar con qué reglas se calificó.
        evaluacionesQueLoUsan: usos.get(c.id) ?? 0,
      })),
      totales: this.totalesPonderables(criterios, modalidades),
    };
  }

  // ---------------------------------------------------------------- escritura

  async crear(dto: CrearCriterioDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const modalidad = await this.exigirModalidad(em, dto.modalidad);
      const tipo = dto.tipo as TipoCriterio;
      const puntajeMaximo = this.puntajeCoherente(tipo, dto.puntajeMaximo ?? null);

      const criterio = await em.save(
        em.create(CriterioEvaluacion, {
          modalidad,
          dimension: dto.dimension as DimensionEvaluacion,
          tipo,
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
          puntajeMaximo,
          orden: dto.orden ?? 0,
          activo: true,
          fundamento: dto.fundamento?.trim() || null,
          confirmado: dto.confirmado ?? false,
          updatedAt: new Date(),
        }),
      );

      await this.traza(em, 'CREAR', criterio.id, acceso, {
        antes: null,
        ahora: this.resumen(criterio),
      });

      return this.catalogo(acceso, em);
    });
  }

  /**
   * Corrige un criterio del catálogo.
   *
   * Lo que ya se evaluó con él no se toca: los resultados guardados conservan
   * el juicio que emitió el evaluador. Pero la calificación se consolida al
   * consultarla, así que **cambiar el puntaje máximo de un criterio ya usado
   * cambia el total de las ofertas evaluadas con él**. Es intencional —así se
   * corrige un peso mal transcrito sin rehacer la evaluación— y por eso la
   * pantalla enseña cuántas evaluaciones lo usan antes de dejar guardar.
   *
   * Lo que sí se bloquea es mover la dimensión o el tipo de un criterio ya
   * usado: un habilitante convertido en ponderable dejaría resultados con
   * `cumple` en un criterio que ahora se lee por puntaje, y el expediente no
   * podría explicar qué se calificó.
   */
  async actualizar(id: string, dto: ActualizarCriterioDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const criterio = await this.exigirCriterio(em, id);
      const antes = this.resumen(criterio);
      const usos = (await this.usosDe([id], em)).get(id) ?? 0;

      const cambiaDimension = dto.dimension !== undefined && dto.dimension !== criterio.dimension;
      const cambiaTipo = dto.tipo !== undefined && dto.tipo !== criterio.tipo;
      if (usos > 0 && (cambiaDimension || cambiaTipo)) {
        throw new ConflictException(
          `El criterio ya se usó en ${usos} evaluación(es): se puede corregir su texto o su puntaje, ` +
            'pero no cambiar de dimensión ni de tipo. Desactívelo y cree el que corresponda',
        );
      }

      if (dto.modalidad !== undefined) {
        criterio.modalidad = await this.exigirModalidad(em, dto.modalidad);
      }
      if (dto.dimension !== undefined) criterio.dimension = dto.dimension as DimensionEvaluacion;
      if (dto.tipo !== undefined) criterio.tipo = dto.tipo as TipoCriterio;
      if (dto.nombre !== undefined) criterio.nombre = dto.nombre.trim();
      if (dto.descripcion !== undefined) criterio.descripcion = dto.descripcion?.trim() || null;
      if (dto.orden !== undefined) criterio.orden = dto.orden;
      if (dto.fundamento !== undefined) criterio.fundamento = dto.fundamento?.trim() || null;

      // El puntaje se revisa contra el tipo que queda, no contra el que tenía:
      // pasar de habilitante a ponderable sin puntaje dejaría un ponderable que
      // no pondera.
      const puntaje =
        dto.puntajeMaximo !== undefined
          ? dto.puntajeMaximo
          : criterio.puntajeMaximo != null
            ? Number(criterio.puntajeMaximo)
            : null;
      criterio.puntajeMaximo = this.puntajeCoherente(criterio.tipo, puntaje);

      // Sin decir nada, un criterio que alguien acaba de tocar deja de estar
      // confirmado: la confirmación es sobre un texto y una cifra concretos.
      criterio.confirmado = dto.confirmado ?? false;
      criterio.updatedAt = new Date();

      await em.save(criterio);
      await this.traza(em, 'GUARDAR', criterio.id, acceso, {
        antes,
        ahora: this.resumen(criterio),
        evaluacionesQueLoUsan: usos,
      });

      return this.catalogo(acceso, em);
    });
  }

  /**
   * Retira un criterio de las evaluaciones nuevas, o lo devuelve al catálogo.
   *
   * No hay borrado, y no es un descuido: las evaluaciones guardadas apuntan al
   * criterio, y sin él el expediente no podría explicar con qué reglas se
   * calificó. Desactivar lo saca de lo que viene sin tocar lo que ya pasó.
   */
  async cambiarActivo(id: string, dto: CambiarActivoCriterioDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const criterio = await this.exigirCriterio(em, id);

      if (criterio.activo === dto.activo) {
        throw new ConflictException(
          dto.activo ? 'El criterio ya está activo' : 'El criterio ya está desactivado',
        );
      }

      criterio.activo = dto.activo;
      criterio.updatedAt = new Date();
      await em.save(criterio);

      await this.traza(em, dto.activo ? 'GUARDAR' : 'RETIRAR', criterio.id, acceso, {
        nombre: criterio.nombre,
        activo: criterio.activo,
      });

      return this.catalogo(acceso, em);
    });
  }

  // -------------------------------------------------------------- auxiliares

  /**
   * Cuánto suma el máximo ponderable de cada modalidad.
   *
   * Es la cifra contra la que se lee toda calificación, y la que delata un
   * catálogo a medio configurar: si los ponderables no suman lo que la entidad
   * decidió —cien, por lo común—, la nota de una oferta no significa lo que
   * parece. La pantalla lo enseña; no se bloquea, porque el total lo fija el
   * pliego y no este servicio.
   */
  private totalesPonderables(criterios: CriterioEvaluacion[], modalidades: Modalidad[]) {
    const activos = criterios.filter((c) => c.activo && c.tipo === 'PONDERABLE');
    const sumar = (lista: CriterioEvaluacion[]) =>
      Math.round(lista.reduce((total, c) => total + Number(c.puntajeMaximo ?? 0), 0) * 100) / 100;

    const comunes = activos.filter((c) => c.modalidad === null);

    return modalidades.map((m) => ({
      modalidad: m.codigo,
      nombre: m.nombre,
      total: sumar([...comunes, ...activos.filter((c) => c.modalidad === m.codigo)]),
      // Cuántos de los que suman son propios de la modalidad: sin esto, dos
      // modalidades con el mismo total parecerían configuradas igual.
      propios: activos.filter((c) => c.modalidad === m.codigo).length,
    }));
  }

  /** Cuántas evaluaciones ya usan cada criterio. */
  private async usosDe(ids: string[], em: EntityManager): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();

    const filas = await em
      .getRepository(EvaluacionCriterio)
      .createQueryBuilder('ec')
      .select('ec.criterio_id', 'criterioId')
      .addSelect('COUNT(*)', 'total')
      .where({ criterioId: In(ids) })
      .groupBy('ec.criterio_id')
      .getRawMany<{ criterioId: string; total: string }>();

    return new Map(filas.map((f) => [f.criterioId, Number(f.total)]));
  }

  /**
   * La base ya lo impide con un check, pero devolvería un 500 sin explicación.
   *
   * Un ponderable sin puntaje no pondera, y un habilitante con puntaje sugiere
   * que suma cuando en realidad solo deja pasar.
   */
  private puntajeCoherente(tipo: TipoCriterio, puntaje: number | null): string | null {
    if (tipo === 'PONDERABLE') {
      if (puntaje == null) {
        throw new BadRequestException(
          'Un criterio ponderable necesita puntaje máximo: es lo que suma cuando se cumple',
        );
      }
      return puntaje.toFixed(2);
    }

    if (puntaje != null) {
      throw new BadRequestException(
        'Un criterio habilitante no lleva puntaje: decide si la oferta sigue en carrera, no cuánto suma',
      );
    }
    return null;
  }

  /** Vacío y nulo significan lo mismo: aplica a todas las modalidades. */
  private async exigirModalidad(em: EntityManager, codigo?: string | null): Promise<string | null> {
    if (!codigo) return null;

    const modalidad = await em.getRepository(Modalidad).findOne({ where: { codigo } });
    if (!modalidad) throw new NotFoundException(`La modalidad ${codigo} no existe`);
    return modalidad.codigo;
  }

  private async exigirCriterio(em: EntityManager, id: string): Promise<CriterioEvaluacion> {
    const criterio = await em.getRepository(CriterioEvaluacion).findOne({ where: { id } });
    if (!criterio) throw new NotFoundException('El criterio no existe en el catálogo');
    return criterio;
  }

  private resumen(criterio: CriterioEvaluacion) {
    return {
      modalidad: criterio.modalidad,
      dimension: criterio.dimension,
      tipo: criterio.tipo,
      nombre: criterio.nombre,
      puntajeMaximo: criterio.puntajeMaximo != null ? Number(criterio.puntajeMaximo) : null,
      confirmado: criterio.confirmado,
    };
  }

  /**
   * De este catálogo dependen las calificaciones de todo lo que se evalúe
   * después, así que quién lo movió y cuándo tiene que quedar registrado.
   *
   * Sin proceso: el criterio no es de ninguno, es la regla con la que se
   * evalúan todos.
   */
  private traza(
    em: EntityManager,
    accion: AccionTraza,
    criterioId: string,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(Trazabilidad, {
      procesoId: null,
      entidad: 'criterio_evaluacion',
      entidadId: criterioId,
      accion,
      detalle,
      usuarioId: acceso.userId,
      usuarioNombre: acceso.userName,
    } as Partial<Trazabilidad>);
  }
}
