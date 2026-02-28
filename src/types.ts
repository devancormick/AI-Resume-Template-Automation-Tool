import { z } from "zod";

export const ContactSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional()
});

export const WorkHistoryItemSchema = z.object({
  organization: z.string().optional(),
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional()
});

export const ResumeDataSchema = z.object({
  name: z.string(),
  location: z.string(),
  discipline: z.string(),
  contact: ContactSchema.optional(),
  workHistory: z.array(WorkHistoryItemSchema).default([]),
  certifications: z.array(z.string()).default([]),
  licenses: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([])
});

export type ResumeData = z.infer<typeof ResumeDataSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type WorkHistoryItem = z.infer<typeof WorkHistoryItemSchema>;

