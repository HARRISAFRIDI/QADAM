import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Welcome back</h1>
      <p className="mb-8 mt-2 text-muted">Log in to continue your preparation.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
