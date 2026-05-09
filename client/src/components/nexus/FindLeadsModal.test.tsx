import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const generateLeadsServerMock = vi.fn();
const getEntitlementUsageMock = vi.fn();

vi.mock("@/lib/skerryApi", () => ({
  generateLeadsServer: (...args: unknown[]) => generateLeadsServerMock(...args),
  getEntitlementUsage: (...args: unknown[]) => getEntitlementUsageMock(...args),
}));

// Stub the research store so startResearch resolves immediately and skips
// the animated step pipeline.
vi.mock("@/store/researchStore", async () => {
  const actual = await vi.importActual<typeof import("@/store/researchStore")>(
    "@/store/researchStore"
  );
  let leadsFoundCount = 0;
  const buildState = () => ({
    status: "idle" as const,
    steps: [] as unknown[],
    leadsFoundCount,
    startResearch: async () => {},
    reset: () => {},
    setLeadsFoundCount: (n: number) => {
      leadsFoundCount = n;
    },
  });
  const useResearchStore = ((selector?: (s: unknown) => unknown) => {
    const state = buildState();
    return selector ? selector(state) : state;
  }) as unknown as typeof actual.useResearchStore;
  (useResearchStore as unknown as { getState: () => unknown }).getState = () =>
    buildState();
  (
    useResearchStore as unknown as { setState: (...args: unknown[]) => void }
  ).setState = () => {};
  return { ...actual, useResearchStore };
});

import { FindLeadsModal } from "./FindLeadsModal";
import { useAccountTierStore } from "@/store/accountTierStore";
import { useUsageStore } from "@/store/usageStore";

describe("FindLeadsModal", () => {
  beforeEach(() => {
    generateLeadsServerMock.mockReset();
    getEntitlementUsageMock.mockReset().mockResolvedValue({
      ok: true,
      tier: "solo",
      runsUsed: 0,
      monthlyRuns: 50,
    });
    useAccountTierStore.setState({ tier: "solo" });
    useUsageStore.getState().resetAllUsage();
  });

  it("renders the confirm phase with the Start Research CTA", async () => {
    render(<FindLeadsModal open={true} onClose={() => {}} />);

    expect(await screen.findByText(/Find New Leads/i)).toBeInTheDocument();
    expect(screen.getByTestId("usage-display")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start research/i })
    ).toBeEnabled();
  });

  it("triggers lead generation on Start Research click", async () => {
    const user = userEvent.setup();
    generateLeadsServerMock.mockResolvedValue({
      ok: true,
      source: "synthesizer",
      leads: [
        {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@x.test",
          title: "VP",
          linkedin: "",
          organization: { name: "Org", website: "https://x.test" },
          websiteContext: "",
          personContext: "",
          uniqueAngles: [],
        },
      ],
      tier: "solo",
      runsUsed: 1,
    });

    render(<FindLeadsModal open={true} onClose={() => {}} />);

    await user.click(
      await screen.findByRole("button", { name: /start research/i })
    );

    await waitFor(() => {
      expect(generateLeadsServerMock).toHaveBeenCalledTimes(1);
    });
    const [callArg] = generateLeadsServerMock.mock.calls[0];
    expect(callArg).toMatchObject({ requestedLeads: expect.any(Number) });
  });
});
