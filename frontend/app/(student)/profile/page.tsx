import { redirect } from "next/navigation";

// Old URL: settings now live in My Account.
export default function ProfilePage() {
  redirect("/account");
}
