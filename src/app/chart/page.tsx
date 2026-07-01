import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import ChartView from "@/components/ChartView";

export const dynamic = "force-dynamic";

export default function ChartPage() {
  if (!isAuthed()) redirect("/login");
  return <ChartView />;
}
