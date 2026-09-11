import { Schema, model, models, Model } from "mongoose";

export interface ContactMessageDocument {
  _id: string;
  name: string;
  email: string;
  message: string;
  status: "new" | "read";
  createdAt: Date;
  updatedAt: Date;
}

export const ContactMessageSchema = new Schema<ContactMessageDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["new", "read"], default: "new" },
  },
  { timestamps: true },
);

export const ContactMessageModel: Model<ContactMessageDocument> =
  models.ContactMessage ??
  model<ContactMessageDocument>("ContactMessage", ContactMessageSchema);
