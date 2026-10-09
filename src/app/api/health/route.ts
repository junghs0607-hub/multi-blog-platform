import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "DOMINO X Asset Platform",
    version: "2.5.0",
    timestamp: new Date().toISOString(),
  });
}
