import { throwApplicationError } from './../infrastructure/utilities/exception-instance';
import { IValidateUser } from './context-validation.interface';
import { Result } from './../domain/result/result';
import { HttpStatus } from '@nestjs/common';
import { User } from 'src/user/user';
import { UserDocument } from 'src/infrastructure/data_access/repositories/schemas/user.schema';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';

type Document = UserDocument;
type Domain = User;

export class ValidateUser implements IValidateUser<Domain, Document> {
  async getUser(
    model: GenericDocumentRepository<Domain, Document>,
    props: { email: string; role?: string },
  ): Promise<boolean> {
    const { email, role } = props;
    let user: Result<any>;
    if (Object.hasOwnProperty.call(props, 'email')) {
      user = await model.findOne({ email });
    } else {
      user = await model.findOne({ role });
    }
    if (!user.isSuccess) {
      throwApplicationError(HttpStatus.FORBIDDEN, 'Invalid User');
    }
    return Boolean(user.isSuccess);
  }
}
