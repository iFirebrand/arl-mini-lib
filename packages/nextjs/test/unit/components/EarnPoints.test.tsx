import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EarnPoints } from "~~/app/libs/[id]/EarnPoints";

const base = {
  failedAttempts: 0,
  failedAttemptsBonusThreshold: 10,
  bookRecencyBonus: 0,
  newBookPoints: 0,
  booksScanned: 0,
  level1MultiplierCount: 0,
  level1MultiplierThreshold: 3,
};

describe("EarnPoints", () => {
  it("shows the empty session state before any scans", () => {
    render(<EarnPoints {...base} />);
    expect(screen.getByText("Points This Session")).toBeInTheDocument();
    expect(screen.getByText("Points & Bonuses appear here")).toBeInTheDocument();
  });

  it("shows new book points", () => {
    render(<EarnPoints {...base} booksScanned={1} newBookPoints={5} level1MultiplierCount={1} />);
    expect(screen.queryByText("Points This Session")).not.toBeInTheDocument();
    expect(screen.getByText("New Book Points").nextSibling).toHaveTextContent("5");
  });

  it("doubles displayed new book points once the level 1 multiplier is full", () => {
    render(<EarnPoints {...base} booksScanned={3} newBookPoints={5} level1MultiplierCount={3} />);
    expect(screen.getByText("New Book Points").nextSibling).toHaveTextContent("10");
  });

  it("shows multiplier progress until the threshold is passed", () => {
    const { rerender } = render(<EarnPoints {...base} level1MultiplierCount={2} />);
    expect(screen.getByText("Level 1 Multiplier")).toBeInTheDocument();
    expect(screen.getByText("66%")).toBeInTheDocument();

    rerender(<EarnPoints {...base} level1MultiplierCount={4} />);
    expect(screen.queryByText("Level 1 Multiplier")).not.toBeInTheDocument();
  });

  it("shows persistence progress and the bonus at 10 failed attempts", () => {
    const { rerender } = render(<EarnPoints {...base} failedAttempts={4} />);
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.queryByText("Persistency Bonus")).not.toBeInTheDocument();

    rerender(<EarnPoints {...base} failedAttempts={10} />);
    expect(screen.getByText("Persistency Bonus")).toBeInTheDocument();
  });

  it("shows the book recency bonus", () => {
    render(<EarnPoints {...base} bookRecencyBonus={3} />);
    expect(screen.getByText("Book Recency Bonus").nextSibling).toHaveTextContent("3");
  });
});
