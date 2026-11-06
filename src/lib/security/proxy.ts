import { NextResponse } from "next/server";

export interface RequestValidationResult {
  allowed: boolean;
  response?: NextResponse;
}

/**
 * Validates that an incoming HTTP request originated locally and prevents cross-site
 * request forgery (CSRF) and DNS rebinding attacks on the local workstation.
 */
export function validateLocalRequest(request: Request): RequestValidationResult {
  const host = request.headers.get("host") || "";
  const hostWithoutPort = host.split(":")[0].toLowerCase();

  // 1. Host header validation (DNS Rebinding protection)
  const isLocalHost =
    hostWithoutPort === "127.0.0.1" ||
    hostWithoutPort === "localhost" ||
    hostWithoutPort === "::1" ||
    hostWithoutPort === "[::1]";

  if (!isLocalHost) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Forbidden: AETHER only accepts connections from localhost/127.0.0.1." },
        { status: 403 }
      ),
    };
  }

  // 2. Fetch metadata validation
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite === "cross-site") {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Forbidden: Cross-site requests are strictly prohibited." },
        { status: 403 }
      ),
    };
  }

  // 3. Origin header check for state-changing requests
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      const originHost = url.hostname.toLowerCase();
      const isOriginLocal =
        originHost === "127.0.0.1" ||
        originHost === "localhost" ||
        originHost === "::1" ||
        originHost === "[::1]";

      if (!isOriginLocal) {
        return {
          allowed: false,
          response: NextResponse.json(
            { error: "Forbidden: Cross-origin requests from non-local sites are blocked." },
            { status: 403 }
          ),
        };
      }
    } catch {
      return {
        allowed: false,
        response: NextResponse.json(
          { error: "Forbidden: Malformed origin header." },
          { status: 403 }
        ),
      };
    }
  }

  return { allowed: true };
}
