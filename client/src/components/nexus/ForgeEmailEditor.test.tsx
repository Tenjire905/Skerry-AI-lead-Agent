import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgeEmailEditor } from "./ForgeEmailEditor";
import { makeLead } from "@/test/factories";
import { useLeadStore } from "@/store/leadStore";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("ForgeEmailEditor", () => {
  beforeEach(() => {
    useLeadStore.setState({ leads: [], selectedId: "" });
  });

  it("renders the email body in preview mode by default", () => {
    const lead = makeLead();
    render(<ForgeEmailEditor lead={lead} onPush={vi.fn()} />);

    expect(screen.getByTestId("forge-email-editor")).toBeInTheDocument();
    expect(screen.getByTestId("forge-email-preview")).toHaveTextContent(
      "Hello Ada"
    );
    expect(
      screen.queryByTestId("forge-email-textarea")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("forge-edit-toggle")).toHaveTextContent("Edit");
  });

  it("edits the body and persists via the store on Done, then pushes", async () => {
    const user = userEvent.setup();
    const lead = makeLead();
    useLeadStore.setState({ leads: [lead], selectedId: lead.id });
    const onPush = vi.fn();

    render(<ForgeEmailEditor lead={lead} onPush={onPush} pushDelayMs={0} />);

    // Enter edit mode.
    await user.click(screen.getByTestId("forge-edit-toggle"));
    const textarea = screen.getByTestId(
      "forge-email-textarea"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain("Hello Ada");

    await user.clear(textarea);
    await user.type(textarea, "Updated body");

    // Done → persists to store.
    await user.click(screen.getByTestId("forge-edit-toggle"));
    expect(useLeadStore.getState().leads[0]?.newsletter.body).toBe(
      "Updated body"
    );

    // Push → onPush fires after the simulated send.
    await user.click(screen.getByTestId("forge-push-button"));
    expect(onPush).toHaveBeenCalledTimes(1);
  });
});
