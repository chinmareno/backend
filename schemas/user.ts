import { z } from "zod";

export const CreateUserSchema = z.strictObject({
  user_id: z.uuid("Invalid user ID format"),
  username: z.string().min(1),
  email: z.email(),
});

export const ChangeProfilePictureSchema = z.strictObject({
  profile_picture_url: z.string().min(1, "Profile picture URL is required"),
});
