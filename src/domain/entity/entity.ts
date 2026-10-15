import { Types } from 'mongoose';

export abstract class Entity<T> {
  protected readonly _id: Types.ObjectId;
  constructor(id: Types.ObjectId) {
    this._id = id;
  }

  get id() {
    return this._id;
  }

  equals(object?: Entity<T>): boolean {
    if (!(object instanceof Entity)) {
      return false;
    }
    if (this === object) {
      return true;
    }
    return this._id.equals(object._id);
  }
}
