import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  if (!isAuthed()) redirect("/login");
  return <SettingsForm />;
}
