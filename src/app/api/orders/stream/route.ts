import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { decodeSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let interval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendPulse = () => {
        controller.enqueue(encoder.encode(`data: {"ts":${Date.now()}}\n\n`));
      };

      sendPulse();
      interval = setInterval(sendPulse, 10_000);

      request.signal.addEventListener("abort", () => {
        if (interval) clearInterval(interval);
      });
    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
