import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UsageDisplay } from "./UsageDisplay";

describe("UsageDisplay", () => {
  it("renders runs and spend, no warning under threshold", () => {
    render(
      <UsageDisplay runsUsed={2} monthlyLimit={10} estimatedSpendUsd={1.234} />
    );

    expect(screen.getByTestId("usage-display-runs")).toHaveTextContent(
      "2 / 10 runs"
    );
    expect(screen.getByTestId("usage-display-spend")).toHaveTextContent(
      "$1.23"
    );
    expect(
      screen.queryByTestId("usage-display-warning")
    ).not.toBeInTheDocument();
  });

  it("shows the warning once usage crosses the warn threshold", () => {
    const { rerender } = render(
      <UsageDisplay runsUsed={5} monthlyLimit={10} warnAtPct={80} />
    );
    expect(
      screen.queryByTestId("usage-display-warning")
    ).not.toBeInTheDocument();

    rerender(<UsageDisplay runsUsed={9} monthlyLimit={10} warnAtPct={80} />);
    const warn = screen.getByTestId("usage-display-warning");
    expect(warn).toBeInTheDocument();
    expect(warn).toHaveAttribute("role", "status");
  });
});
