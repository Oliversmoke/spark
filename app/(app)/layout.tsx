import { AuthGate } from "@/components/arc/auth-gate";
import { AppShell } from "@/components/arc/app-shell";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
