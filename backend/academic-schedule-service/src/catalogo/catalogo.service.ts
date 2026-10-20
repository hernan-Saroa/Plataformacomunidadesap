import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ProgramaCatalogoEntity } from './entities/programa.readonly.entity.js';
import { AsignaturaCatalogoEntity } from './entities/asignatura.readonly.entity.js';
import { UbicacionSemestralCatalogoEntity } from './entities/ubicacion-semestral.readonly.entity.js';
import { NivelAcademico, nivelDeProgramaTipo } from './nivel-academico.js';
import { nivelesVisibles, puedeVerNivel } from '../auth/programacion-permissions.js';
import { parsearPeriodo } from '../periodos/periodo-ref.js';

export interface SemestreDelCatalogo {
  semestreId: number;
  codigo: string;
  etiqueta: string;
  orden: number;
  asignaturas: Array<{
    id: string;
    codigo: string | null;
    nombre: string;
    creditos: number;
    pensum: string | null;
    modalidad: string;
    horasClase: number | null;
  }>;
}

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(ProgramaCatalogoEntity)
    private readonly programaRepo: Repository<ProgramaCatalogoEntity>,
    @InjectRepository(AsignaturaCatalogoEntity)
    private readonly asignaturaRepo: Repository<AsignaturaCatalogoEntity>,
    @InjectRepository(UbicacionSemestralCatalogoEntity)
    private readonly semestreRepo: Repository<UbicacionSemestralCatalogoEntity>,
  ) {}

  /**
   * El catálogo (programas y asignaturas) es COMPARTIDO: no pertenece a un periodo. Lo que sí
   * pertenece al periodo es su OFERTA: la carga masiva crea una oferta CETAP (programa + CETAP +
   * periodo) por cada programa que se dicta en ese periodo.
   *
   * Con `idPeriodo`, una asignatura «aparece» en ese periodo si su programa tiene al menos una
   * oferta CETAP activa en él. Un periodo sin carga no muestra nada. Sin `idPeriodo` el catálogo
   * sale completo (comportamiento anterior). Un periodo del modelo legado no tiene ofertas, así
   * que tampoco se filtra.
   *
   * @returns ids (texto) de los programas ofertados, o `null` si no hay filtro.
   */
  private async programasOfertados(idPeriodo?: string): Promise<Set<string> | null> {
    if (idPeriodo === undefined || idPeriodo === null || String(idPeriodo).trim() === '') return null;
    const ref = parsearPeriodo(idPeriodo);
    if (!ref) throw new BadRequestException('El periodo no es válido.');
    if (ref.modelo === 'legado') return null;
    const filas: Array<{ id: string }> = await this.programaRepo.query(
      `SELECT DISTINCT o.id_programa::text AS id
         FROM academic_work_plan.oferta_cetap_programa o
        WHERE o.activa = TRUE AND o.deleted_at IS NULL AND o.id_periodo_academico = $1::bigint`,
      [ref.id],
    );
    return new Set(filas.map((f) => String(f.id)));
  }

  /**
   * Programas que el usuario puede programar (RN-08).
   *
   * El filtro por nivel se aplica SIEMPRE contra los permisos, no contra lo que
   * pida el cliente: si solicita un nivel que no le corresponde, se rechaza en
   * vez de devolverlo vacío, para que el error sea explícito.
   *
   * Con `idPeriodo`: solo los programas con oferta CETAP activa en ese periodo.
   */
  async listarProgramas(permisos: ReadonlySet<string>, nivelSolicitado?: NivelAcademico, idPeriodo?: string) {
    const permitidos = nivelesVisibles(permisos);
    if (permitidos.length === 0) {
      throw new ForbiddenException(
        'No tiene permisos de programación sobre ningún nivel académico.',
      );
    }
    if (nivelSolicitado && !puedeVerNivel(permisos, nivelSolicitado)) {
      throw new ForbiddenException(
        `No tiene permiso para programar el catálogo de ${nivelSolicitado}.`,
      );
    }

    const nivelesEfectivos = nivelSolicitado ? [nivelSolicitado] : permitidos;
    const ofertados = await this.programasOfertados(idPeriodo);
    const programas = await this.programaRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });

    // El nivel binario se deriva de `tipo`; no existe como columna. Filtrar en
    // memoria es aceptable: el catálogo de programas es de decenas de filas.
    return programas
      .filter((p) => nivelesEfectivos.includes(nivelDeProgramaTipo(p.tipo)))
      .filter((p) => !ofertados || ofertados.has(String(p.id)))
      .map((p) => ({
        id: String(p.id),
        codigo: p.codigo,
        nombre: p.nombre,
        tipo: p.tipo,
        nivel: nivelDeProgramaTipo(p.tipo),
        modalidad: p.modalidad,
        horasBasePorCredito: p.horasBasePorCredito,
      }));
  }

  /** Catálogo de un programa agrupado por semestre del plan de estudios (AC-01). */
  async catalogoPorSemestre(
    permisos: ReadonlySet<string>,
    idPrograma: string,
    idPeriodo?: string,
  ): Promise<{ programa: any; semestres: SemestreDelCatalogo[]; ofertadoEnPeriodo?: boolean }> {
    const programa = await this.programaRepo.findOne({ where: { id: idPrograma } });
    if (!programa) throw new NotFoundException('Programa no encontrado');

    const nivel = nivelDeProgramaTipo(programa.tipo);
    // Se valida el nivel del programa REAL, no el que declare el cliente: es lo
    // que impide que un perfil de pregrado alcance un programa de posgrado
    // conociendo su id (AC-02).
    if (!puedeVerNivel(permisos, nivel)) {
      throw new ForbiddenException(
        `No tiene permiso para consultar el catálogo de ${nivel}.`,
      );
    }

    // Con periodo: el programa solo «aparece» si tiene oferta CETAP activa en él. Sin oferta, no
    // hay asignaturas que mostrar (y se dice por qué, para que la pantalla no parezca vacía sin motivo).
    const ofertados = await this.programasOfertados(idPeriodo);
    const ofertadoEnPeriodo = ofertados ? ofertados.has(String(programa.id)) : undefined;
    const datosPrograma = {
      id: String(programa.id),
      codigo: programa.codigo,
      nombre: programa.nombre,
      nivel,
      tipo: programa.tipo,
    };
    if (ofertadoEnPeriodo === false) {
      return { programa: datosPrograma, semestres: [], ofertadoEnPeriodo: false };
    }

    const asignaturas = await this.asignaturaRepo.find({
      where: { idPrograma: programa.id, activa: true },
      order: { idUbicacionSemestral: 'ASC', nombre: 'ASC' },
    });

    const semestreIds = Array.from(new Set(asignaturas.map((a) => a.idUbicacionSemestral)));
    const semestres = semestreIds.length
      ? await this.semestreRepo.find({ where: { id: In(semestreIds) }, order: { orden: 'ASC' } })
      : [];

    const porSemestre = new Map<number, SemestreDelCatalogo>();
    for (const s of semestres) {
      porSemestre.set(s.id, {
        semestreId: s.id,
        codigo: s.codigo,
        etiqueta: s.etiqueta,
        orden: s.orden,
        asignaturas: [],
      });
    }

    for (const a of asignaturas) {
      const grupo = porSemestre.get(a.idUbicacionSemestral);
      if (!grupo) continue; // asignatura con semestre huérfano: no se inventa uno
      grupo.asignaturas.push({
        id: String(a.id),
        codigo: a.codigo,
        nombre: a.nombre,
        creditos: a.creditos,
        pensum: a.pensum,
        modalidad: a.modalidad,
        horasClase: a.horasClase,
      });
    }

    return {
      programa: datosPrograma,
      semestres: [...porSemestre.values()].sort((a, b) => a.orden - b.orden),
      // Solo viaja cuando se pidió un periodo: true = el programa se dicta en él.
      ...(ofertadoEnPeriodo === undefined ? {} : { ofertadoEnPeriodo }),
    };
  }

  /**
   * Autocompletado por código de asignatura (EFDS-1369, AC-01).
   *
   * El código es la LLAVE MAESTRA del sistema (RN-01) y resuelve los siete
   * campos maestros del SNIES. Todos son de SOLO LECTURA (RN-02): se exponen tal
   * como están en el catálogo.
   *
   * ⚠️ Las horas NO se calculan aquí: `horasClase` y `horasPta` viajan tal cual.
   * No es créditos × 16: el factor es 16 en pregrado y especializaciones y 12 en
   * maestrías, con excepciones de horas fijas de la Circular 003 (384 / 20 / 144).
   * Cualquier fórmula propia aquí contradiría los datos reales.
   */
  async buscarPorCodigo(permisos: ReadonlySet<string>, codigo: string, idPeriodo?: string) {
    const limpio = String(codigo ?? '').trim();
    if (!limpio) {
      throw new BadRequestException('Debe indicar el código de la asignatura.');
    }

    const asignatura = await this.asignaturaRepo.findOne({ where: { codigo: limpio } });
    if (!asignatura) {
      // Error controlado, no un 500: un código que no existe es un caso de uso
      // normal (el programador se equivoca al teclear), no una falla.
      throw new NotFoundException(`No existe una asignatura con el código ${limpio}.`);
    }

    const programa = await this.programaRepo.findOne({ where: { id: asignatura.idPrograma } });
    if (!programa) {
      throw new NotFoundException('La asignatura no tiene un programa asociado en el catálogo.');
    }

    // Se valida el nivel del programa REAL: conocer un código de posgrado no
    // alcanza para leerlo desde un perfil de pregrado (RN-08, mismo criterio que
    // el detalle del catálogo).
    const nivel = nivelDeProgramaTipo(programa.tipo);
    if (!puedeVerNivel(permisos, nivel)) {
      throw new ForbiddenException(
        `La asignatura ${limpio} pertenece a un programa de ${nivel} y no tiene permiso para consultarlo.`,
      );
    }

    // Con periodo: la asignatura existe en el catálogo, pero solo «aparece» si su programa tiene
    // oferta CETAP activa en ese periodo. Se dice así, no como «no existe».
    const ofertados = await this.programasOfertados(idPeriodo);
    if (ofertados && !ofertados.has(String(programa.id))) {
      throw new NotFoundException(
        `La asignatura ${limpio} existe en el catálogo, pero su programa no tiene oferta en este periodo.`,
      );
    }

    const semestre = await this.semestreRepo.findOne({
      where: { id: asignatura.idUbicacionSemestral },
    });

    return {
      // Identidad
      codigo: asignatura.codigo,
      // Los siete campos maestros del SNIES (AC-01)
      nombre: asignatura.nombre,
      creditos: asignatura.creditos,
      horasClase: asignatura.horasClase,
      horasPta: asignatura.horasPta,
      programa: { id: String(programa.id), codigo: programa.codigo, nombre: programa.nombre },
      pensum: asignatura.pensum,
      modalidad: asignatura.modalidad,
      // 'Metodología' es la del PROGRAMA (presencial / distancia / mixto), que es
      // cómo se imparte; distinta de la modalidad de la asignatura.
      metodologia: programa.modalidad,
      // Contexto útil, no parte de los siete
      nivel,
      semestre: semestre ? { etiqueta: semestre.etiqueta, orden: semestre.orden } : null,
      tipoExcepcion: asignatura.tipoExcepcion ?? null,
      // Marca explícita para la UI: estos datos no se editan (RN-02).
      soloLectura: true,
    };
  }
}
