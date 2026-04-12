import { render, screen, fireEvent } from "@testing-library/react";
import { PromoCard } from "./PromoCard";
import { describe, it, expect, vi } from "vitest";
import { Tables } from "@/integrations/supabase/types";

const mockPromo: Tables<"promos"> = {
  id: "1",
  code: "TEST50",
  title: "50% Discount",
  description: "Get 50% off on all rides",
  discount_type: "percentage",
  discount_value: 50,
  max_discount: 50000,
  min_purchase: 10000,
  quota: 100,
  used_count: 0,
  start_date: "2026-01-01T00:00:00Z",
  end_date: "2026-12-31T23:59:59Z",
  target_service: "ride",
  target_user_segment: "all",
  is_active: true,
  
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("PromoCard", () => {
  it("renders promo title and description", () => {
    render(<PromoCard promo={mockPromo} />);
    expect(screen.getByText("50% Discount")).toBeInTheDocument();
    expect(screen.getByText("Get 50% off on all rides")).toBeInTheDocument();
  });

  it("displays the correct discount badge", () => {
    render(<PromoCard promo={mockPromo} />);
    expect(screen.getByText("50% OFF")).toBeInTheDocument();
  });

  it("displays the promo code", () => {
    render(<PromoCard promo={mockPromo} />);
    expect(screen.getByText("TEST50")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<PromoCard promo={mockPromo} onClick={handleClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledWith(mockPromo);
  });

  it("is accessible via keyboard", () => {
    const handleClick = vi.fn();
    render(<PromoCard promo={mockPromo} onClick={handleClick} />);
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(handleClick).toHaveBeenCalled();
  });
});
