import { HttpStatus } from '@nestjs/common';
import {
  ClientSession,
  Connection,
  Document,
  FilterQuery,
  Model,
  ProjectionType,
  QueryOptions,
  SaveOptions,
  Types,
  UpdateQuery,
} from 'mongoose';
import { Result } from './../../../domain/result/result';
import { throwApplicationError } from './../../utilities/exception-instance';
import { IGenericDocument } from './generic-document.interface';

export abstract class GenericDocumentRepository<TEntity, T extends Document>
  implements IGenericDocument<TEntity, T>
{
  constructor(
    protected readonly DocumentModel: Model<T>,
    readonly connection: Connection,
    protected readonly mapper: any,
  ) {}

  private convertObjectIdToString(objectId: Types.ObjectId) {
    return objectId.toString();
  }

  public objectIdToString(objectId: Types.ObjectId): string {
    return this.convertObjectIdToString(objectId);
  }

  public stringToObjectId(prop: string): Types.ObjectId {
    return this.convertStringToObjectId(prop);
  }

  private convertStringToObjectId(prop: string) {
    return new Types.ObjectId(prop);
  }

  async count(query: FilterQuery<T>, limit?: number): Promise<number> {
    return this.DocumentModel.countDocuments(query, { limit });
  }
  async aggregate(
    query: any[],
    options: { readPeference?: 'secondaryPreferred' | 'primaryPreferred' } = {},
  ): Promise<any> {
    return await this.DocumentModel.aggregate(query).read(
      options.readPeference || 'primary',
    );
  }

  async findOne(
    filterQuery: FilterQuery<T>,
    projection?: ProjectionType<T | null>,
  ): Promise<Result<TEntity | null>> {
    const document = await this.DocumentModel.findOne(filterQuery, projection);
    if (!document) {
      return Result.fail(
        'Error getting documents from database',
        HttpStatus.NOT_FOUND,
      );
    }
    const entity = this.mapper.toDomain(document);
    return Result.ok(entity);
  }

  async findById(
    id: any,
    projection?: ProjectionType<T> | null,
  ): Promise<Result<TEntity | null>> {
    const document = await this.DocumentModel.findById(id, projection);
    if (!document) {
      return Result.fail(
        'Error getting documents from database',
        HttpStatus.NOT_FOUND,
      );
    }
    const entity = this.mapper.toDomain(document);
    return Result.ok(entity);
  }

  async find(
    query: FilterQuery<T>,
    select?: ProjectionType<T | null>,
    options?: QueryOptions<T>,
  ): Promise<Result<TEntity[] | []>> {
    try {
      const skip = options?.skip ?? 0;
      const limit = options?.limit ?? 10;

      const documents = await this.DocumentModel.find(query, select, options)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const entities = documents?.length
        ? documents.map((document) => this.mapper.toDomain(document))
        : [];
      return Result.ok(entities);
    } catch (error) {
      console.error(error);
      return Result.fail(
        'Error fetching documents from the database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  pagination(
    query: FilterQuery<T>,
    select: ProjectionType<T | null>,
    options: QueryOptions<T>,
  ) {
    const pageSize = 500;
    const page = options.page || 1;
    const skip = (page - 1) * pageSize;
    const limit = options.limit || pageSize;
    const documents = this.DocumentModel.find(query, select, {
      ...options,
      skip,
      limit,
    })
      .batchSize(pageSize)
      .cursor();
    return documents.map((doc) => this.mapper.toDomain(doc));
  }

  async create(document: any, options?: SaveOptions): Promise<Result<TEntity>> {
    // If options?.session is null or undefined, we don't want to pass it to createDocument
    const saveOptions =
      options?.session != null ? { session: options.session } : undefined;

    // Pass the options correctly to createDocument
    const doc = this.createDocument(document, saveOptions);

    const result = (await doc.save(saveOptions)).toJSON() as T;

    if (!result) {
      return Result.fail(
        'An Error occurred, unable to save document in the db',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const entity = this.mapper.toDomain(result);
    return Result.ok(entity);
  }

  async findOneAndUpdate(
    filterQuery: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: { session: ClientSession },
  ): Promise<Result<TEntity | null>> {
    const queryOptions: any = {
      new: true,
    };
    if (options?.session) {
      queryOptions.session = options.session;
    }
    const result = await this.DocumentModel.findByIdAndUpdate(
      filterQuery,
      update,
      queryOptions,
    );
    if (!result) {
      return Result.fail(
        'An Error occured, unable to update the database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const entity = this.mapper.toDomain(result);
    return Result.ok(entity);
  }

  async upsert(
    filterQuery: FilterQuery<T>,
    document: Partial<T>,
    options?: { session?: ClientSession },
  ): Promise<Result<TEntity | null>> {
    const queryOption: any = {
      lean: true,
      upsert: true,
      new: true,
    };
    if (options?.session) {
      queryOption.session = options.session;
    }
    const result = await this.DocumentModel.findOneAndUpdate(
      filterQuery,
      document,
      queryOption,
    );

    if (!result) {
      return Result.fail(
        'Unable to update the database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const entity = this.mapper.toDomain(result);
    return Result.ok(entity);
  }

  async deleteMany(filterQuery: FilterQuery<T>): Promise<boolean> {
    const result = this.DocumentModel.deleteMany(filterQuery);
    return (await result).deletedCount >= 1;
  }

  async deleteOne(filterQuery: FilterQuery<T>): Promise<boolean> {
    const result = this.DocumentModel.deleteOne(filterQuery);
    return (await result).deletedCount === 1;
  }

  async startSession(): Promise<ClientSession> {
    return await this.connection.startSession();
  }

  async insertMany(docs: any): Promise<Result<TEntity[]>> {
    try {
      const documentsToSave = docs.map((doc) => this.createDocument(doc));
      const documents = await this.DocumentModel.insertMany(documentsToSave);
      if (!documents?.length) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Unable to insert documents into the database',
        );
      }
      const entities: TEntity[] = documents.map((doc) =>
        this.mapper.toDomain(doc),
      );
      return Result.ok(entities);
    } catch (error) {
      console.error(error);
      return Result.fail(
        'Error inserting documents into the database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async insertManyWithSession(
    docs: any,
    options?: { session?: ClientSession },
  ): Promise<Result<Types.ObjectId[]>> {
    try {
      let documentIds: Types.ObjectId[] = [];
      const documentsToSave = docs.map((doc) => this.createDocument(doc));
      const documents = await this.DocumentModel.insertMany(documentsToSave, {
        ...options,
        rawResult: true,
      });
      if (documents.insertedCount < docs.length) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Unable to insert documents into the database',
        );
      }
      const insertedDocIds: any = Object.values(documents.insertedIds);
      if (insertedDocIds?.length) {
        documentIds = insertedDocIds.map((id) => this.stringToObjectId(id));
      }
      return Result.ok(documentIds);
    } catch (error) {
      console.error(error);
      return Result.fail(
        'Error inserting documents with session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateOne(filter: any, query: any): Promise<Result<TEntity>> {
    try {
      const document = await this.DocumentModel.updateOne(filter, {
        $set: query,
      });
      if (!document) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Unable to update document in the database',
        );
      }
      const entity: TEntity = this.mapper.toDomain(document as any);
      return Result.ok(entity);
    } catch (error) {
      console.error(error);
      return Result.fail(
        'Error updating document in the database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateMany(
    query: FilterQuery<T>,
    updateBody: UpdateQuery<T>,
    options?: { session?: ClientSession },
  ): Promise<Result<TEntity[]>> {
    try {
      const updateOptions: { multi: boolean; session?: ClientSession } = {
        multi: true,
      };

      // Add session only if it's defined (not null or undefined)
      if (options?.session) {
        updateOptions.session = options.session;
      }

      const saved = await this.DocumentModel.updateMany(
        query,
        updateBody,
        updateOptions,
      );
      if (saved.matchedCount < 1) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Unable to update documents in the database',
        );
      }

      const updatedDocuments = await this.DocumentModel.find(query);
      const entities: TEntity[] = updatedDocuments.map((doc) =>
        this.mapper.toDomain(doc),
      );
      return Result.ok(entities);
    } catch (error) {
      console.error(error);
      return Result.fail(
        'Error updating documents in the database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private createDocument(document: any, options?: { session?: ClientSession }) {
    const doc = new this.DocumentModel({
      ...document,
      _id: document._id ?? new Types.ObjectId(),
    });

    if (options?.session) {
      doc.$session(options.session);
    }
    return doc;
  }
}
