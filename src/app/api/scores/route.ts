import { NextResponse } from "next/server";
import { BOARD_SIZE, validateRun } from "../../game/board";
import { addScore, isRateLimited, topScores } from "../../game/scoreStore";

/**
 * The board changes between requests, so it must never be cached or prerendered.
 */
export const dynamic = "force-dynamic";

/** Best-effort client identity; every proxy in front of us may or may not set these. */
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function GET() {
  return NextResponse.json({ entries: await topScores(BOARD_SIZE) });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  }

  const result = validateRun(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (isRateLimited(clientKey(request))) {
    return NextResponse.json({ error: "Too many submissions — try again shortly." }, { status: 429 });
  }

  const { entry, rank, entries } = await addScore(result.run);
  return NextResponse.json({ entry, rank, entries }, { status: 201 });
}
