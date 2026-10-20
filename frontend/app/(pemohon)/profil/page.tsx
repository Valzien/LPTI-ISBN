import { ProfileForm } from "@/components/auth/profile-form";
import { requireAuth } from "@/lib/auth";

export const metadata = { title: "Profil Saya" };

/**
 * Profil milik sesi yang sedang login.
 * Guard: wajib login (role apa pun; pemohon → via /profil, admin juga boleh).
 */
export default async function ProfilSayaPage() {
  const user = await requireAuth("/profil");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Profil Saya
        </h1>
        <p className="text-sm text-muted-foreground">
          Data diri akun yang tercantum pada setiap pengajuan.
        </p>
      </header>

      <ProfileForm user={user} />
    </div>
  );
}
