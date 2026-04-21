import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  QueryFailedError,
  Repository,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Person } from './person.entity';
import { Role } from './role.entity';
import { NewPersonDto } from '../auth/dto/new-person.dto';
import { CreatePersonDto } from './dto/create-person.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Person) private readonly personRepo: Repository<Person>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) { }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { username },
      relations: ['person', 'roles', 'roles.permissions']
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: {
        person: { email }
      },
      relations: ['person', 'roles', 'roles.permissions']
    });
  }

  private get schemaName(): string {
    return process.env.DB_SCHEMA || 'auth';
  }

  private get personasTableRef(): string {
    return `"${this.schemaName}"."personas"`;
  }

  private normalizeRequiredText(value: string): string {
    return value.trim();
  }

  private normalizeOptionalText(value?: string | null): string {
    return value?.trim() || '';
  }

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizeGender(value?: string | null): string {
    const normalized = value?.trim().toUpperCase();
    return normalized || 'N';
  }

  private async getNextLegacyPersonId(
    manager: EntityManager,
  ): Promise<string | null> {
    const [columnInfo] = await manager.query(
      `
        SELECT column_default
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = 'personas'
          AND column_name = 'id_tercero'
        LIMIT 1
      `,
      [this.schemaName],
    );

    if (!columnInfo) {
      return null;
    }

    const columnDefault =
      typeof columnInfo.column_default === 'string'
        ? columnInfo.column_default
        : null;

    if (columnDefault?.includes('nextval')) {
      const [nextValue] = await manager.query(
        `SELECT nextval(pg_get_serial_sequence($1, 'id_tercero')) AS next_id`,
        [`${this.schemaName}.personas`],
      );
      return String(nextValue.next_id);
    }

    await manager.query(`LOCK TABLE ${this.personasTableRef} IN EXCLUSIVE MODE`);
    const [nextValue] = await manager.query(
      `SELECT COALESCE(MAX(id_tercero), 0) + 1 AS next_id FROM ${this.personasTableRef}`,
    );

    return String(nextValue.next_id);
  }

  private async assertCreateUserUniqueness(
    manager: EntityManager,
    email: string,
    identificationNumber: string,
  ): Promise<void> {
    const [existingUser, existingPersonByDocument, existingPersonByEmail] =
      await Promise.all([
        manager.getRepository(User).findOne({
          where: { username: email },
        }),
        manager.getRepository(Person).findOne({
          where: { identification_number: identificationNumber },
        }),
        manager.getRepository(Person).findOne({
          where: { email },
        }),
      ]);

    if (existingUser || existingPersonByEmail) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese correo electronico.',
      );
    }

    if (existingPersonByDocument) {
      throw new ConflictException(
        'Ya existe una persona registrada con ese numero de documento.',
      );
    }
  }

  private async savePerson(
    manager: EntityManager,
    data: {
      firstName: string;
      lastName: string;
      identificationNumber: string;
      identificationType: string;
      email: string;
      phone?: string | null;
      gender?: string | null;
      idSeccional?: number | null;
      idSede?: number | null;
    },
  ): Promise<Person> {
    const personRepo = manager.getRepository(Person);
    const legacyPersonId = await this.getNextLegacyPersonId(manager);
    const firstName = this.normalizeRequiredText(data.firstName);
    const lastName = this.normalizeRequiredText(data.lastName);

    return personRepo.save(
      personRepo.create({
        id: randomUUID(),
        idTercero: legacyPersonId,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        identification_number: this.normalizeRequiredText(
          data.identificationNumber,
        ),
        identification_type: this.normalizeRequiredText(data.identificationType),
        email: this.normalizeEmail(data.email),
        phone: this.normalizeOptionalText(data.phone),
        gender: this.normalizeGender(data.gender),
        idSeccional: data.idSeccional ?? null,
        idSede: data.idSede ?? null,
      }),
    );
  }

  private async loadUserWithRelations(
    manager: EntityManager,
    userId: string,
  ): Promise<User> {
    const createdUser = await manager.getRepository(User).findOne({
      where: { id_user: userId },
      relations: [
        'person',
        'person.seccional',
        'person.seccional.ubicacion',
        'person.sede',
        'person.sede.geopolitica',
        'roles',
      ],
    });

    if (!createdUser) {
      throw new Error('User not found after creation');
    }

    return createdUser;
  }

  private rethrowCreateUserError(error: unknown): never {
    console.error('🔥 [rethrowCreateUserError] Raw Exception details:', error);
    if (
      error instanceof ConflictException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as {
        code?: string;
        constraint?: string;
      };

      if (driverError.code === '23503') {
        if (driverError.constraint === 'fk_personas_seccional') {
          throw new BadRequestException(
            'La seccional seleccionada no existe o ya no esta disponible.',
          );
        }

        if (driverError.constraint === 'fk_personas_sede') {
          throw new BadRequestException(
            'La sede seleccionada no existe o ya no esta disponible.',
          );
        }

        throw new BadRequestException(
          'No fue posible relacionar algunos datos del usuario.',
        );
      }

      if (driverError.code === '23505') {
        throw new ConflictException(
          'Ya existe un registro con los mismos datos del usuario.',
        );
      }
    }

    throw new InternalServerErrorException(
      'No fue posible crear el usuario en este momento.',
    );
  }

  async createPersonAndUser(dto: NewPersonDto): Promise<User> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const normalizedEmail = this.normalizeEmail(dto.email);
        const normalizedDocument = this.normalizeRequiredText(
          dto.documentNumber,
        );
        const normalizedUsername = this.normalizeRequiredText(dto.username);

        const existingUsername = await manager.getRepository(User).findOne({
          where: { username: normalizedUsername },
        });
        if (existingUsername) {
          throw new ConflictException(
            'Ya existe un usuario registrado con ese nombre de usuario.',
          );
        }

        await this.assertCreateUserUniqueness(
          manager,
          normalizedEmail,
          normalizedDocument,
        );

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const person = await this.savePerson(manager, {
          firstName: dto.firstName,
          lastName: dto.lastName,
          identificationNumber: normalizedDocument,
          identificationType: 'CC',
          email: normalizedEmail,
          phone: dto.phone,
          gender: 'N',
        });

        const userRepo = manager.getRepository(User);
        const savedUser = await userRepo.save(
          userRepo.create({
            id_user: randomUUID(),
            username: normalizedUsername,
            password_hash: passwordHash,
            id_person: person.id,
            person,
          }),
        );

        if (dto.roles && dto.roles.length > 0) {
          const roles = await manager.getRepository(Role).find({
            where: dto.roles.map((name) => ({ name })),
          });
          savedUser.roles = roles;
          await userRepo.save(savedUser);
        }

        return this.loadUserWithRelations(manager, savedUser.id_user);
      });
    } catch (error) {
      this.rethrowCreateUserError(error);
    }
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
    filters: { search?: string; status?: 'active' | 'inactive' | 'all'; role?: string } = {},
  ): Promise<{
    users: User[];
    total: number;
    totalActive: number;
    totalBlocked: number;
  }> {
    const baseQuery = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.person', 'person')
      .leftJoinAndSelect('person.seccional', 'seccional')
      .leftJoinAndSelect('seccional.ubicacion', 'seccionalUbicacion')
      .leftJoinAndSelect('person.sede', 'sede')
      .leftJoinAndSelect('sede.geopolitica', 'sedeGeopolitica')
      .leftJoinAndSelect('user.roles', 'roles')
      .distinct(true);

    if (filters.search?.trim()) {
      const search = `%${filters.search.trim()}%`;
      baseQuery.andWhere(
        `(
          person.first_name ILIKE :search OR
          person.last_name ILIKE :search OR
          person.full_name ILIKE :search OR
          person.email ILIKE :search OR
          person.identification_number ILIKE :search
        )`,
        { search },
      );
    }

    if (filters.status && filters.status !== 'all') {
      baseQuery.andWhere('user.is_active = :isActive', {
        isActive: filters.status === 'active',
      });
    }

    if (filters.role && filters.role?.trim()) {
      baseQuery.andWhere('roles.id = :id', { id: filters.role });
    }

    const pagedQuery = baseQuery
      .clone()
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await pagedQuery.getManyAndCount();

    const totalActive = await baseQuery
      .clone()
      .andWhere('user.is_active = :activeStatus', { activeStatus: true })
      .getCount();

    const totalBlocked = await baseQuery
      .clone()
      .andWhere('user.is_active = :blockedStatus', { blockedStatus: false })
      .getCount();

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
    try {
      return await this.dataSource.transaction(async (manager) => {
        const normalizedEmail = this.normalizeEmail(dto.email);
        const normalizedDocument = this.normalizeRequiredText(
          dto.identification_number,
        );

        await this.assertCreateUserUniqueness(
          manager,
          normalizedEmail,
          normalizedDocument,
        );

        const savedPerson = await this.savePerson(manager, {
          firstName: dto.first_name,
          lastName: dto.last_name,
          identificationNumber: normalizedDocument,
          identificationType: dto.identification_type,
          email: normalizedEmail,
          phone: dto.phone,
          gender: dto.gender,
          idSeccional: dto.idSeccional,
          idSede: dto.idSede,
        });

        const passwordHash = await bcrypt.hash('123456', 10);
        const userRepo = manager.getRepository(User);
        const savedUser = await userRepo.save(
          userRepo.create({
            id_user: randomUUID(),
            username: normalizedEmail,
            password_hash: passwordHash,
            is_active: false,
            id_person: savedPerson.id,
            person: savedPerson,
          }),
        );

        if (dto.roleIds && dto.roleIds.length > 0) {
          const roles = await manager.getRepository(Role).findBy({
            id: In(dto.roleIds),
          });
          savedUser.roles = roles;
          await userRepo.save(savedUser);
        }

        return this.loadUserWithRelations(manager, savedUser.id_user);
      });
    } catch (error) {
      this.rethrowCreateUserError(error);
    }
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
      const sql = `UPDATE auth.personas SET ${setClauses.join(', ')} WHERE id_person = $${paramIndex}`;
      console.log('📝 Executing SQL:', sql);
      console.log('📝 With values:', values);

      await this.personRepo.query(sql, values);
      console.log('📝 SQL update executed successfully');
    }

    // Solo actualizar roles si se envían roleIds con elementos
    if (dto.roleIds && dto.roleIds.length > 0) {
      const roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
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
