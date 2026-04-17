import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TerritorialEntity } from './territorial.entity';

@Entity({ schema: 'academic_work_plan', name: 'Sede' })
export class SedeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'territorialId', type: 'text' })
  territorialId: string;

  @ManyToOne(() => TerritorialEntity, (territorial) => territorial.sedes, { nullable: false })
  @JoinColumn({ name: 'territorialId' })
  territorial: TerritorialEntity;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  municipio: string | null;

  @Column({ type: 'text', nullable: true })
  codigo: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}

