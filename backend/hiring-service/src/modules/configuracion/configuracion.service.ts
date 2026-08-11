import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import {
  Actividad,
  ActividadExcluida,
  ActividadSalvedad,
} from '../../entities/actividad.entity';
import { ReglaActividad } from '../../entities/regla-actividad.entity';
import { CampoFormulario } from '../../entities/campo-formulario.entity';
import { Documento } from '../../entities/documento.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Expediente } from '../../entities/expediente.entity';
import {
  ActualizarActividadDto,
  AplicabilidadDto,
  GuardarReglaDto,
  ActualizarCampoDto,
  SimularDto,
} from './dto/configuracion.dto';
import {
  ContextoEvaluacion,
  Incumplimiento,
  evaluarReglas,
  reglasAplicables,
} from './evaluador-reglas';
import { descripcion, proyectarFormulario } from './evaluador-condiciones';

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

    // Las celdas que aplican pero con matiz: "si*" y las variantes de texto de
    // la matriz. Viajan con la actividad porque son parte de lo que el
    // administrador tiene que resolver, no un detalle de una pantalla aparte.
    const salvedades = await this.dataSource.getRepository(ActividadSalvedad).find({
      where: { modalidad },
    });
    const salvedadDe = new Map(salvedades.map((s) => [s.numeral, s]));

    // El conteo viene en la misma respuesta: pedirlo actividad por actividad
    // dejaria el arbol marcando todo como sin configurar hasta visitarlas una
    // a una, que es justo lo que el administrador viene a evitar.
    const conteos = await this.dataSource.query(
      `SELECT r.numeral,
              count(*) FILTER (WHERE r.modalidad IS NULL) AS globales,
              count(*) FILTER (WHERE r.modalidad = $1) AS propias,
              (SELECT count(*) FROM hiring.campos_formulario c
                WHERE c.numeral = r.numeral AND c.activo) AS campos
         FROM hiring.reglas_actividad r
        WHERE r.vigente_hasta IS NULL
          AND (r.modalidad IS NULL OR r.modalidad = $1)
        GROUP BY r.numeral`,
      [modalidad],
    );
    const porConteo = new Map<string, { reglas: number; propias: number; campos: number }>(
      conteos.map((c: any) => [
        c.numeral,
        {
          reglas: Number(c.globales) + Number(c.propias),
          propias: Number(c.propias),
          campos: Number(c.campos),
        },
      ]),
    );

    // Un formulario sin reglas no esta "sin configurar": puede que no las
    // necesite. Se distingue de la actividad que ni siquiera tiene formulario.
    const conFormulario = await this.dataSource.query(
      `SELECT numeral, count(*) AS campos FROM hiring.campos_formulario
        WHERE activo GROUP BY numeral`,
    );
    const camposPorNumeral = new Map<string, number>(
      conFormulario.map((c: any) => [c.numeral, Number(c.campos)]),
    );

    return actividades.map((a) => {
      const excluida = porNumeral.get(a.numeral);
      const conteo = porConteo.get(a.numeral);
      const salvedad = salvedadDe.get(a.numeral);
      return {
        ...a,
        aplica: !excluida,
        motivo: excluida?.motivo ?? null,
        salvedad: salvedad?.nota ?? null,
        variante: salvedad?.variante ?? null,
        reglas: conteo?.reglas ?? 0,
        reglasPropias: conteo?.propias ?? 0,
        campos: camposPorNumeral.get(a.numeral) ?? 0,
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
      condiciones: dto.condiciones ?? [],
      acciones: dto.acciones ?? [],
      conector: dto.conector ?? 'AND',
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
        condiciones: dto.condiciones ?? vigente.condiciones ?? [],
        acciones: dto.acciones ?? vigente.acciones ?? [],
        conector: dto.conector ?? vigente.conector ?? 'AND',
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

  // ----------------------------------------------------------- cobertura ---

  /**
   * Matriz de una actividad: que exige cada modalidad.
   *
   * Se resuelve en el servidor y no pidiendo las reglas modalidad por
   * modalidad porque serian once viajes para pintar una tabla, y porque el
   * cruce entre la regla global y la excepcion tiene que salir igual para
   * todas: hacerlo en el cliente lo dejaria a merced del orden de llegada.
   */
  async cobertura(numeral: string) {
    const actividad = await this.dataSource.getRepository(Actividad).findOne({
      where: { numeral },
    });
    if (!actividad) throw new NotFoundException(`La actividad ${numeral} no existe`);

    const modalidades = await this.dataSource.query(
      `SELECT codigo, nombre FROM hiring.modalidades WHERE activa ORDER BY orden`,
    );
    const excluidas = await this.dataSource.getRepository(ActividadExcluida).find({
      where: { numeral },
    });
    const noAplica = new Map(excluidas.map((e) => [e.modalidad, e.motivo]));

    const reglas = await this.dataSource.getRepository(ReglaActividad).find({
      where: { numeral },
      order: { orden: 'ASC' },
    });
    const vigentes = reglas.filter((r) => !r.vigenteHasta);

    // Una fila por condicion distinta, sin repetir la global en cada columna.
    const filas = new Map<string, any>();
    for (const r of vigentes) {
      const clave = `${r.tipo}::${claveDeConfig(r)}`;
      if (!filas.has(clave)) {
        filas.set(clave, {
          clave,
          tipo: r.tipo,
          etiqueta: claveDeConfig(r),
          global: null as ReglaActividad | null,
          porModalidad: {} as Record<string, any>,
        });
      }
      const fila = filas.get(clave);
      if (r.modalidad) fila.porModalidad[r.modalidad] = { id: r.id, mensaje: r.mensaje };
      else fila.global = { id: r.id, mensaje: r.mensaje };
    }

    return {
      numeral,
      nombre: actividad.nombre,
      modalidades: modalidades.map((m: any) => ({
        codigo: m.codigo,
        nombre: m.nombre,
        aplica: !noAplica.has(m.codigo),
        motivo: noAplica.get(m.codigo) ?? null,
      })),
      filas: [...filas.values()].map((f) => ({
        clave: f.clave,
        tipo: f.tipo,
        etiqueta: f.etiqueta,
        alcance: f.global ? 'GLOBAL' : 'ESPECIFICA',
        // El id de la global sirve para editarla desde cualquier celda.
        reglaGlobalId: f.global?.id ?? null,
        mensaje: f.global?.mensaje ?? null,
        celdas: modalidades.map((m: any) => {
          if (noAplica.has(m.codigo)) return { modalidad: m.codigo, estado: 'NO_APLICA' };
          const propia = f.porModalidad[m.codigo];
          if (propia) {
            return { modalidad: m.codigo, estado: 'ESPECIFICA', reglaId: propia.id };
          }
          return f.global
            ? { modalidad: m.codigo, estado: 'GLOBAL', reglaId: f.global.id }
            : { modalidad: m.codigo, estado: 'SIN_REGLA' };
        }),
      })),
    };
  }

  // --------------------------------------------------------------- matriz --

  /**
   * La matriz completa: 63 actividades por 11 modalidades, en una sola llamada.
   *
   * Es la vista que Contratación ya tiene en el Excel y que la pantalla no
   * ofrecía: `cobertura()` responde por una actividad, así que reconstruir la
   * rejilla desde el cliente costaba 63 peticiones. Con esto el administrador
   * abre el módulo y ve de entrada qué recorre cada modalidad.
   *
   * Cuatro consultas fijas en vez de una por actividad: el volumen es de
   * cientos de filas, no de miles, y traerlas juntas evita el N+1.
   */
  async matriz() {
    const [actividades, modalidades, excluidas, salvedades] = await Promise.all([
      this.dataSource.getRepository(Actividad).find({
        where: { activa: true },
        order: { etapa: 'ASC', orden: 'ASC' },
      }),
      this.dataSource.query(
        `SELECT codigo, nombre, orden FROM hiring.modalidades WHERE activa ORDER BY orden`,
      ),
      this.dataSource.getRepository(ActividadExcluida).find(),
      this.dataSource.getRepository(ActividadSalvedad).find(),
    ]);

    // Cuántas reglas y campos tiene cada actividad, y cuáles son propias de
    // una modalidad. Sin esto la matriz diría que aplica pero no si está
    // configurada, que es la mitad de la pregunta.
    const conteos = await this.dataSource.query(
      `SELECT r.numeral,
              r.modalidad,
              count(*) AS reglas
         FROM hiring.reglas_actividad r
        WHERE r.vigente_hasta IS NULL
        GROUP BY r.numeral, r.modalidad`,
    );
    const camposPorNumeral = new Map<string, number>(
      (
        await this.dataSource.query(
          `SELECT numeral, count(*) AS campos FROM hiring.campos_formulario
            WHERE activo GROUP BY numeral`,
        )
      ).map((c: any) => [c.numeral, Number(c.campos)]),
    );

    const globales = new Map<string, number>();
    const propias = new Map<string, number>();
    for (const c of conteos as any[]) {
      if (c.modalidad === null) globales.set(c.numeral, Number(c.reglas));
      else propias.set(`${c.numeral}::${c.modalidad}`, Number(c.reglas));
    }

    const excluidaDe = new Map(excluidas.map((e) => [`${e.numeral}::${e.modalidad}`, e]));
    const salvedadDe = new Map(salvedades.map((s) => [`${s.numeral}::${s.modalidad}`, s]));

    const filas = actividades.map((a) => {
      const campos = camposPorNumeral.get(a.numeral) ?? 0;
      const reglasGlobales = globales.get(a.numeral) ?? 0;

      return {
        numeral: a.numeral,
        etapa: a.etapa,
        nombre: a.nombre,
        descripcion: a.descripcion,
        campos,
        celdas: (modalidades as any[]).map((m) => {
          const llave = `${a.numeral}::${m.codigo}`;
          const excluida = excluidaDe.get(llave);
          if (excluida) {
            return {
              modalidad: m.codigo,
              estado: 'NO_APLICA' as const,
              motivo: excluida.motivo,
              variante: null,
              reglas: 0,
              reglasPropias: 0,
            };
          }

          const reglasPropias = propias.get(llave) ?? 0;
          const salvedad = salvedadDe.get(llave);
          const reglas = reglasGlobales + reglasPropias;

          // El orden importa: una celda con salvedad se señala como tal
          // aunque además tenga reglas propias, porque la salvedad viene de la
          // matriz y es lo que hay que ir a resolver con Contratación.
          const estado = salvedad
            ? ('CON_SALVEDAD' as const)
            : reglasPropias > 0
              ? ('CON_EXCEPCION' as const)
              : campos === 0
                ? ('SIN_FORMULARIO' as const)
                : reglas === 0
                  ? ('SIN_REGLAS' as const)
                  : ('APLICA' as const);

          return {
            modalidad: m.codigo,
            estado,
            motivo: salvedad?.nota ?? null,
            variante: salvedad?.variante ?? null,
            reglas,
            reglasPropias,
          };
        }),
      };
    });

    return {
      modalidades: (modalidades as any[]).map((m) => ({
        codigo: m.codigo,
        nombre: m.nombre,
        orden: m.orden,
      })),
      filas,
    };
  }

  /**
   * El recorrido completo de una modalidad, etapa por etapa.
   *
   * La vista previa mostraba el formulario de una actividad suelta, que no
   * responde "cómo queda el proceso": para eso hace falta ver las diez etapas
   * seguidas, cuáles se saltan enteras y qué pide cada una. Es la misma
   * información de `actividadesDe()` agrupada por etapa y con el resumen que
   * permite leerla de corrido.
   */
  async flujoDe(modalidad: string) {
    const actividades = await this.actividadesDe(modalidad);

    const etapas = new Map<number, typeof actividades>();
    for (const a of actividades) {
      if (!etapas.has(a.etapa)) etapas.set(a.etapa, []);
      etapas.get(a.etapa)!.push(a);
    }

    return {
      modalidad,
      etapas: [...etapas.entries()]
        .sort(([a], [b]) => a - b)
        .map(([etapa, lista]) => {
          const aplican = lista.filter((a) => a.aplica);
          return {
            etapa,
            // Una etapa donde ninguna actividad aplica se salta entera: el
            // proceso pasa de largo y conviene que se vea así, no como una
            // etapa vacía.
            seSalta: aplican.length === 0,
            total: lista.length,
            aplican: aplican.length,
            actividades: lista.map((a) => ({
              numeral: a.numeral,
              nombre: a.nombre,
              descripcion: a.descripcion,
              aplica: a.aplica,
              motivo: a.motivo,
              campos: a.campos,
              reglas: a.reglas,
              reglasPropias: a.reglasPropias,
              salvedad: a.salvedad,
              variante: a.variante,
            })),
          };
        }),
    };
  }

  // ------------------------------------------------------------ simulacion --

  /**
   * Como queda el formulario con las reglas configuradas.
   *
   * Se ejecutan las reglas en vez de describirlas: es la unica forma de que el
   * administrador vea el efecto de lo que acaba de configurar antes de que un
   * gestor se tope con un campo que no puede llenar.
   */
  async simular(numeral: string, modalidad: string, datos: Record<string, any>) {
    const campos = await this.dataSource.getRepository(CampoFormulario).find({
      where: { numeral, activo: true },
      order: { orden: 'ASC' },
    });
    const reglas = await this.reglasDe(numeral, modalidad);

    const estado = proyectarFormulario(
      reglas,
      campos.map((c) => c.codigo),
      { datos, modalidad },
    );

    return {
      numeral,
      modalidad,
      campos: campos.map((c) => ({
        codigo: c.codigo,
        etiqueta: c.etiqueta,
        tipo: c.tipo,
        ayuda: c.ayuda,
        // El obligatorio del catalogo es el punto de partida; las reglas
        // pueden endurecerlo pero no relajarlo.
        visible: estado[c.codigo]?.visible ?? true,
        obligatorio: c.obligatorio || (estado[c.codigo]?.obligatorio ?? false),
        porque: estado[c.codigo]?.porque ?? [],
      })),
      reglasEvaluadas: reglas.length,
    };
  }

  /** Las reglas de una actividad con su frase legible, para la lista. */
  async reglasLegibles(numeral: string, modalidad: string | null) {
    const reglas = await this.reglasDe(numeral, modalidad);
    return reglas.map((r) => ({ ...r, descripcion: descripcion(r) }));
  }
  // -------------------------------------------------------------- campos ---

  /** Campos del formulario de una actividad, con su texto editable. */
  async campos(numeral: string) {
    return this.dataSource.getRepository(CampoFormulario).find({
      where: { numeral },
      order: { orden: 'ASC' },
    });
  }

  /**
   * Corrige el texto que el gestor lee en el formulario.
   *
   * `codigo` no se toca: es lo que referencian las reglas y los datos ya
   * guardados, asi que renombrarlo dejaria huerfano todo lo anterior. Lo que
   * se edita es la etiqueta y la ayuda, que es lo que se lee.
   */
  async actualizarCampo(id: string, dto: ActualizarCampoDto) {
    const repo = this.dataSource.getRepository(CampoFormulario);
    const campo = await repo.findOne({ where: { id } });
    if (!campo) throw new NotFoundException('El campo no existe');

    campo.etiqueta = dto.etiqueta;
    if (dto.ayuda !== undefined) campo.ayuda = dto.ayuda || null;
    if (dto.grupo !== undefined) campo.grupo = dto.grupo || null;
    if (dto.activo !== undefined) campo.activo = dto.activo;
    return repo.save(campo);
  }
}
/** Los tipos de documento tampoco son legibles tal como se guardan. */
const NOMBRE_DOCUMENTO: Record<string, string> = {
  ADJUNTO: 'Documento firmado del estudio previo',
  CDP: 'Certificado de disponibilidad presupuestal',
  ESTUDIO_PREVIO: 'Estudio previo',
  SNAPSHOT_FORMULARIO: 'Copia del formulario diligenciado',
};

/** "objeto_contratar" -> "Objeto contratar", cuando no hay etiqueta definida. */
function legible(codigo: string): string {
  if (NOMBRE_DOCUMENTO[codigo]) return NOMBRE_DOCUMENTO[codigo];
  const texto = codigo.replace(/_/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

/** Lo que identifica la condicion: el campo, el documento o el tipo a secas. */
function claveDeConfig(regla: ReglaActividad): string {
  const c = regla.config ?? {};
  return c.codigo ?? c.entonces_campo ?? c.tipo ?? c.numeral ?? regla.tipo;
}