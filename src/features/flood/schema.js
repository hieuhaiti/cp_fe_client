// @ts-check
import { z } from 'zod';

export const scenarioTypeSchema = z.enum(['hien_trang', 'cai_tao', 'quy_hoach']);
export const rcpOptionSchema = z.enum(['rcp45', 'rcp85']);

export const floodScenarioSchema = z.object({
  id: z.union([z.string(), z.number()]),
  code: z.string(),
  name_vi: z.string(),
  type: scenarioTypeSchema.optional(),
  rcp: rcpOptionSchema.optional(),
  min_rainfall: z.union([z.number(), z.string(), z.null()]).optional(),
  max_rainfall: z.union([z.number(), z.string(), z.null()]).optional(),
  min_tide: z.union([z.number(), z.string(), z.null()]).optional(),
  max_tide: z.union([z.number(), z.string(), z.null()]).optional(),
  layer_code: z.string(),
  is_active: z.boolean().optional(),
  layer: z.record(z.string(), z.unknown()).nullable().optional(),
});
