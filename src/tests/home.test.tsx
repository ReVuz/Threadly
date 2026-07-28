import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "../pages/HomePage";
import { QueueProvider } from "../context/QueueContext";
import { WardrobeProvider } from "../context/WardrobeContext";

describe("HomePage", () => {
  it("renders a greeting heading", () => {
    render(
      <MemoryRouter>
        <WardrobeProvider>
          <QueueProvider>
            <HomePage />
          </QueueProvider>
        </WardrobeProvider>
      </MemoryRouter>
    );
    // The heading should be visible
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent?.length).toBeGreaterThan(0);
  });
});
