import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeadCard } from "./LeadCard";
import { makeLead } from "@/test/factories";

describe("LeadCard", () => {
  it("renders core lead identity fields", () => {
    const lead = makeLead();
    render(<LeadCard lead={lead} />);

    expect(screen.getByTestId("lead-card")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("VP Sales")).toBeInTheDocument();
    expect(screen.getByText("Analytical Engines")).toBeInTheDocument();
    expect(screen.getByText("ada@analytical-engines.test")).toBeInTheDocument();
    expect(screen.getByTestId("lead-card-verified")).toBeInTheDocument();
    expect(
      screen.queryByTestId("lead-card-missing-contact")
    ).not.toBeInTheDocument();
  });

  it("flags a missing email and surfaces the lead id when selected", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const lead = makeLead({
      id: "lead-42",
      personal: {
        firstName: "Grace",
        lastName: "Hopper",
        email: undefined,
        title: "CTO",
        linkedin: "https://linkedin.com/in/grace",
      },
    });

    render(<LeadCard lead={lead} onSelect={onSelect} />);

    expect(screen.getByTestId("lead-card-missing-contact")).toBeInTheDocument();

    await user.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("lead-42");
  });
});
