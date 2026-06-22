import { describe, it, expect } from "vitest";
import { Users } from "lucide-react";
import { filterQuickLinks, getDefaultDocsAudience } from "@/lib/docs-content";

describe("getDefaultDocsAudience", () => {
  it("returns staff guide for Staff role", () => {
    expect(getDefaultDocsAudience("Staff")).toBe("staff");
  });

  it("returns admin guide for Admin", () => {
    expect(getDefaultDocsAudience("Admin")).toBe("admin");
  });
});

describe("filterQuickLinks", () => {
  it("filters links by role", () => {
    const links = filterQuickLinks(
      [
        { title: "A", description: "", href: "/a", icon: Users, roles: ["Admin"] },
        { title: "B", description: "", href: "/b", icon: Users },
      ],
      "Staff"
    );
    expect(links).toHaveLength(1);
    expect(links[0].title).toBe("B");
  });
});
