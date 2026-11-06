import { describe, it, expect } from "vitest";
import { validateLocalRequest } from "../../security/proxy";

describe("Proxy Security - validateLocalRequest", () => {
  it("allows requests from localhost, 127.0.0.1, and IPv6 [::1]:3000", () => {
    const req1 = new Request("http://localhost:3000/api/workspace", {
      headers: { host: "localhost:3000" },
    });
    expect(validateLocalRequest(req1).allowed).toBe(true);

    const req2 = new Request("http://127.0.0.1:3000/api/agent", {
      headers: { host: "127.0.0.1:3000" },
    });
    expect(validateLocalRequest(req2).allowed).toBe(true);

    const req3 = new Request("http://[::1]:3000/api/agent", {
      headers: { host: "[::1]:3000" },
    });
    expect(validateLocalRequest(req3).allowed).toBe(true);
  });

  it("blocks requests with non-local Host headers (DNS rebinding)", () => {
    const req = new Request("http://evil.com/api/workspace", {
      headers: { host: "evil.com" },
    });
    const res = validateLocalRequest(req);
    expect(res.allowed).toBe(false);
    expect(res.response?.status).toBe(403);
  });

  it("blocks cross-site fetch requests", () => {
    const req = new Request("http://localhost:3000/api/workspace", {
      headers: {
        host: "localhost:3000",
        "sec-fetch-site": "cross-site",
      },
    });
    const res = validateLocalRequest(req);
    expect(res.allowed).toBe(false);
    expect(res.response?.status).toBe(403);
  });

  it("blocks simple CORS text/plain POST CSRF attacks", () => {
    const req = new Request("http://localhost:3000/api/workspace", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        "content-type": "text/plain;charset=UTF-8",
      },
      body: '{"action":"apply"}',
    });
    const res = validateLocalRequest(req);
    expect(res.allowed).toBe(false);
    expect(res.response?.status).toBe(403);
  });

  it("blocks cross-origin POST requests from malicious websites and null origins", () => {
    const req = new Request("http://localhost:3000/api/workspace", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://malicious-site.com",
      },
    });
    const res = validateLocalRequest(req);
    expect(res.allowed).toBe(false);
    expect(res.response?.status).toBe(403);

    const nullOriginReq = new Request("http://localhost:3000/api/workspace", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "null",
      },
    });
    expect(validateLocalRequest(nullOriginReq).allowed).toBe(false);
  });

  it("allows same-origin or localhost origin headers with application/json", () => {
    const req = new Request("http://localhost:3000/api/workspace", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
    });
    expect(validateLocalRequest(req).allowed).toBe(true);
  });
});
