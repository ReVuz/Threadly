import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "../pages/HomePage";
import { QueueProvider } from "../context/QueueContext";

describe("HomePage", () => {
  it("renders a greeting heading", () => {
    render(
      <MemoryRouter>
        <QueueProvider>
          <HomePage />
        </QueueProvider>
      </MemoryRouter>
    );
    // The heading should be visible
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe("Curate Your Style, Effortlessly.");
  });
});
