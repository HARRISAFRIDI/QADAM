import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { PasswordForm, ProfileForm } from "@/features/auth/profile-forms";
import { requireUser } from "@/lib/api/server";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const me = await requireUser("/profile");
  return (
    <>
      <PageHeader eyebrow="Account" title="Profile & settings" description={me.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Personal details" />
          <div className="p-5">
            <ProfileForm me={me} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Change password" description="Other devices will be signed out." />
          <div className="p-5">
            <PasswordForm />
          </div>
        </Card>
      </div>
    </>
  );
}
