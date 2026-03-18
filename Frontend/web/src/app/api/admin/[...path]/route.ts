// src/app/api/admin/[...path]/route.ts
// Proxies all /api/admin/* calls to the backend, injecting the JWT from the client
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6000";

async function proxyRequest(req: NextRequest, params: { path: string[] }) {
  const pathSegments = params.path.join("/");
  const backendUrl = `${BACKEND_URL}/admin/${pathSegments}`;

  const authHeader = req.headers.get("authorization") || "";
  const contentType = req.headers.get("content-type") || "application/json";

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  const backendRes = await fetch(backendUrl, {
    method: req.method,
    headers: {
      "Content-Type": contentType,
      Authorization: authHeader,
    },
    body,
  });

  const data = await backendRes.json();
  return NextResponse.json(data, { status: backendRes.status });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params);
}
