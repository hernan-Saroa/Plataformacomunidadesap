import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import { Actividad, ActividadExcluida } from '../../entities/actividad.entity';
import { ReglaActividad } from '../../entities/regla-actividad.entity';
import { CampoFormulario } from '../../entities/campo-formulario.entity';
import { Documento } from '../../entities/documento.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Expediente } from '../../entities/expediente.entity';
import {
  ActualizarActividadDto,
  AplicabilidadDto,
  GuardarReglaDto,
} from './dto/configuracion.dto';
import {
  ContextoEvaluacion,
  Incumplimiento,
  evaluarReglas,
  reglasAplicables,
} from './evaluador-reglas';

/**
 * Módulo de Configuración de Etapas.
 *
 * Responde dos preguntas que hasta ahora estaban en el código de cada
 * actividad: qué actividades recorre un proceso según su modalidad, y qué
 * hace falta para dar cada una por terminada.
 */
@Injectable()
export class ConfiguracionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------ catálogo ---

  /** Las 63 actividades, agrupadas por etapa. */
  async catalogo() {
    const actividades = await this.dataSource.getRepository(Actividad).find({
      where: { activa: true },
      order: { etapa: 'ASC', orden: 'ASC' },
    });

    const etapas = new Map<number, Actividad[]>();
    for (const a of actividades) {
      if (!etapas.has(a.etapa)) etapas.set(a.etapa, []);
      etapas.get(a.etapa)!.push(a);
    }

    return [...etapas.entries()].map(([etapa, lista]) => ({
      etapa,
      actividades: lista,
    }));
  }

  /**
   * Qué actividades aplican a una modalidad.
   *
   * Devuelve todas, marcadas: las que no aplican se muestran tachadas en vez
   * de ocultarse, para que el gestor vea el alcance real de la etapa y quede
   * constancia de lo omitido.
   */
  async actividadesDe(modalidad: string) {
    const actividades = await this.dataSource.getRepository(Actividad).find({
      where: { activa: true },
      order: { etapa: 'ASC', orden: 'ASC' },
    });
    // Solo se guardan las exclusiones: la ausencia de fila significa que la
    // actividad sí aplica, que es el caso mayoritario.
    const excluidas = await this.dataSource.getRepository(ActividadExcluida).find({
      where: { modalidad },
    });
    const porNumeral = new Map(excluidas.map((e) => [e.numeral, e]));

    return actividades.map((a) => {
      const excluida = porNumeral.get(a.numeral);
      return {
        ...a,
        aplica: !excluida,
        motivo: excluida?.motivo ?? null,
      };
    });
  }

  // ------------------------------------------------------------- reglas ----

  /** Reglas vigentes de una actividad para una modalidad. */
  async reglasDe(numeral: string, modalidad: string | null) {
    const todas = await this.dataSource.getRepository(ReglaActividad).find({
      where: [{ numeral, modalidad: IsNull() }, { numeral, modalidad: modalidad ?? undefined }],
      order: { orden: 'ASC' },
    });
    return reglasAplicables(todas, modalidad);
  }

  /**
   * Qué le falta a una actividad para poder enviarse.
   *
   * Sustituye la validación que el estudio previo tenía en su servicio: en
   * vez de preguntar por los campos obligatorios de una tabla, evalúa las
   * reglas declaradas para esa actividad y esa modalidad.
   */
  async evaluar(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    modalidad: string | null,
  ): Promise<Incumplimiento[]> {
    const actividad = await em.findOne(ProcesoActividad, {
      where: { procesoId, numeral },
    });
    if (!actividad) throw new NotFoundException(`El proceso no tiene la actividad ${numeral}`);

    const reglas = await this.reglasDe(numeral, modalidad);
    if (reglas.length === 0) return [];

    const campos = await em.find(CampoFormulario, { where: { numeral, activo: true } });
    const expediente = await em.findOne(Expediente, { where: { procesoId } });

    const documentos: ContextoEvaluacion['documentos'] = [];
    if (expediente) {
      const filas = await em
        .createQueryBuilder(Documento, 'd')
        .select('d.tipo', 'tipo')
        .addSelect('COUNT(*)', 'cantidad')
        .where('d.expediente_id = :id', { id: expediente.id })
        .andWhere('d.numeral = :numeral', { numeral })
        .groupBy('d.tipo')
        .getRawMany();
      for (const f of filas) documentos.push({ tipo: f.tipo, cantidad: Number(f.cantidad) });
    }

    return evaluarReglas(reglas, {
      datos: actividad.datos ?? {},
      documentos,
      campos,
      iniciadaEn: actividad.createdAt,
    });
  }

  // ----------------------------------------------------- instanciación -----

  /**
   * Crea las actividades que el proceso debe recorrer según su modalidad.
   *
   * Las que no aplican se crean igual, en NO_APLICA: si se omitieran, el
   * expediente no dejaría constancia de por qué ese proceso tuvo menos pasos
   * que otro, que es justo lo que revisa una auditoría.
   */
  async instanciarActividades(em: EntityManager, procesoId: string, modalidad: string) {
    const actividades = await em.find(Actividad, {
      where: { activa: true },
      order: { etapa: 'ASC', orden: 'ASC' },
    });
    const excluidas = await em.find(ActividadExcluida, { where: { modalidad } });
    const noAplica = new Set(excluidas.map((e) => e.numeral));

    const existentes = await em.find(ProcesoActividad, { where: { procesoId } });
    const yaCreadas = new Set(existentes.map((a) => a.numeral));

    const nuevas = actividades
      .filter((a) => !yaCreadas.has(a.numeral))
      .map((a) => ({
        procesoId,
        numeral: a.numeral,
        estado: noAplica.has(a.numeral) ? 'NO_APLICA' : 'BORRADOR',
        datos: {},
      }));

    if (nuevas.length > 0) await em.save(ProcesoActividad, nuevas as Partial<ProcesoActividad>[]);
    return nuevas.length;
  }

  // ------------------------------------------------------------ edicion ----

  /**
   * Corrige el texto de una actividad.
   *
   * El nombre que ve el gestor sale de aqui, asi que una errata en la matriz
   * se arregla sin desplegar. Desactivarla no borra nada: los procesos que ya
   * la instanciaron conservan su actividad.
   */
  async actualizarActividad(numeral: string, dto: ActualizarActividadDto) {
    const repo = this.dataSource.getRepository(Actividad);
    const actividad = await repo.findOne({ where: { numeral } });
    if (!actividad) throw new NotFoundException(`La actividad ${numeral} no existe`);

    actividad.nombre = dto.nombre;
    actividad.descripcion = dto.descripcion ?? null;
    if (dto.activa !== undefined) actividad.activa = dto.activa;
    return repo.save(actividad);
  }

  /**
   * Registra o levanta la exclusion de una actividad en una modalidad.
   *
   * Solo se guardan los NO: marcar que aplica es borrar la fila, porque la
   * ausencia ya significa que aplica.
   */
  async cambiarAplicabilidad(numeral: string, dto: AplicabilidadDto) {
    const actividad = await this.dataSource.getRepository(Actividad).findOne({
      where: { numeral },
    });
    if (!actividad) throw new NotFoundException(`La actividad ${numeral} no existe`);

    const repo = this.dataSource.getRepository(ActividadExcluida);
    if (dto.aplica) {
      await repo.delete({ numeral, modalidad: dto.modalidad });
      return { numeral, modalidad: dto.modalidad, aplica: true };
    }

    await repo.save({ numeral, modalidad: dto.modalidad, motivo: dto.motivo ?? null });
    return { numeral, modalidad: dto.modalidad, aplica: false, motivo: dto.motivo ?? null };
  }

  /** Crea una regla vigente desde ahora. */
  async crearRegla(numeral: string, dto: GuardarReglaDto) {
    const actividad = await this.dataSource.getRepository(Actividad).findOne({
      where: { numeral },
    });
    if (!actividad) throw new NotFoundException(`La actividad ${numeral} no existe`);

    return this.dataSource.getRepository(ReglaActividad).save({
      numeral,
      modalidad: dto.modalidad || null,
      tipo: dto.tipo as ReglaActividad['tipo'],
      config: dto.config,
      mensaje: dto.mensaje ?? null,
      orden: dto.orden ?? 100,
      vigenteDesde: new Date(),
      vigenteHasta: null,
    } as Partial<ReglaActividad>);
  }

  /**
   * Editar una regla cierra la vigente y abre otra.
   *
   * Sobrescribirla dejaria sin explicacion los procesos que se aprobaron bajo
   * la version anterior: una auditoria tiene que poder ver con que regla se
   * evaluo cada uno.
   */
  async reemplazarRegla(id: string, dto: GuardarReglaDto) {
    return this.dataSource.transaction(async (em) => {
      const vigente = await em.findOne(ReglaActividad, { where: { id } });
      if (!vigente) throw new NotFoundException('La regla no existe');
      if (vigente.vigenteHasta) {
        throw new BadRequestException('Esa regla ya fue derogada; crea una nueva');
      }

      const ahora = new Date();
      vigente.vigenteHasta = ahora;
      await em.save(vigente);

      return em.save(ReglaActividad, {
        numeral: vigente.numeral,
        modalidad: dto.modalidad || null,
        tipo: dto.tipo as ReglaActividad['tipo'],
        config: dto.config,
        mensaje: dto.mensaje ?? null,
        orden: dto.orden ?? vigente.orden,
        vigenteDesde: ahora,
        vigenteHasta: null,
      } as Partial<ReglaActividad>);
    });
  }

  /** Deroga una regla sin borrarla. */
  async derogarRegla(id: string) {
    const repo = this.dataSource.getRepository(ReglaActividad);
    const regla = await repo.findOne({ where: { id } });
    if (!regla) throw new NotFoundException('La regla no existe');
    if (regla.vigenteHasta) return regla;

    regla.vigenteHasta = new Date();
    return repo.save(regla);
  }
}
