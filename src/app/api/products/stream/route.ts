import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const encoder = new TextEncoder();
  let interval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendPulse = () => {
        controller.enqueue(encoder.encode(`data: {"ts":${Date.now()}}\n\n`));
      };

      sendPulse();
      interval = setInterval(sendPulse, 3500);

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
