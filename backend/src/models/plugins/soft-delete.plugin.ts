import type { Document, Query, Schema } from 'mongoose';

export interface SoftDeleteFields {
  isDeleted: boolean;
  deletedAt: Date | null;
}

export interface SoftDeleteMethods {
  softDelete(): Promise<void>;
}

function excludeDeletedFromQuery(this: Query<unknown, unknown>): void {
  const conditions = this.getQuery() as Record<string, unknown>;
  if (conditions.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
}

export function softDeletePlugin(schema: Schema): void {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  });

  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'countDocuments'], excludeDeletedFromQuery);

  schema.methods.softDelete = async function (this: Document & SoftDeleteFields): Promise<void> {
    this.isDeleted = true;
    this.deletedAt = new Date();
    await this.save();
  };
}
