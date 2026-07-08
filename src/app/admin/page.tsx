import { cookies } from "next/headers";
import { AdminConsole } from "@/components/AdminConsole";
import { getAdminSummary, getEmptyAdminSummary } from "@/lib/data";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = await verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const data = isAuthenticated
    ? await getAdminSummary({ isAuthenticated: true })
    : getEmptyAdminSummary(false);

  return <AdminConsole data={data} />;
}
