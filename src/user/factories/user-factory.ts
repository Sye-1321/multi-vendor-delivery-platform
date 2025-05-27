import { User } from '../user';
import { throwApplicationError } from 'src/infrastructure/utilities/exception-instance';
import { HttpStatus } from '@nestjs/common';
import { CreateAdminDTO } from '../dtos/user/create-admin.dto';
import { CreateUserDTO } from '../dtos/user/create-user.dto';
import { Role } from 'src/application/constants/constants';
import { Context } from 'src/infrastructure/context/context';
import { Audit } from 'src/domain/audit/audit';

export class UserFactory {
  static createUser(props: CreateUserDTO | CreateAdminDTO, role: Role, passwordHash: string): User {
    const commonDefaults = {
      audit: Audit.createInsertContext(new Context(props.email)),
    };

    let roleSpecificDefaults: Partial<User> = {};
    switch (role) {
      case Role.END_USER:
        roleSpecificDefaults = {
          role: Role.END_USER,
        };
        break;
      case Role.BUSINESS_ADMINISTRATOR:
        roleSpecificDefaults = {
          role: Role.BUSINESS_ADMINISTRATOR,
        };
        break;
      case Role.RESTAURANT_ADMINISTRATOR:
        roleSpecificDefaults = {
          role: Role.RESTAURANT_ADMINISTRATOR,
        };
        break;
      default:
        throwApplicationError(HttpStatus.BAD_REQUEST, "Invalid user role.");
    } 
    const userProps = { ...props, role,...commonDefaults, ...roleSpecificDefaults, passwordHash:passwordHash };

    return User.create(userProps).getValue();
  }
}
