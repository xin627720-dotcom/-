import {
  apiTransitJobTypeFromRequest,
  enqueueApiTransitCollectionJob,
} from "@/lib/api-transit-jobs";
import { cronMethodNotAllowed } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return cronMethodNotAllowed("创建 API 中转采集任务");
}

export async function POST(request: Request) {
  return enqueueApiTransitCollectionJob(request, apiTransitJobTypeFromRequest());
}
