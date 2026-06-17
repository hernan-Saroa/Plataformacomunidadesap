import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { CetapEntity } from './cetap.entity';

@Entity({ schema: 'academic_work_plan', name: 'cetap_alias' })
export class CetapAliasEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'id_cetap', type: 'bigint' })
  idCetap: string;

  @ManyToOne(() => CetapEntity, { nullable: false })
  @JoinColumn({ name: 'id_cetap' })
  cetap: CetapEntity;

  @Column({ type: 'varchar', length: 100 })
  alias: string;

  @Column({ name: 'alias_normalizado', type: 'varchar', length: 100, unique: true })
  aliasNormalizado: string;

  @Column({ type: 'varchar', length: 50, default: 'excel_2025_2' })
  origen: string;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
  }
}
