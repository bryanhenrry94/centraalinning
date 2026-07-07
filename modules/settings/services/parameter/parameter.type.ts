import { z } from "zod";
import { ParameterSchema } from "./parameter.validators";

export type ParameterInput = z.infer<typeof ParameterSchema>;