import { NextResponse } from "next/server";

export interface RequestValidationResult {
  allowed: boolean;
  response?: NextResponse;
}

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/**
 * Extracts the hostname from a Host header, properly handling IPv6 bracket notation
 * such as `[::1]:3000` as well as standard `localhost:3000` and `127.0.0.1:3000`.
 */
function extractHostName(hostHeader: string): string {
  const trimmed = hostHeader.trim().toLowerCase();
  if (!trimmed) return "";

  if (trimmed.startsWith("[")) {
    const closeBracket = trimmed.indexOf("]");
    if (closeBracket !== -1) {
      return trimmed.slice(0, closeBracket + 1);
    }
    return trimmed;
  }

  // Plain IPv6 without port (e.g. "::1")
  if (trimmed === "::1") return "::1";

  return trimmed.split(":")[0];
}

/**
 * Validates that an incoming HTTP request originated locally and prevents cross-site
 * request forgery (CSRF) and DNS rebinding attacks on the local workstation.
 */
export function validateLocalRequest(request: Request): RequestValidationResult {
  const host = request.headers.get("host") || "";
  const hostName = extractHostName(host);

  // 1. Host header validation (DNS Rebinding protection)
  if (!LOCAL_HOSTS.has(hostName)) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Forbidden: AETHER only accepts connections from localhost/127.0.0.1/[::1]." },
        { status: 403 }
      ),
    };
  }

  // 2. Fetch metadata validation
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite.toLowerCase() === "cross-site") {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Forbidden: Cross-site requests are strictly prohibited." },
        { status: 403 }
      ),
    };
  }

  // 3. Block simple CORS CSRF payloads (e.g. text/plain, form-urlencoded) on mutating methods
  const method = (request.method || "GET").toUpperCase();
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    const contentType = (request.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("application/json")) {
      return {
        allowed: false,
        response: NextResponse.json(
          { error: "Forbidden: State-changing requests must use Content-Type: application/json." },
          { status: 403 }
        ),
      };
    }
  }

  // 4. Origin header check for state-changing requests
  const origin = request.headers.get("origin");
  if (origin) {
    if (origin.toLowerCase() === "null") {
      return {
        allowed: false,
        response: NextResponse.json(
          { error: "Forbidden: Sandboxed or null origins are blocked." },
          { status: 403 }
        ),
      };
    }
    try {
      const url = new URL(origin);
      const originHost = url.hostname.toLowerCase();
      if (!LOCAL_HOSTS.has(originHost)) {
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
