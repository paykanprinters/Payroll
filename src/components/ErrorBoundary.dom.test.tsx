import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/render";
import ErrorBoundary from "@/components/ErrorBoundary";

const showError = vi.fn();
const recordSystemError = vi.fn().mockResolvedValue(undefined);

vi.mock("@/utils/toast", () => ({
  showError: (msg: string) => showError(msg),
}));

vi.mock("@/lib/audit-trail", () => ({
  recordSystemError: (...args: unknown[]) => recordSystemError(...args),
}));

/** Test component that throws on demand so we can exercise the boundary. */
function Bomb({ explode }: { explode: boolean }): React.ReactElement {
  if (explode) {
    throw new Error("Kaboom");
  }
  return <div>All good</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    showError.mockClear();
    recordSystemError.mockClear();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("renders the fallback UI and reports the error when a child throws", () => {
    // Suppress React's expected error console noise for this test.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallbackTitle="Payroll section failed">
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Payroll section failed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
    expect(showError).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
    );
    expect(recordSystemError).toHaveBeenCalledWith(
      "Kaboom",
      expect.objectContaining({ boundary: "Payroll section failed" }),
    );

    consoleSpy.mockRestore();
  });

  it("uses the default title when none is provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText("An error occurred")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("calls onReset and re-renders children after Try Again is clicked", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onReset = vi.fn();

    function Recoverable() {
      // After reset, the boundary re-renders children; render a safe child the
      // second time by toggling a module-level flag.
      return <Bomb explode={!recovered.value} />;
    }
    const recovered = { value: false };

    render(
      <ErrorBoundary onReset={onReset}>
        <Recoverable />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();

    // Make the child stop throwing, then click Try Again.
    recovered.value = true;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText("All good")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
