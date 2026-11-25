import { GraduationCertificatesService } from './graduation-certificates.service';
import type { Graduate } from './graduate.entity';
import type { OracleGraduateRecord } from './graduate-oracle-integration.service';
import type { MysqlGraduateRecord } from './graduate-mysql-integration.service';

type Source = 'mysql' | 'oracle';
// PostgreSQL date columns are returned as strings by TypeORM.
const cloneRecord = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('GraduationCertificatesService multiple academic titles synchronization', () => {
  const document = '1234567';
  const titles = [
    {
      name: 'Persona Graduada Uno',
      program: 'Magíster en Administración Pública',
      date: '2022-01-01',
    },
    {
      name: 'Persona Graduada Uno',
      program: 'Especialista en Gestión Pública',
      date: '2020-01-01',
    },
    {
      name: 'Persona Graduada Dos',
      program: 'Especialista en Gerencia Ambiental',
      date: '2021-01-01',
    },
  ];
  const oracleRecords: OracleGraduateRecord[] = titles.map((title, index) => ({
    idNumber: document,
    fullName: title.name,
    firstName: null,
    lastName: null,
    email: null,
    personalEmail: null,
    phone: null,
    programCode: null,
    programName: title.program,
    programType: 'Posgrado',
    degreeTitle: title.program,
    territorial: null,
    campus: null,
    numLibro: '1',
    numFolio: null,
    numRegistro: String(100 + index),
    diplomaNumber: `DIPLOMA-${index + 1}`,
    graduationDate: title.date,
    numActa: String(index + 1),
  }));
  const mysqlRecords: MysqlGraduateRecord[] = oracleRecords.map(
    (record, index) => ({
      ID: index + 1,
      TIPOIDENTIFICACION: 'CC',
      IDENTIFICACION: document,
      ESTUDIANTE: record.fullName!,
      TITULO: record.programName!,
      REGISTRO: record.numRegistro!,
      ACTA: record.numActa!,
      LIBRO: record.numLibro!,
      DIPLOMA: record.diplomaNumber!,
      FECHAREGISTRO: record.graduationDate!,
      AñoGrado: 2020,
    }),
  );

  const setup = (source: Source, initial: Partial<Graduate>[] = []) => {
    const records = new Map<string, Graduate>();
    initial.forEach((record) =>
      records.set(record.id!, cloneRecord(record) as Graduate),
    );
    let sequence = 0;
    const repository = {
      find: jest.fn(async () =>
        [...records.values()].map((record) => cloneRecord(record)),
      ),
      create: jest.fn((payload: Partial<Graduate>) => ({
        ...payload,
        id: `synced-${++sequence}`,
      })),
      save: jest.fn(async (record: Graduate) => {
        // Mirror the database uniqueness rules for document/program and diploma.
        const duplicate = [...records.values()].some(
          (existing) =>
            existing.id !== record.id &&
            ((existing.idNumber === record.idNumber &&
              existing.programName === record.programName) ||
              (record.diplomaNumber &&
                existing.diplomaNumber === record.diplomaNumber)),
        );
        if (duplicate) {
          throw Object.assign(new Error('Duplicate academic title'), {
            code: '23505',
          });
        }
        records.set(record.id, cloneRecord(record));
        return cloneRecord(record);
      }),
    };
    const requestRepository = { save: jest.fn() };
    const certificateRepository = { save: jest.fn() };
    const mysql = {
      isEnabled: jest.fn(() => source === 'mysql'),
      findGraduatesByDocument: jest.fn(async () => cloneRecord(mysqlRecords)),
    };
    const oracle = {
      isEnabled: jest.fn(() => source === 'oracle'),
      findGraduatesByDocument: jest.fn(async () => cloneRecord(oracleRecords)),
    };
    const service = new GraduationCertificatesService(
      repository as never,
      requestRepository as never,
      certificateRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      mysql as never,
      oracle as never,
      {} as never,
    );
    const search = () =>
      service.buscarCoincidenciasGraduado(
        document,
        undefined,
        'Persona Graduada',
      );
    return {
      service,
      repository,
      requestRepository,
      certificateRepository,
      mysql,
      oracle,
      search,
      records,
    };
  };

  it.each<Source>(['mysql', 'oracle'])(
    'returns all three titles from %s on the first and following searches',
    async (source) => {
      const { search, requestRepository, certificateRepository } =
        setup(source);

      const first = await search();
      const second = await search();
      const third = await search();

      expect([
        first.suggestions.length,
        second.suggestions.length,
        third.suggestions.length,
      ]).toEqual([3, 3, 3]);
      expect(first.totalMatches).toBe(3);
      expect(
        first.suggestions.map(({ fullName, programName }) => ({
          fullName,
          programName,
        })),
      ).toEqual(
        expect.arrayContaining(
          titles.map(({ name, program }) => ({
            fullName: name,
            programName: program,
          })),
        ),
      );
      expect(second.suggestions).toEqual(first.suggestions);
      expect(third.suggestions).toEqual(first.suggestions);
      expect(
        new Set(first.suggestions.map(({ graduateId }) => graduateId)).size,
      ).toBe(3);
      expect(requestRepository.save).not.toHaveBeenCalled();
      expect(certificateRepository.save).not.toHaveBeenCalled();
    },
  );

  it.each<Source>(['mysql', 'oracle'])(
    'preserves an existing title and its identity when %s returns an additional title first',
    async (source) => {
      const initial = {
        id: 'existing-specialization',
        idNumber: document,
        fullName: titles[1].name,
        programName: titles[1].program,
        degreeTitle: titles[1].program,
        graduationDate: new Date(titles[1].date),
        status: 'ACTIVE',
        diplomaNumber: 'DIPLOMA-2',
        numRegistro: '101',
        numLibro: '1',
        email: 'persona@example.test',
      };
      const { search, records } = setup(source, [initial]);

      const result = await search();

      expect(result.suggestions).toHaveLength(3);
      expect(records.get(initial.id)).toMatchObject({
        programName: initial.programName,
        fullName: initial.fullName,
        email: initial.email,
      });
      expect(
        result.suggestions.find(
          ({ programName }) => programName === initial.programName,
        )?.graduateId,
      ).toBe(initial.id);
      expect((await search()).suggestions).toEqual(result.suggestions);
    },
  );

  it.each<Source>(['mysql', 'oracle'])(
    'does not merge different titles from %s that share only a book number',
    async (source) => {
      const { search, mysql, oracle } = setup(source);
      mysql.findGraduatesByDocument.mockResolvedValue(
        mysqlRecords.map((record) => ({
          ...record,
          DIPLOMA: '',
          REGISTRO: '',
        })),
      );
      oracle.findGraduatesByDocument.mockResolvedValue(
        oracleRecords.map((record) => ({
          ...record,
          diplomaNumber: null,
          numRegistro: null,
        })),
      );

      const first = await search();
      const second = await search();

      expect(first.suggestions).toHaveLength(3);
      expect(second.suggestions).toEqual(first.suggestions);
    },
  );

  it.each<Source>(['mysql', 'oracle'])(
    'updates the title identified by its diploma in %s even if its academic description changed',
    async (source) => {
      const { search, records } = setup(source, [
        {
          id: 'existing-master',
          idNumber: document,
          fullName: 'Nombre Anterior',
          programName: 'Descripción Anterior',
          degreeTitle: 'Descripción Anterior',
          graduationDate: new Date('2019-01-01'),
          status: 'ACTIVE',
          diplomaNumber: 'DIPLOMA-1',
        },
      ]);

      const result = await search();

      expect(result.suggestions).toHaveLength(3);
      expect(records.get('existing-master')).toMatchObject({
        programName: titles[0].program,
        fullName: titles[0].name,
      });
      expect(
        result.suggestions.find(
          ({ programName }) => programName === titles[0].program,
        )?.graduateId,
      ).toBe('existing-master');
      expect((await search()).suggestions).toEqual(result.suggestions);
    },
  );

  it.each<Source>(['mysql', 'oracle'])(
    'matches an existing title by program and graduation date when %s has no registry identifiers',
    async (source) => {
      const { search, mysql, oracle, records } = setup(source, [
        {
          id: 'existing-specialization',
          idNumber: document,
          fullName: titles[1].name,
          programName: titles[1].program,
          degreeTitle: titles[1].program,
          graduationDate: new Date(titles[1].date),
          status: 'ACTIVE',
        },
      ]);
      mysql.findGraduatesByDocument.mockResolvedValue(
        mysqlRecords.map((record) => ({
          ...record,
          DIPLOMA: '',
          REGISTRO: '',
          LIBRO: '',
        })),
      );
      oracle.findGraduatesByDocument.mockResolvedValue(
        oracleRecords.map((record) => ({
          ...record,
          diplomaNumber: null,
          numRegistro: null,
          numLibro: null,
        })),
      );

      const result = await search();

      expect(result.suggestions).toHaveLength(3);
      expect(records.get('existing-specialization')).toMatchObject({
        programName: titles[1].program,
      });
      expect(
        result.suggestions.find(
          ({ programName }) => programName === titles[1].program,
        )?.graduateId,
      ).toBe('existing-specialization');
      expect((await search()).suggestions).toEqual(result.suggestions);
    },
  );

  it.each<Source>(['mysql', 'oracle'])(
    'preserves updates identified by registry number and book in %s when descriptions differ',
    async (source) => {
      const { search, mysql, oracle, records } = setup(source, [
        {
          id: 'existing-master',
          idNumber: document,
          fullName: 'Nombre Anterior',
          programName: 'Descripción Anterior',
          degreeTitle: 'Descripción Anterior',
          graduationDate: new Date('2019-01-01'),
          status: 'ACTIVE',
          numRegistro: '100',
          numLibro: '1',
        },
      ]);
      mysql.findGraduatesByDocument.mockResolvedValue(
        mysqlRecords.map((record) => ({ ...record, DIPLOMA: '' })),
      );
      oracle.findGraduatesByDocument.mockResolvedValue(
        oracleRecords.map((record) => ({ ...record, diplomaNumber: null })),
      );

      const result = await search();

      expect(result.suggestions).toHaveLength(3);
      expect(records.get('existing-master')).toMatchObject({
        programName: titles[0].program,
        fullName: titles[0].name,
      });
      expect(
        result.suggestions.find(
          ({ programName }) => programName === titles[0].program,
        )?.graduateId,
      ).toBe('existing-master');
      expect((await search()).suggestions).toEqual(result.suggestions);
    },
  );

  it.each<Source>(['mysql', 'oracle'])(
    'updates a corrected graduation date for the same program in %s without creating a duplicate',
    async (source) => {
      const { search, mysql, oracle, records } = setup(source, [
        {
          id: 'existing-master',
          idNumber: document,
          fullName: titles[0].name,
          programName: titles[0].program,
          degreeTitle: titles[0].program,
          graduationDate: new Date('2020-01-01'),
          status: 'ACTIVE',
          numLibro: '1',
        },
      ]);
      mysql.findGraduatesByDocument.mockResolvedValue(
        mysqlRecords.slice(0, 1).map((record) => ({
          ...record,
          TITULO: titles[0].program,
          DIPLOMA: '',
          REGISTRO: '',
        })),
      );
      oracle.findGraduatesByDocument.mockResolvedValue(
        oracleRecords.slice(0, 1).map((record) => ({
          ...record,
          programName: titles[0].program,
          degreeTitle: titles[0].program,
          diplomaNumber: null,
          numRegistro: null,
        })),
      );

      const first = await search();

      expect(first.suggestions).toHaveLength(1);
      expect(first.suggestions[0]).toMatchObject({
        graduateId: 'existing-master',
        graduationDate: '2022-01-01',
      });
      expect(records.size).toBe(1);
      expect((await search()).suggestions).toEqual(first.suggestions);
    },
  );

  it.each<Source>(['mysql', 'oracle'])(
    'returns the same titles if %s changes the order of its response',
    async (source) => {
      const { search, mysql, oracle } = setup(source);
      mysql.findGraduatesByDocument
        .mockResolvedValueOnce(cloneRecord(mysqlRecords))
        .mockResolvedValueOnce(cloneRecord([...mysqlRecords].reverse()));
      oracle.findGraduatesByDocument
        .mockResolvedValueOnce(cloneRecord(oracleRecords))
        .mockResolvedValueOnce(cloneRecord([...oracleRecords].reverse()));

      const first = await search();
      const second = await search();

      expect(first.suggestions).toHaveLength(3);
      expect(second.suggestions).toEqual(first.suggestions);
    },
  );

  it.each<Source>(['mysql', 'oracle'])(
    'waits for the complete response from %s before returning suggestions',
    async (source) => {
      const { search, mysql, oracle } = setup(source);
      let release!: () => void;
      const responseReady = new Promise<void>((resolve) => {
        release = resolve;
      });
      mysql.findGraduatesByDocument.mockImplementationOnce(async () => {
        await responseReady;
        return cloneRecord(mysqlRecords);
      });
      oracle.findGraduatesByDocument.mockImplementationOnce(async () => {
        await responseReady;
        return cloneRecord(oracleRecords);
      });
      let completed = false;
      const pending = search().then((result) => {
        completed = true;
        return result;
      });

      await Promise.resolve();
      expect(completed).toBe(false);
      release();

      expect((await pending).suggestions).toHaveLength(3);
    },
  );
});
