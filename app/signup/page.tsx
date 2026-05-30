import { Suspense } from "react";
import { ShimmerBlock } from "@/components/arc/skeleton-ui";
import AuthForm from "../login/login-form";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-bg1">
          <ShimmerBlock className="h-12 w-48 rounded" />
        </main>
      }
    >
      <AuthForm defaultMode="signup" />
    </Suspense>
  );
}
