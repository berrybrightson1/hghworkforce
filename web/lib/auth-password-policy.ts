import { z } from "zod";

/** Same rules as sign-up — use for new passwords everywhere (sign-up, reset, change). */
export const newPasswordValueSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

export const changePasswordFieldsSchema = z
  .object({
    password: newPasswordValueSchema,
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don’t match",
    path: ["confirm"],
  });

export type ChangePasswordFields = z.infer<typeof changePasswordFieldsSchema>;

/** Logged-in change password: current + new + confirm. */
export const loggedInChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: newPasswordValueSchema,
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don’t match",
    path: ["confirm"],
  });

export type LoggedInChangePasswordFields = z.infer<typeof loggedInChangePasswordSchema>;

/** Forgot password: identify account + verification answer + new password. */
export const resetPasswordVerificationSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    workspaceCountAnswer: z
      .string()
      .min(1, "Enter how many workspaces you see")
      .regex(/^\d+$/, "Use digits only (whole number)")
      .transform((s) => Number.parseInt(s, 10))
      .pipe(z.number().int().min(0).max(500_000)),
    password: newPasswordValueSchema,
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don’t match",
    path: ["confirm"],
  });

/** Parsed output (after transforms) for API / submit handlers. */
export type ResetPasswordVerificationValues = z.output<typeof resetPasswordVerificationSchema>;
/** Form input before zod transforms. */
export type ResetPasswordVerificationFormValues = z.input<typeof resetPasswordVerificationSchema>;
