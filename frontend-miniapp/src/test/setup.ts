/**
 * Vitest setup - mock browser APIs used by @lukso/up-provider
 * to avoid "No UP found" and postMessage errors in tests.
 */
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock postMessage so wallet extension code doesn't run
const mockPostMessage = vi.fn();
Object.defineProperty(window, "postMessage", { value: mockPostMessage, writable: true });

// Ensure we're not in an iframe during tests
Object.defineProperty(window, "self", { value: window, writable: true });
Object.defineProperty(window, "top", { value: window, writable: true });
