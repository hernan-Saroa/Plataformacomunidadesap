import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/** Las tres dimensiones de la evaluación que nombra RF-SIS-02. */
export type RolEvaluador = 'JURIDICO' | 'FINANCIERO' | 'TECNICO';

@Entity('miembros_comite', { schema: 'hiring' })
@Unique('uq_miembro_rol', ['comiteId', 'personaId', 'rol'])
export class MiembroComite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comite_id' })
  comiteId: string;

  /**
   * `id_person` de auth.personas, sin llave foránea: ese esquema es de otro
   * equipo. Es lo que permite enlazar la cuenta que evalúa —`auth.user.
   * id_person`— con la persona que el memorando designó.
   */
  @Column({ name: 'persona_id' })
  personaId: string;

  /**
   * Copia del nombre al momento de designar.
   *
   * El memorando nombró a esa persona ese día: si mañana el directorio corrige
   * el nombre, el expediente tiene que seguir diciendo lo que el acto dijo.
   */
  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 20 })
  rol: RolEvaluador;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
