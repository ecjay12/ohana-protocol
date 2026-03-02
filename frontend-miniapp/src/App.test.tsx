import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

describe("App", () => {
  it("renders miniapp page at /", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /handshake/i })).toBeInTheDocument();
  });

  it("renders add-to-grid page at /add-to-grid", () => {
    render(
      <MemoryRouter initialEntries={["/add-to-grid"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/Add Handshake to your Grid/i)).toBeInTheDocument();
  });
});
