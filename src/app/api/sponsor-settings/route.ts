import { noStoreCacheHeaders } from "@/lib/cache-headers";
import { getSponsorSettingsSummary } from "@/lib/sponsor-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const settings = await getSponsorSettingsSummary();

  return Response.json(
    { ok: true, settings },
    { headers: noStoreCacheHeaders() },
  );
}
