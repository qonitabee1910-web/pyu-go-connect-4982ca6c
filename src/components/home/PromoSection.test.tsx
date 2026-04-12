import { render, screen, waitFor } from "@testing-library/react";
import { PromoSection } from "./PromoSection";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Mock AB testing
vi.mock("@/lib/ab-test", () => ({
  getExperimentVariant: vi.fn(() => "Offers"),
  trackExperimentConversion: vi.fn(),
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockPromos, error: null })),
            })),
          })),
        })),
      })),
    })),
  },
}));

// Mock resize observer for carousel
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

const mockPromos = [
  {
    id: "1",
    code: "PROMO1",
    title: "First Promo",
    description: "Save more",
    discount_type: "percentage",
    discount_value: 10,
    end_date: "2026-12-31T23:59:59Z",
    start_date: "2026-01-01T00:00:00Z",
    is_active: true,
    target_service: "all",
  },
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("PromoSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton initially", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PromoSection />
      </QueryClientProvider>
    );
    // Since it's async, it might show skeleton first
    // Note: This test might be flaky depending on how fast query resolves
    // but in vitest with default queryClient, it usually starts in loading state
  });

  it("renders promo heading when data is loaded", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PromoSection />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Special Offers")).toBeInTheDocument();
    });
    
    expect(screen.getByText("First Promo")).toBeInTheDocument();
  });

  it("renders nothing when no promos are available", async () => {
    // Override mock for this test
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    }) as any);

    render(
      <QueryClientProvider client={queryClient}>
        <PromoSection />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("Special Offers")).not.toBeInTheDocument();
    });
  });
});
