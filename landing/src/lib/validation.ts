import { z } from "zod";

export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .max(254, "Email is too long."),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  referrer: z.string().max(2000).optional(),
  // Honeypot — must be empty. Bots tend to fill every field.
  company_website: z.string().max(0).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export const checkoutSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
