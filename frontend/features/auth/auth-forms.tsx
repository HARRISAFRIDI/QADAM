"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { api, errorMessage } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";

function safeNext(raw: string | null, fallback: string) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const { user } = await api<{ user: Me }>("/auth/login", {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password") },
      });
      router.replace(safeNext(params.get("next"), user.role === "admin" ? "/admin" : "/dashboard"));
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert>{error}</Alert>}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Log in
      </Button>
      <p className="text-center text-sm text-muted">
        New to QADAM?{" "}
        <Link href="/register" className="font-semibold text-forest-700 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== f.get("confirm")) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api("/auth/register", {
        method: "POST",
        body: {
          full_name: f.get("full_name"),
          email: f.get("email"),
          password,
          phone: f.get("phone") || null,
          city: f.get("city") || null,
          target_exam: f.get("target_exam") || null,
        },
      });
      const exam = f.get("target_exam");
      router.replace(exam ? `/prepare/${String(exam).toLowerCase()}` : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert>{error}</Alert>}
      <Field label="Full name" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" required minLength={2} autoFocus />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" hint="At least 8 characters">
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirm password" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone (optional)" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="03xx xxxxxxx" />
        </Field>
        <Field label="City (optional)" htmlFor="city">
          <Input id="city" name="city" autoComplete="address-level2" />
        </Field>
      </div>
      <Field label="I am preparing for" htmlFor="target_exam">
        <Select id="target_exam" name="target_exam" defaultValue="">
          <option value="">Not sure yet</option>
          <option value="HAT">HAT</option>
          <option value="USAT">USAT</option>
        </Select>
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Create account
      </Button>
      <p className="text-center text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-forest-700 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
