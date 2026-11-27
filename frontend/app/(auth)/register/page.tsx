import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Create your account</h1>
      <p className="mb-8 mt-2 text-muted">Free access to practice, mock tests and solutions.</p>
      <RegisterForm />
    </>
  );
}
