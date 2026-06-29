// Global test setup. Loaded for every test file (node + jsdom).
// Only register matchers that are safe in a non-DOM (node) environment here;
// jest-dom simply extends `expect`. Component cleanup for jsdom render tests is
// handled in src/test/render.tsx.
import "@testing-library/jest-dom/vitest";
