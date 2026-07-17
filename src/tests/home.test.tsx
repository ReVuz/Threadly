import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "../pages/HomePage";

describe("HomePage", () => {
  it("renders a greeting heading", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    // The heading should be visible (content depends on time of day later)
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
  });
});
