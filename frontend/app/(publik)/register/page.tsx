import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Daftar Akun" };

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "admin" || user.role === "super_admin" ? "/admin" : "/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-4 py-12 sm:py-16">
      <RegisterForm />
    </div>
  );
}
