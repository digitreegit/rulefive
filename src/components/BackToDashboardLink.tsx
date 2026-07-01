import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

type Props = {
  href?: string;
  label?: string;
};

export default function BackToDashboardLink({
  href = "/",
  label = "Dashboard",
}: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg bg-panel px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-panel2"
    >
      <ArrowLeftIcon className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
