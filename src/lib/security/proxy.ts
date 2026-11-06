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

  if (trimmed === "::1") return "::1";

  return trimmed.split(":")[0];
}

function isAllowedHost(hostName: string): boolean {
  if (!hostName) return false;
  if (LOCAL_HOSTS.has(hostName)) return true;

  // Allow official Vercel deployments (*.vercel.app)
  if (hostName.endsWith(".vercel.app")) return true;

  // Allow custom configured deployment domains
  const envHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .filter(Boolean)
    .map((val) => {
      const raw = String(val).trim().toLowerCase();
      try {
        return raw.includes("://") ? new URL(raw).hostname.toLowerCase() : extractHostName(raw);
      } catch {
        return extractHostName(raw);
      }
    });

  return envHosts.includes(hostName);
}

/**
 * Validates that an incoming HTTP request originated from localhost or a trusted
 * same-origin Vercel deployment, preventing CSRF and DNS rebinding attacks.
 */
export function validateLocalRequest(request: Request): RequestValidationResult {
  const host = request.headers.get("host") || "";
  const hostName = extractHostName(host);

  // 1. Host header validation (DNS Rebinding & unauthorized host protection)
  if (!isAllowedHost(hostName)) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error:
            "Forbidden: AETHER only accepts connections from localhost/127.0.0.1/[::1] or authorized Vercel deployments.",
        },
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
      const originHost = extractHostName(url.host);
      const isLocalOrigin = LOCAL_HOSTS.has(originHost) && LOCAL_HOSTS.has(hostName);
      const isSameCloudOrigin = originHost === hostName && isAllowedHost(hostName);

      if (!isLocalOrigin && !isSameCloudOrigin) {
        return {
          allowed: false,
          response: NextResponse.json(
            { error: "Forbidden: Cross-origin requests from external sites are blocked." },
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
