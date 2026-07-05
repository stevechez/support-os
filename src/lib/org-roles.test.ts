import { describe, expect, it } from "vitest";

import { roleAtLeast } from "./roles";

describe("role hierarchy", () => {
  it("viewer is read-only", () => {
    expect(roleAtLeast("viewer", "viewer")).toBe(true);
    expect(roleAtLeast("viewer", "agent")).toBe(false);
    expect(roleAtLeast("viewer", "admin")).toBe(false);
  });

  it("agent can work tickets but not configure", () => {
    expect(roleAtLeast("agent", "agent")).toBe(true);
    expect(roleAtLeast("agent", "admin")).toBe(false);
  });

  it("admin and owner can configure", () => {
    expect(roleAtLeast("admin", "admin")).toBe(true);
    expect(roleAtLeast("owner", "admin")).toBe(true);
    expect(roleAtLeast("owner", "owner")).toBe(true);
    expect(roleAtLeast("admin", "owner")).toBe(false);
  });

  it("unknown roles are denied everything", () => {
    expect(roleAtLeast("superuser", "viewer")).toBe(false);
  });
});
