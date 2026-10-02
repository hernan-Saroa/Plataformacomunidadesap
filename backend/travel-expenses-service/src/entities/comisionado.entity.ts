import {
  AfterLoad,
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ schema: 'travel_expenses', name: 'comisionados' })
export class ComisionadoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'numero_documento',
    type: 'varchar',
    length: 20,
    unique: true,
  })
  @Index('idx_comisionados_numero_documento')
  numeroDocumento: string;

  @Column({ name: 'primer_nombre', type: 'varchar', length: 100 })
  primerNombre: string;

  @Column({
    name: 'segundo_nombre',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  segundoNombre: string | null;

  @Column({ name: 'primer_apellido', type: 'varchar', length: 100 })
  primerApellido: string;

  @Column({
    name: 'segundo_apellido',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  segundoApellido: string | null;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ name: 'telefono_contacto', type: 'varchar', length: 150 })
  telefonoContacto: string;

  @Column({ name: 'tipo_comisionado', type: 'varchar', length: 50 })
  tipoComisionado: string;

  @Column({
    name: 'es_facturador_electronico',
    type: 'boolean',
    default: false,
  })
  esFacturadorElectronico: boolean;

  @Column({ name: 'origen_datos', type: 'varchar', length: 50 })
  origenDatos: string;

  @Column({ name: 'autorizacion_habeas_data', type: 'boolean', default: false })
  autorizacionHabeasData: boolean;

  @Column({
    name: 'fecha_autorizacion_habeas_data',
    type: 'timestamp',
    nullable: true,
  })
  fechaAutorizacionHabeasData: Date | null;

  @Column({
    name: 'ip_registro_habeas_data',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  ipRegistroHabeasData: string | null;

  // Dependencia institucional del comisionado (FK lógica a auth.dependencias).
  // Se alimenta desde auth.personas.id_dependencia al consultar por número de
  // documento. No se declara FK a nivel de BD porque la tabla vive en otro
  // esquema/microservicio (auth-service).
  @Column({
    name: 'id_dependencia',
    type: 'bigint',
    nullable: true,
  })
  @Index('idx_comisionados_id_dependencia')
  idDependencia: number | null;

  @Column({
    name: 'fecha_inicio_contrato',
    type: 'date',
    nullable: true,
  })
  fechaInicioContrato: Date | string | null;

  @Column({
    name: 'fecha_fin_contrato',
    type: 'date',
    nullable: true,
  })
  fechaFinContrato: Date | string | null;

  /**
   * Historial de cuentas bancarias asociadas al comisionado.
   * Permite guardar múltiples cuentas para que el usuario seleccione una existente
   * o registre una nueva en cada solicitud.
   */
  @Column({
    name: 'cuentas_bancarias',
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'::jsonb",
  })
  cuentasBancarias: CuentaBancariaComisionado[];

  /**
   * Historial de cargos y salarios relacionales del comisionado.
   * Única fuente de verdad para cargos y salarios del comisionado (JSONB).
   * Reemplaza y consolida las antiguas columnas planas 'cargo' y 'salario_basico'.
   */
  @Column({
    name: 'cargos',
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'::jsonb",
  })
  cargos: CargoComisionado[];

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  // ============================================================
  // Campos virtuales (no son columnas de BD).
  // Se alimentan y sincronizan exclusivamente con la lista 'cargos' (JSONB),
  // eliminando la duplicidad con columnas planas en travel_expenses.comisionados.
  // ============================================================

  private _cargo: string | null = null;
  private _salarioBasico: number | null = null;

  /**
   * Cargo institucional principal (propiedad virtual derivada de 'cargos' JSONB).
   * Mantiene compatibilidad total con DTOs y frontend sin columna plana redundante en BD.
   */
  get cargo(): string | null {
    if (Array.isArray(this.cargos) && this.cargos.length > 0) {
      const principal = this.cargos.find((c) => c.esPrincipal) || this.cargos[0];
      return principal?.cargo || this._cargo || null;
    }
    return this._cargo || null;
  }

  set cargo(val: string | null) {
    this._cargo = val;
    if (!val) return;
    if (!Array.isArray(this.cargos)) this.cargos = [];
    const principal = this.cargos.find((c) => c.esPrincipal) || this.cargos[0];
    if (principal) {
      principal.cargo = val;
    } else {
      this.cargos.push({
        id: `crg-${Date.now()}`,
        cargo: val,
        salario: this._salarioBasico != null ? Number(this._salarioBasico) : 0,
        idDependencia: this.idDependencia,
        esPrincipal: true,
      });
    }
  }

  /**
   * Salario básico asignado al cargo principal (propiedad virtual derivada de 'cargos' JSONB).
   * Mantiene compatibilidad total con DTOs y frontend sin columna plana redundante en BD.
   */
  get salarioBasico(): number | null {
    if (Array.isArray(this.cargos) && this.cargos.length > 0) {
      const principal = this.cargos.find((c) => c.esPrincipal) || this.cargos[0];
      return principal?.salario != null
        ? Number(principal.salario)
        : this._salarioBasico != null
          ? Number(this._salarioBasico)
          : null;
    }
    return this._salarioBasico != null ? Number(this._salarioBasico) : null;
  }

  set salarioBasico(val: number | null) {
    const num = val != null ? Number(val) : null;
    this._salarioBasico = num;
    if (num == null) return;
    if (!Array.isArray(this.cargos)) this.cargos = [];
    const principal = this.cargos.find((c) => c.esPrincipal) || this.cargos[0];
    if (principal) {
      principal.salario = num;
    } else {
      this.cargos.push({
        id: `crg-${Date.now()}`,
        cargo: this._cargo || '',
        salario: num,
        idDependencia: this.idDependencia,
        esPrincipal: true,
      });
    }
  }

  /** Nombre completo concatenado: PrimerNombre [SegundoNombre] PrimerApellido [SegundoApellido] */
  nombre: string;

  /** Alias de nombre para compatibilidad con componentes que usan nombreCompleto */
  nombreCompleto: string;

  @AfterLoad()
  calcularVirtuales(): void {
    this.nombreCompleto = [
      this.primerNombre,
      this.segundoNombre,
      this.primerApellido,
      this.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
    this.nombre = this.nombreCompleto;

    if (!Array.isArray(this.cuentasBancarias)) {
      this.cuentasBancarias = [];
    }

    if (!Array.isArray(this.cargos)) {
      this.cargos = [];
    }

    const principal = this.cargos.find((c) => c.esPrincipal) || this.cargos[0];
    if (principal) {
      this._cargo = principal.cargo;
      this._salarioBasico = principal.salario != null ? Number(principal.salario) : null;
    }
  }

  toJSON() {
    return {
      ...this,
      cargo: this.cargo,
      salarioBasico: this.salarioBasico,
      nombre: this.nombre,
      nombreCompleto: this.nombreCompleto,
    };
  }
}

export interface CuentaBancariaComisionado {
  id?: string;
  banco: string;
  tipoCuenta: string; // 'AHORROS' | 'CORRIENTE' | string
  numeroCuenta: string;
  urlCertificadoBancario?: string | null;
  nombreArchivoCertificado?: string | null;
  fechaRegistro?: string;
  esPrincipal?: boolean;
}

export interface CargoComisionado {
  id?: string;
  idCargo?: number;
  cargo: string;
  salario: number;
  idDependencia?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  esPrincipal?: boolean;
}

