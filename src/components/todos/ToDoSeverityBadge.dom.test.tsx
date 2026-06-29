import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/render";
import {
  ToDoLevelBadge,
  ToDoLevelIcon,
} from "@/components/todos/ToDoSeverityBadge";

describe("ToDoLevelBadge", () => {
  it("renders the Critical badge for a critical level", () => {
    render(<ToDoLevelBadge level="critical" />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("renders the Warning badge for a warning level", () => {
    render(<ToDoLevelBadge level="warning" />);
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("renders the Info badge for an info level", () => {
    render(<ToDoLevelBadge level="info" />);
    expect(screen.getByText("Info")).toBeInTheDocument();
  });

  it("renders nothing for an unknown level", () => {
    const { container } = render(
      // @ts-expect-error intentionally passing an out-of-range level
      <ToDoLevelBadge level="bogus" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ToDoLevelIcon", () => {
  it("renders an svg icon for a known level", () => {
    const { container } = render(<ToDoLevelIcon level="critical" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("class")).toContain("text-red-500");
  });

  it("renders nothing for an unknown level", () => {
    const { container } = render(
      // @ts-expect-error intentionally passing an out-of-range level
      <ToDoLevelIcon level="bogus" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
