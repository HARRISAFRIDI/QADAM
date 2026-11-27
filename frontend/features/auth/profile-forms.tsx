"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { api, errorMessage } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";

export function ProfileForm({ me }: { me: Me }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setMsg(null);
    try {
      await api("/me", {
        method: "PATCH",
        body: { full_name: f.get("full_name"), phone: f.get("phone") ?? "", city: f.get("city") ?? "" },
      });
      setMsg({ ok: true, text: "Profile updated." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
      <Field label="Full name" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={me.full_name} required minLength={2} />
      </Field>
      <Field label="Phone" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" defaultValue={me.phone ?? ""} />
      </Field>
      <Field label="City" htmlFor="city">
        <Input id="city" name="city" defaultValue={me.city ?? ""} />
      </Field>
      <Button type="submit" loading={loading}>
        Save changes
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get("new_password") !== f.get("confirm")) {
      setMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await api("/me/password", {
        method: "POST",
        body: { current_password: f.get("current_password"), new_password: f.get("new_password") },
      });
      form.reset();
      setMsg({ ok: true, text: "Password changed." });
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {msg && <Alert tone={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
      <Field label="Current password" htmlFor="current_password">
        <Input id="current_password" name="current_password" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="new_password" hint="At least 8 characters">
        <Input id="new_password" name="new_password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" loading={loading}>
        Update password
      </Button>
    </form>
  );
}
