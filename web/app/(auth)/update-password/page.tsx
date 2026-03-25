import { AuthLayout } from "@/components/auth/auth-layout";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <AuthLayout
      heading="Set a new password"
      subheading="Use a strong password you don’t reuse on other sites."
    >
      <UpdatePasswordForm />
    </AuthLayout>
  );
}
