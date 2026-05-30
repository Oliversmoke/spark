import { Suspense } from "react";
import { ShimmerBlock } from "@/components/arc/skeleton-ui";
import AuthForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-bg1">
          <ShimmerBlock className="h-12 w-48 rounded" />
        </main>
      }
    >
      <AuthForm defaultMode="login" />
    </Suspense>
  );
}
