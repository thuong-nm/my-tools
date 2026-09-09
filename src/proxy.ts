import { NextResponse, type NextRequest } from "next/server";

import { serverConfig } from "@/lib/config";
import { corsHeaders, corsPreflightHeaders } from "@/lib/http/cors";

// Cross-origin access for the JSON API and nothing else. Deliberately NOT an authorization
// layer: a real check belongs next to the data, in a layout or a route handler.
export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const { allowedOrigins } = serverConfig().cors;

  // Next answers OPTIONS itself when a route does not export it, but a preflight needs these
  // headers on a 2xx or the browser never sends the real request.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsPreflightHeaders(origin, allowedOrigins),
    });
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(corsHeaders(origin, allowedOrigins))) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
