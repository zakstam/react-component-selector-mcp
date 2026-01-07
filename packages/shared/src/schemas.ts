import { z } from 'zod';

export const ComponentTypeSchema = z.enum(['function', 'class', 'forwardRef', 'memo']);

export const ComponentInfoSchema = z.object({
  name: z.string(),
  type: ComponentTypeSchema,
});

export const SourceLocationSchema = z.object({
  filePath: z.string().nullable(),
  lineNumber: z.number().nullable(),
  columnNumber: z.number().nullable(),
});

export const BoundingRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
});

export const DOMInfoSchema = z.object({
  tagName: z.string(),
  className: z.string().nullable(),
  boundingRect: BoundingRectSchema,
});

export const SelectionContextSchema = z.object({
  pageUrl: z.string(),
  parentComponents: z.array(z.string()),
});

export const SelectionDataSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  component: ComponentInfoSchema,
  source: SourceLocationSchema,
  props: z.record(z.unknown()),
  state: z.record(z.unknown()).nullable(),
  dom: DOMInfoSchema,
  context: SelectionContextSchema,
});

export type SelectionDataInput = z.infer<typeof SelectionDataSchema>;
