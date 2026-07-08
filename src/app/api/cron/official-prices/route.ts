import { enqueueOfficialPriceCollectionJob, officialModeFromRequest } from "@/lib/official-price-jobs";
import { cronMethodNotAllowed } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return cronMethodNotAllowed("创建官方地区价采集任务");
}

export async function POST(request: Request) {
  return enqueueOfficialPriceCollectionJob(request, officialModeFromRequest(request));
}
