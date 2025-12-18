import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('firmantes')
export class Firmante {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  nombre_completo: string;

  @Column({ length: 150 })
  cargo: string;

  @Column({ length: 255 })
  dependencia: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: false })
  es_principal: boolean;

  @Column({ type: 'text', nullable: true })
  firma_digital_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
