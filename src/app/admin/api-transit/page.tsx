import { cookies } from "next/headers";
import { ApiTransitAdminConsole } from "@/components/ApiTransitAdminConsole";
import { getApiTransitAdminData, getEmptyApiTransitAdminData } from "@/lib/api-transit-admin";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminApiTransitPage() {
  const cookieStore = await cookies();
  const isAuthenticated = await verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const data = isAuthenticated
    ? await getApiTransitAdminData({ isAuthenticated: true })
    : getEmptyApiTransitAdminData(false);

  return <ApiTransitAdminConsole data={data} />;
}
