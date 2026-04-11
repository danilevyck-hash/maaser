import { describe, it, expect, vi } from "vitest";

// Mock supabase before importing the route
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => ({
            limit: () => ({
              single: () => Promise.resolve({ data: { receipt_number: 100 } }),
            }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { message: "mock" } }),
        }),
      }),
    }),
  },
}));

describe("Donations API", () => {
  it("returns error when amount is missing", async () => {
    const { POST } = await import("@/app/api/donations/route");

    const request = new Request("http://localhost/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beneficiary: "Test", date: "2026-01-01" }),
    });

    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns error when amount is zero", async () => {
    const { POST } = await import("@/app/api/donations/route");

    const request = new Request("http://localhost/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beneficiary: "Test", date: "2026-01-01", amount: 0 }),
    });

    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
