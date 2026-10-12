import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as Joi from 'joi';
import { Connection, createConnection } from 'mongoose';
import { AuditMapper } from 'src/audit/audit.mapper';
import { Role, saltRounds } from 'src/application/constants/constants';
import { Audit } from 'src/domain/audit/audit';
import { Context } from 'src/infrastructure/context/context';
import { UserRepository } from 'src/infrastructure/data_access/repositories/user.repository';
import {
  UserDataModel,
  UserSchema,
} from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import {
  UserStatus,
  passwordStrengthRegEx,
} from 'src/user/constants/constants';
import { UserMapper } from 'src/user/user.mapper';
import { User } from 'src/user/user';

const passwordHasher = bcrypt as unknown as {
  hash(value: string, rounds: number): Promise<string>;
};

const operatorDefinitions = [
  { role: Role.SYSTEM_ADMINISTRATOR, prefix: 'BOOTSTRAP_SYSTEM_ADMIN' },
  {
    role: Role.DELIVERY_COMPANY_ADMINISTRATOR,
    prefix: 'BOOTSTRAP_DELIVERY_ADMIN',
  },
] as const;

export type OperatorRole = (typeof operatorDefinitions)[number]['role'];

export interface OperatorInput {
  role: OperatorRole;
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface OperatorBootstrapResult {
  role: OperatorRole;
  action: 'created' | 'skipped';
}

export class OperatorBootstrapError extends Error {}

export const validateOperatorInputs = (
  missingRoles: OperatorRole[],
  environment: NodeJS.ProcessEnv,
): OperatorInput[] =>
  operatorDefinitions
    .filter(({ role }) => missingRoles.includes(role))
    .map((definition) => {
      const keys = {
        name: `${definition.prefix}_NAME`,
        email: `${definition.prefix}_EMAIL`,
        phoneNumber: `${definition.prefix}_PHONE`,
        password: `${definition.prefix}_PASSWORD`,
      } as const;
      const schema = Joi.object({
        [keys.name]: Joi.string().trim().min(3).required(),
        [keys.email]: Joi.string().trim().email().required(),
        [keys.phoneNumber]: Joi.string()
          .trim()
          .pattern(/^251\d{9}$/)
          .required(),
        [keys.password]: Joi.string().pattern(passwordStrengthRegEx).required(),
      });
      const values = {
        [keys.name]: environment[keys.name],
        [keys.email]: environment[keys.email],
        [keys.phoneNumber]: environment[keys.phoneNumber],
        [keys.password]: environment[keys.password],
      };
      const { error, value } = schema.validate(values, {
        abortEarly: false,
        stripUnknown: true,
      }) as unknown as {
        error?: Joi.ValidationError;
        value: Record<string, string>;
      };
      if (error) {
        const invalidNames = [
          ...new Set(error.details.map(({ path }) => path[0])),
        ];
        throw new OperatorBootstrapError(
          `Invalid bootstrap configuration: ${invalidNames.join(', ')}`,
        );
      }
      return {
        role: definition.role,
        name: value[keys.name],
        email: value[keys.email],
        phoneNumber: value[keys.phoneNumber],
        password: value[keys.password],
      };
    });

export const provisionOperators = async (
  connection: Connection,
  environment: NodeJS.ProcessEnv,
): Promise<OperatorBootstrapResult[]> => {
  const model = connection.model<UserDataModel>(UserDataModel.name, UserSchema);
  const mapper = new UserMapper(new AuditMapper());
  const repository = new UserRepository(model as never, connection, mapper);
  const existing = await repository.getUsers({
    role: { $in: operatorDefinitions.map(({ role }) => role) },
  });
  if (!existing.isSuccess) {
    throw new OperatorBootstrapError('Unable to inspect existing operators.');
  }
  const existingRoles = new Set(existing.getValue().map(({ role }) => role));
  const missingRoles = operatorDefinitions
    .map(({ role }) => role)
    .filter((role) => !existingRoles.has(role));
  const inputs = validateOperatorInputs(missingRoles, environment);

  if (new Set(inputs.map(({ email }) => email)).size !== inputs.length) {
    throw new OperatorBootstrapError(
      'Bootstrap operator email addresses must be unique.',
    );
  }
  for (const input of inputs) {
    if ((await repository.findByEmail(input.email)).isSuccess) {
      throw new OperatorBootstrapError(
        `Bootstrap email conflict for ${input.role}.`,
      );
    }
  }

  const results: OperatorBootstrapResult[] = operatorDefinitions
    .filter(({ role }) => existingRoles.has(role))
    .map(({ role }) => ({ role, action: 'skipped' }));
  for (const input of inputs) {
    const passwordHash = await passwordHasher.hash(input.password, saltRounds);
    const operator = User.create({
      name: input.name,
      email: input.email,
      phoneNumber: input.phoneNumber,
      passwordHash,
      role: input.role,
      status: UserStatus.ACTIVE,
      audit: Audit.createInsertContext(new Context(input.email)),
    }).getValue();
    const created = await repository.createUser(mapper.toPersistence(operator));
    if (!created.isSuccess) {
      throw new OperatorBootstrapError(`Unable to create ${input.role}.`);
    }
    results.push({ role: input.role, action: 'created' });
  }
  return results;
};

export const runOperatorBootstrapCli = async (): Promise<void> => {
  dotenv.config();
  const { error, value } = Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required()
    .validate(process.env.DATABASE_URL) as unknown as {
    error?: Joi.ValidationError;
    value: string;
  };
  if (error) {
    throw new OperatorBootstrapError('Invalid DATABASE_URL.');
  }

  let connection: Connection | undefined;
  try {
    connection = createConnection(value);
    await connection.asPromise();
    const results = await provisionOperators(connection, process.env);
    for (const result of results) {
      console.log(
        result.action === 'created'
          ? `Created ${result.role}`
          : `Skipped ${result.role}: role already provisioned`,
      );
    }
    console.log('Operator bootstrap completed');
  } finally {
    await connection?.close();
  }
};

if (require.main === module) {
  void runOperatorBootstrapCli().catch((error: unknown) => {
    const message =
      error instanceof OperatorBootstrapError
        ? error.message
        : 'Unexpected bootstrap failure.';
    console.error(`Operator bootstrap failed: ${message}`);
    process.exitCode = 1;
  });
}
