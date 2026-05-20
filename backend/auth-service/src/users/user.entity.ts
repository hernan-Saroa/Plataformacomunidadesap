import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Person } from './person.entity';
import { Role } from './role.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id_user: string;

  @Column({
    type: 'uuid',
    unique: true,
    default: () => 'gen_random_uuid()',
  })
  public_id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password_hash: string;

  @Column({ name: 'id_person', type: 'uuid', nullable: true })
  id_person: string | null;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  password_temp: boolean;

  @Column({ type: 'numeric', precision: 6, scale: 0, nullable: true })
  token: string | null;

  @Column({
    name: 'token_microsoft',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  tokenMicrosoft: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => Person, { cascade: true })
  @JoinColumn({ name: 'id_person' })
  person: Person;

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'id_user', referencedColumnName: 'id_user' },
    inverseJoinColumn: { name: 'id_rol', referencedColumnName: 'id' }
  })
  roles: Role[];
}
