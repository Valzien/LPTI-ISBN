import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "admin" || user.role === "super_admin" ? "/admin" : "/dashboard");
  }

  const { redirect: redirectTarget } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16 sm:py-24">
      <LoginForm redirectTo={redirectTarget} />
    </div>
  );
}
