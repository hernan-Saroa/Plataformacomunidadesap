import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
  Unique,
} from 'typeorm';

@Unique(['ptaId', 'territorialId'])
@Index(['ptaId'])
@Index(['jefaturaUserId'])
@Entity({ schema: 'academic_work_plan', name: 'AprobacionJefatura' })
export class AprobacionJefaturaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ptaId', type: 'text' })
  ptaId: string;

  @Column({ name: 'jefaturaUserId', type: 'text', default: '' })
  jefaturaUserId: string;

  @Column({ name: 'jefaturaRol', type: 'text', default: 'Jefatura de Zona' })
  jefaturaRol: string;

  @Column({ name: 'territorialId', type: 'text' })
  territorialId: string;

  @Column({ name: 'territorialNombre', type: 'text', nullable: true })
  territorialNombre: string | null;

  // pendiente | aprobado | aprobado_con_cambios | devuelto
  @Column({ name: 'decision', type: 'text', default: 'pendiente' })
  decision: string;

  @Column({ name: 'comentarios', type: 'text', nullable: true })
  comentarios: string | null;

  @Column({ name: 'camposModificados', type: 'jsonb', nullable: true })
  camposModificados: any | null;

  @Column({ name: 'componentesBloqueados', type: 'jsonb', nullable: true })
  componentesBloqueados: any | null;

  @Column({ name: 'firmaId', type: 'text', nullable: true })
  firmaId: string | null;

  @Column({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
