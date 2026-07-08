import { listSubmissions } from "@/lib/admin";
import { logApiError, safeApiErrorMessage } from "@/lib/api-errors";
import { requireAdminRequest } from "@/lib/env";
import type { SubmissionStatus } from "@/lib/types";

export async function GET(request: Request) {
  try {
    await requireAdminRequest(request);
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") || "pending") as SubmissionStatus;
    const submissions = await listSubmissions(status);
    return Response.json({ ok: true, submissions });
  } catch (error) {
    logApiError("admin submissions list", error);
    return Response.json(
      { ok: false, message: safeApiErrorMessage(error, "读取失败。") },
      { status: 500 },
    );
  }
}
