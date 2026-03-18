// src/app/api/admin/stream/route.ts
import { NextRequest } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6000";

// Force Next.js to treat this as a streaming Edge function without buffering
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Browser EventSource cannot send headers, so we extract token from query and convert to Header
  const token = req.nextUrl.searchParams.get("token") || "";
  
  const backendRes = await fetch(`${BACKEND_URL}/admin/stream`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return new Response(backendRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
