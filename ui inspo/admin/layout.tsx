import Link from "next/link";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireRole(["admin", "superadmin", "moderator", "finance", "support"]);
  if (!auth.ok) redirect("/app");
  return (
    <div className="space-y-6">
      <header className="space-y-2 border-b border-border-low pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight">Moderation & operations</h1>
        <p className="max-w-2xl text-sm text-muted">
          Review submissions, manage users (admins), and inspect audit history. Withdrawals stay under
          Finance / Admin workflows.
        </p>
        <nav className="flex flex-wrap gap-2 pt-2">
          <Link
            href="/admin"
            className="rounded-full border border-border-low bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-cream/60"
          >
            Operations
          </Link>
          <Link
            href="/admin/analytics"
            className="rounded-full border border-border-low bg-card px-4 py-2 text-xs font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
          >
            Analytics
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
