import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/render";
import { Button, buttonVariants } from "@/components/ui/button";

describe("Button", () => {
  it("renders a native button with its label", () => {
    render(<Button>Save payslip</Button>);
    const btn = screen.getByRole("button", { name: "Save payslip" });
    expect(btn.tagName).toBe("BUTTON");
  });

  it("fires onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run payroll</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Run payroll" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Disabled" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies variant and size classes", () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("bg-destructive");
    expect(btn.className).toContain("h-9");
  });

  it("renders as a child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/staff">Go to staff portal</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Go to staff portal" });
    expect(link.tagName).toBe("A");
    // The button styling is forwarded onto the anchor.
    expect(link.className).toContain("inline-flex");
  });

  it("buttonVariants generates a class string for the given variant", () => {
    expect(buttonVariants({ variant: "outline" })).toContain("border");
  });
});
