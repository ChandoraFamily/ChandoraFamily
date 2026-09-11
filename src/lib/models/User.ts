import { Schema, model, models, Model } from "mongoose";

export interface UserDocument {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "admin" | "editor";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  profilePicture?: string;
}

export const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["admin", "editor"], default: "editor" },
    createdBy: { type: String },
    profilePicture: { type: String },
  },
  { timestamps: true },
);

export const UserModel: Model<UserDocument> =
  models.User ?? model<UserDocument>("User", UserSchema);
