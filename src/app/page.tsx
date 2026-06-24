import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  if (!isAuthed()) redirect("/login");
  return <Dashboard />;
}
