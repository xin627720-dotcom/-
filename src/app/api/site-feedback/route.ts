import { z } from "zod";
import { createSiteFeedback } from "@/lib/admin";
import {
  checkPublicWriteRateLimit,
  getPublicClientFingerprint,
  getPublicRequestErrorStatus,
  readJsonWithLimit,
} from "@/lib/public-request";

const typeSchema = z.enum(["feature", "data", "ux", "channel", "bug", "other"]);
const PUBLIC_SITE_FEEDBACK_RATE_LIMIT_PER_HOUR = 20;

const schema = z.object({
  type: typeSchema,
  message: z.string().trim().min(3).max(1000),
  contact: z.string().trim().max(200).nullable().optional(),
  pageUrl: z.string().url().max(2048).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
});

function getErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return "反馈内容格式不正确。";
  if (error instanceof Error) return error.message;
  return "反馈提交失败。";
}

function getErrorStatus(error: unknown, message: string): number {
  const publicRequestStatus = getPublicRequestErrorStatus(error);
  if (publicRequestStatus) return publicRequestStatus;
  if (error instanceof z.ZodError) return 400;
  if (message.includes("刚刚提交过")) return 409;
  if (message.includes("反馈过于频繁")) return 429;
  return 500;
}

export async function POST(request: Request) {
  try {
    const submitterIp = getPublicClientFingerprint(request);
    checkPublicWriteRateLimit({
      scope: "site-feedback",
      key: submitterIp,
      limit: PUBLIC_SITE_FEEDBACK_RATE_LIMIT_PER_HOUR,
    });

    const payload = schema.parse(await readJsonWithLimit(request));

    if (payload.website) {
      return Response.json({ ok: true });
    }

    const result = await createSiteFeedback({
      type: payload.type,
      message: payload.message,
      contact: payload.contact || null,
      pageUrl: payload.pageUrl || null,
      submitterIp,
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = getErrorMessage(error);
    return Response.json({ ok: false, message }, { status: getErrorStatus(error, message) });
  }
}
