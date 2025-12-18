import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Person } from './person.entity';
import { Role } from './role.entity';
import { NewPersonDto } from '../auth/dto/new-person.dto';
import { CreatePersonDto } from './dto/create-person.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Person) private readonly personRepo: Repository<Person>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) { }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { username },
      relations: ['person', 'roles']
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: {
        person: { email }
      },
      relations: ['person', 'roles']
    });
  }

  async createPersonAndUser(dto: NewPersonDto): Promise<User> {
    const password_hash = await bcrypt.hash(dto.password, 10);

    const person = this.personRepo.create({
      first_name: dto.firstName,
      last_name: dto.lastName,
      email: dto.email,
      phone: dto.phone,
    });

    const user = this.userRepo.create({
      username: dto.username,
      password_hash,
      person,
    });

    const savedUser = await this.userRepo.save(user);

    if (dto.roles && dto.roles.length > 0) {
      const roles = await this.roleRepo.find({ where: dto.roles.map(name => ({ name })) });
      savedUser.roles = roles;
      await this.userRepo.save(savedUser);
    }

    return savedUser;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id_user: userId } });
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) throw new Error('Invalid current password');

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({
      relations: ['person', 'person.seccional', 'person.seccional.ubicacion', 'person.sede', 'person.sede.geopolitica', 'roles']
    });
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    users: User[];
    total: number;
    totalActive: number;
    totalBlocked: number;
  }> {
    // Obtener usuarios paginados con seccional y sede desde persona
    const [users, total] = await this.userRepo.findAndCount({
      relations: ['person', 'person.seccional', 'person.seccional.ubicacion', 'person.sede', 'person.sede.geopolitica', 'roles'],
      skip: (page - 1) * limit,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });

    // Contar usuarios activos
    const totalActive = await this.userRepo.count({
      where: { is_active: true },
    });

    // Contar usuarios bloqueados
    const totalBlocked = await this.userRepo.count({
      where: { is_active: false },
    });

    return { users, total, totalActive, totalBlocked };
  }

  async findById(id: string): Promise<User | null> {
    const updatedUser = await this.userRepo.findOne({
      where: { id_user: id },
      relations: ['person', 'person.seccional', 'person.seccional.ubicacion', 'person.sede', 'person.sede.geopolitica', 'roles']
    });

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }

  async createPerson(dto: CreatePersonDto): Promise<User> {
    // Obtener el máximo ID actual para generar uno nuevo
    const maxIdResult = await this.personRepo
      .createQueryBuilder('person')
      .select('MAX(person.id)', 'maxId')
      .getRawOne();
    const nextId = (maxIdResult?.maxId || 0) + 1;

    // Generar el nombre completo
    const fullName = `${dto.first_name} ${dto.last_name}`;

    // Insertar persona directamente con query builder para asegurar el ID
    await this.personRepo
      .createQueryBuilder()
      .insert()
      .into('personas')
      .values({
        id: nextId,
        first_name: dto.first_name,
        last_name: dto.last_name,
        full_name: fullName,
        identification_number: dto.identification_number,
        identification_type: dto.identification_type,
        email: dto.email,
        phone: dto.phone || '',
        gender: dto.gender || '',
        idSeccional: dto.idSeccional || null,
        idSede: dto.idSede || null,
      })
      .execute();

    // Obtener la persona recién creada
    const savedPerson = await this.personRepo.findOne({
      where: { id: nextId },
    });

    if (!savedPerson) {
      throw new Error('Person not found after creation');
    }

    // Crear usuario usando save() para que genere el UUID automáticamente
    const passwordHash = await bcrypt.hash('defaultPassword123', 10);

    const user = this.userRepo.create({
      username: dto.email,
      password_hash: passwordHash,
      is_active: true,
    });

    // Asignar el id de la persona directamente en la columna
    (user as any).person = savedPerson;

    const savedUser = await this.userRepo.save(user);

    // Asignar roles si existen
    if (dto.roleIds && dto.roleIds.length > 0) {
      const roles = await this.roleRepo.findByIds(dto.roleIds);
      savedUser.roles = roles;
      await this.userRepo.save(savedUser);
    }

    const createdUser = await this.userRepo.findOne({
      where: { id_user: savedUser.id_user },
      relations: ['person', 'person.seccional', 'person.seccional.ubicacion', 'person.sede', 'person.sede.geopolitica', 'roles'],
    });

    if (!createdUser) {
      throw new Error('User not found after creation');
    }

    return createdUser;
  }

  async updatePerson(id: string, dto: Partial<CreatePersonDto>): Promise<User> {
    console.log('📝 updatePerson called with:', { id, dto });
    console.log('📝 idSeccional value:', dto.idSeccional, 'type:', typeof dto.idSeccional);
    console.log('📝 idSede value:', dto.idSede, 'type:', typeof dto.idSede);

    const user = await this.userRepo.findOne({
      where: { id_user: id },
      relations: ['person', 'roles']
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Construir SQL dinámico para actualizar todos los campos
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.first_name !== undefined) {
      setClauses.push(`nom_tercero = $${paramIndex++}`);
      values.push(dto.first_name);
    }
    if (dto.last_name !== undefined) {
      setClauses.push(`pri_apellido = $${paramIndex++}`);
      values.push(dto.last_name);
    }
    // Actualizar full_name si cambian los nombres
    if (dto.first_name !== undefined || dto.last_name !== undefined) {
      const firstName = dto.first_name ?? user.person.first_name;
      const lastName = dto.last_name ?? user.person.last_name;
      setClauses.push(`nom_largo = $${paramIndex++}`);
      values.push(`${firstName} ${lastName}`);
    }
    if (dto.identification_number !== undefined) {
      setClauses.push(`num_identificacion = $${paramIndex++}`);
      values.push(dto.identification_number);
    }
    if (dto.identification_type !== undefined) {
      setClauses.push(`tip_identificacion = $${paramIndex++}`);
      values.push(dto.identification_type);
    }
    if (dto.email !== undefined) {
      setClauses.push(`dir_email = $${paramIndex++}`);
      values.push(dto.email);
    }
    if (dto.phone !== undefined) {
      setClauses.push(`tel_celular = $${paramIndex++}`);
      values.push(dto.phone || null);
    }
    if (dto.gender !== undefined) {
      setClauses.push(`gen_tercero = $${paramIndex++}`);
      values.push(dto.gender || 'N'); // 'N' = No especificado, evita NULL
    }
    // Actualizar seccional y sede
    if (dto.idSeccional !== undefined) {
      setClauses.push(`id_seccional = $${paramIndex++}`);
      values.push(dto.idSeccional || null);
    }
    if (dto.idSede !== undefined) {
      setClauses.push(`id_sede = $${paramIndex++}`);
      values.push(dto.idSede || null);
    }

    // Ejecutar la actualización si hay campos para actualizar
    if (setClauses.length > 0) {
      values.push(user.person.id); // Para el WHERE
      const sql = `UPDATE auth.personas SET ${setClauses.join(', ')} WHERE id_tercero = $${paramIndex}`;
      console.log('📝 Executing SQL:', sql);
      console.log('📝 With values:', values);

      await this.personRepo.query(sql, values);
      console.log('📝 SQL update executed successfully');
    }

    // Solo actualizar roles si se envían roleIds con elementos
    if (dto.roleIds && dto.roleIds.length > 0) {
      const roles = await this.roleRepo.findByIds(dto.roleIds);
      // Actualizar solo la relación de roles, no todo el usuario
      await this.userRepo
        .createQueryBuilder()
        .relation(User, 'roles')
        .of(user.id_user)
        .addAndRemove(roles.map(r => r.id), user.roles.map(r => r.id));
    }

    const updatedUser = await this.userRepo.findOne({
      where: { id_user: id },
      relations: ['person', 'person.seccional', 'person.seccional.ubicacion', 'person.sede', 'person.sede.geopolitica', 'roles']
    });

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }

  async deletePerson(id: string): Promise<void> {
    const existingUser = await this.userRepo.findOne({
      where: { id_user: id },
      relations: ['person']
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    await this.userRepo.remove(existingUser);
    await this.personRepo.remove(existingUser.person);
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    const userToUpdate = await this.userRepo.findOne({
      where: { id_user: id },
      relations: ['person', 'roles']
    });

    if (!userToUpdate) {
      throw new Error('User not found');
    }

    userToUpdate.is_active = isActive;
    await this.userRepo.save(userToUpdate);

    return userToUpdate;
  }
}
