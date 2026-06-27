import AppShell from "@/components/app/AppShell";
import AccountEditForm from "@/components/app/AccountEditForm";
import { requireUser } from "@/lib/session";

export default async function AccountEditPage() {
  const user = await requireUser();

  return (
    <AppShell>
      <div className="px-10 py-5 border-b border-[var(--line)]">
        <h1 className="text-xl font-extrabold tracking-[-.03em] m-0">Editar Perfil</h1>
        <p className="mt-3 text-sm leading-[1.7] text-[var(--muted)]">
          Atualize seu nome de usuário, e-mail e senha da sua conta CachyList.
        </p>
      </div>
      <AccountEditForm username={user.username ?? ""} email={user.email} userId={user.id} />
    </AppShell>
  );
}
