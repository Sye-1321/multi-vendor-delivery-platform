import { Document } from 'mongoose';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
export interface IValidateUser<TEntity, T extends Document> {
  getUser(
    model: GenericDocumentRepository<TEntity, T>,
    props: { email: string; role?: string },
  ): Promise<boolean>;
}
