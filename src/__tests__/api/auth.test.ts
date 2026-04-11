import { describe, it, expect } from "vitest";

describe("Auth API", () => {
  it("returns error when password is missing", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns error when password is wrong (500 if APP_PASSWORD not set, 401 if set)", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "9999" }),
    });

    const response = await POST(request as never);
    // Without APP_PASSWORD env var, returns 500; with it, returns 401
    expect([401, 500]).toContain(response.status);
  });
});
