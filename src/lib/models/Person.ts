import { Schema, model, models, Model } from "mongoose";
import type { Gender } from "@/types/person";

export interface PersonDocument {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  hindiName?: string;
  maidenName?: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  photoUrl?: string;
  bio?: string;
  parentIds: string[];
  spouseIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const PersonSchema = new Schema<PersonDocument>(
  {
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    hindiName: { type: String, trim: true },
    maidenName: { type: String, trim: true },
    gender: {
      type: String,
      enum: ["male", "female", "other", "unknown"],
      required: true,
    },
    birthDate: String,
    deathDate: String,
    birthPlace: String,
    deathPlace: String,
    photoUrl: String,
    bio: String,
    parentIds: { type: [String], default: [] },
    spouseIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Text index powers the search endpoint.
PersonSchema.index({
  firstName: "text",
  middleName: "text",
  lastName: "text",
  hindiName: "text",
  maidenName: "text",
  birthPlace: "text",
  deathPlace: "text",
});

// `models.Person` check avoids Next.js hot-reload re-registering the model.
export const PersonModel: Model<PersonDocument> =
  models.Person ?? model<PersonDocument>("Person", PersonSchema);
