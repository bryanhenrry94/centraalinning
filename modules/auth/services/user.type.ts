import { z } from "zod";

import { UserResponseSchema, UserSchema } from "./user.validators";

export type UserInput = z.infer<typeof UserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
