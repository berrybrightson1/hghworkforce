import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      heading="Reset your password"
      subheading="We’ll email you a link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
