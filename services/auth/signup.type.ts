import { z } from "zod";
import { SignUpSchema } from "./signup.validators";

export type SignUpInput = z.infer<typeof SignUpSchema>;
