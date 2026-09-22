import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { accountSession } from "@/lib/auth/session";
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await accountSession();
  if (session.status === "signed_out") redirect("/auth/login?next=/admin");
  if (session.status !== "signed_in" || session.role !== "admin") redirect("/account");
  return <AdminShell>{children}</AdminShell>;
}
