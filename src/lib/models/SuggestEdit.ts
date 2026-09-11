import { Schema, model, models, Model } from "mongoose";

export interface SuggestedEditDocument {
  _id: string;
  personId: string;
  submittedByName?: string;
  submittedByEmail?: string;
  note?: string;
  changes: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

export const SuggestedEditSchema = new Schema<SuggestedEditDocument>(
  {
    personId: { type: String, required: true },
    submittedByName: String,
    submittedByEmail: String,
    note: String,
    changes: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const SuggestedEditModel: Model<SuggestedEditDocument> =
  models.SuggestedEdit ??
  model<SuggestedEditDocument>("SuggestedEdit", SuggestedEditSchema);
