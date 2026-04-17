import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SedeEntity } from './sede.entity';

@Entity({ schema: 'academic_work_plan', name: 'Territorial' })
export class TerritorialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  codigo: string | null;

  @OneToMany(() => SedeEntity, (sede) => sede.territorial)
  sedes: SedeEntity[];

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}

