import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithTheme, screen, within } from "../../../test/render";

/**
 * Task 8.3 — Dashboard states, KPI rendering, plan gating, and plan badge.
 *
 * The dashboard page (`src/app/dashboard/page.tsx`) derives every value from the
 * Insights_Engine and resolves exactly one view state from the jobs Data_Hook.
 * These tests verify:
 *  - KPI cards render bounded values from the Insights_Engine (Req 6.1).
 *  - Charts and insight lists sourced from the Insights_Engine render in the
 *    ready state (Req 6.3).
 *  - Empty state shows zero-valued stat cards plus empty-state messaging in
 *    place of the charts/lists (Req 6.4).
 *  - Error state shows a load-failure indication and no stale/partial values
 *    (Req 6.5).
 *  - Free_User sees an upsell card; Pro_User does not (Req 6.6).
 *  - The plan badge reflects Free / Pro (Req 6.7).
 *
 * react-chartjs-2 renders to a <canvas> jsdom cannot exercise, so we mock it and
 * expose simple test markers. useJobs / useUserPlan are mocked so we can drive
 * each view state and plan deterministically. next/navigation is stubbed because
 * the page and its children use next/link.
 */

const { jobsState, planState, fetchJobs } = vi.hoisted(() => ({
  jobsState: {
    value: {
      jobs: [] as Array<Record<string, unknown>>,
      loading: false as boolean,
      error: null as string | null,
    },
  },
  planState: {
    value: {
      plan: "free" as "free" | "pro" | null,
      isPro: false as boolean,
      loading: false as boolean,
      customerId: null,
      status: null,
      trialEnd: null,
    },
  },
  fetchJobs: vi.fn(),
}));

vi.mock("../../../hooks/useJobs", () => ({
  useJobs: () => ({
    jobs: jobsState.value.jobs,
    loading: jobsState.value.loading,
    error: jobsState.value.error,
    fetchJobs,
  }),
}));

vi.mock("../../../components/useUserPlan", () => ({
  useUserPlan: () => planState.value,
}));

vi.mock("react-chartjs-2", () => ({
  Line: () => React.createElement("div", { "data-testid": "mock-line" }),
  Doughnut: () => React.createElement("div", { "data-testid": "mock-doughnut" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

import DashboardHome from "./page";

const NOW = new Date().toISOString();

function job(overrides: Record<string, unknown> = {}) {
  return {
    _id: `job-${Math.random().toString(36).slice(2)}`,
    userId: "user-1",
    title: "Software Engineer",
    company: "Acme",
    stage: "applied",
    status: "active",
    dateApplied: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** Read the rendered value div of a StatCard given its label. */
function statCard(label: string) {
  const labelEl = screen.getByText(label);
  const card = labelEl.closest(".surface") as HTMLElement;
  expect(card).not.toBeNull();
  return within(card);
}

beforeEach(() => {
  fetchJobs.mockReset();
  jobsState.value = { jobs: [], loading: false, error: null };
  planState.value = {
    plan: "free",
    isPro: false,
    loading: false,
    customerId: null,
    status: null,
    trialEnd: null,
  };
});

describe("Dashboard ready state — KPIs and Insights_Engine charts/lists (Req 6.1, 6.3)", () => {
  beforeEach(() => {
    // applied, screening, interview, offer (active), accepted (closed).
    // total=5, offers=2, active=4, interviewRate=60%.
    jobsState.value.jobs = [
      job({ title: "Applied Role", stage: "applied", status: "active" }),
      job({ title: "Screening Role", stage: "screening", status: "active" }),
      job({ title: "Interview Role", stage: "interview", status: "active" }),
      job({ title: "Offer Role", stage: "offer", status: "active" }),
      job({ title: "Accepted Role", stage: "accepted", status: "closed" }),
    ];
  });

  it("renders four KPI cards with bounded values derived from the Insights_Engine", () => {
    renderWithTheme(<DashboardHome />);

    expect(statCard("Total applications").getByText("5")).toBeInTheDocument();
    // Interview rate is a percentage in 0–100 (here 60%).
    expect(statCard("Interview rate").getByText("60%")).toBeInTheDocument();
    expect(statCard("Offers").getByText("2")).toBeInTheDocument();
    expect(statCard("Active").getByText("4")).toBeInTheDocument();
  });

  it("renders the status-breakdown and applications-over-time charts (Req 6.3)", () => {
    renderWithTheme(<DashboardHome />);

    expect(screen.getByTestId("mock-line")).toBeInTheDocument();
    expect(screen.getByTestId("mock-doughnut")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /applications timeline/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /stage breakdown/i })
    ).toBeInTheDocument();
  });

  it("renders the recent-activity and follow-up lists from the Insights_Engine (Req 6.3)", () => {
    renderWithTheme(<DashboardHome />);

    expect(
      screen.getByRole("heading", { name: /recent activity/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /suggested follow-ups/i })
    ).toBeInTheDocument();
    // Recent activity is populated from jobs with an updatedAt timestamp.
    expect(screen.getByText(/applied role/i)).toBeInTheDocument();
  });
});

describe("Dashboard empty state (Req 6.4)", () => {
  beforeEach(() => {
    jobsState.value = { jobs: [], loading: false, error: null };
  });

  it("shows zero-valued stat cards and empty-state messaging in place of charts/lists", () => {
    renderWithTheme(<DashboardHome />);

    // Zero-valued KPI cards remain visible.
    expect(statCard("Total applications").getByText("0")).toBeInTheDocument();
    expect(statCard("Interview rate").getByText("0%")).toBeInTheDocument();
    expect(statCard("Offers").getByText("0")).toBeInTheDocument();
    expect(statCard("Active").getByText("0")).toBeInTheDocument();

    // Empty-state message stands in for charts + lists.
    expect(
      screen.getByRole("heading", { name: /no applications yet/i })
    ).toBeInTheDocument();

    // No charts rendered in the empty state.
    expect(screen.queryByTestId("mock-line")).toBeNull();
    expect(screen.queryByTestId("mock-doughnut")).toBeNull();
  });
});

describe("Dashboard error state (Req 6.5)", () => {
  beforeEach(() => {
    // Error with no data: must not show stale/partial KPI or chart values.
    jobsState.value = { jobs: [], loading: false, error: "Failed to load jobs" };
  });

  it("shows a load-failure indication with a retry and no stat cards or charts", () => {
    renderWithTheme(<DashboardHome />);

    expect(
      screen.getByRole("heading", { name: /couldn't load your data/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();

    // No KPI cards, charts, or lists are rendered alongside the error.
    expect(screen.queryByText("Total applications")).toBeNull();
    expect(screen.queryByTestId("mock-line")).toBeNull();
    expect(screen.queryByTestId("mock-doughnut")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /recent activity/i })
    ).toBeNull();
  });
});

describe("Dashboard upsell card by plan (Req 6.6)", () => {
  beforeEach(() => {
    jobsState.value.jobs = [job({ title: "Some Role" })];
  });

  it("shows the upsell card for a Free_User", () => {
    planState.value = { ...planState.value, plan: "free", isPro: false };
    renderWithTheme(<DashboardHome />);
    expect(screen.getByText(/unlock trackiq pro/i)).toBeInTheDocument();
  });

  it("does not show the upsell card for a Pro_User", () => {
    planState.value = { ...planState.value, plan: "pro", isPro: true };
    renderWithTheme(<DashboardHome />);
    expect(screen.queryByText(/unlock trackiq pro/i)).toBeNull();
  });
});

describe("Dashboard plan badge (Req 6.7)", () => {
  beforeEach(() => {
    jobsState.value.jobs = [job({ title: "Some Role" })];
  });

  it("reflects the Free plan", () => {
    planState.value = { ...planState.value, plan: "free", isPro: false };
    renderWithTheme(<DashboardHome />);
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("reflects the Pro plan", () => {
    planState.value = { ...planState.value, plan: "pro", isPro: true };
    renderWithTheme(<DashboardHome />);
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });
});
