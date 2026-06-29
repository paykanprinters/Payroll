// Shared helpers for jsdom component tests (*.dom.test.tsx).
// Importing React Testing Library here keeps the global setup file safe to load
// in the node environment used by pure-logic tests.
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
