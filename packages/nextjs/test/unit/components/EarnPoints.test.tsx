import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EarnPoints } from "~~/app/libs/[id]/EarnPoints";

const base = { lastAward: null, pointsThisVisit: 0, newBooksThisVisit: 0, multiplierAfter: 3 };

describe("EarnPoints", () => {
  it("starts at zero before any scans", () => {
    render(<EarnPoints {...base} />);
    expect(screen.getByText("Points This Session").nextSibling).toHaveTextContent("0");
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows the points the server awarded for a new book", () => {
    render(<EarnPoints {...base} lastAward={{ kind: "new", points: 10 }} pointsThisVisit={25} newBooksThisVisit={4} />);
    expect(screen.getByText("New Book Points").nextSibling).toHaveTextContent("10");
    expect(screen.getByText("Points This Session").nextSibling).toHaveTextContent("25");
  });

  it("shows the recency bonus the server awarded", () => {
    render(<EarnPoints {...base} lastAward={{ kind: "recency", points: 3 }} pointsThisVisit={3} />);
    expect(screen.getByText("Book Recency Bonus").nextSibling).toHaveTextContent("3");
    expect(screen.queryByText("New Book Points")).not.toBeInTheDocument();
  });

  it("hides awards of zero points", () => {
    render(<EarnPoints {...base} lastAward={{ kind: "recency", points: 0 }} />);
    expect(screen.queryByText("Book Recency Bonus")).not.toBeInTheDocument();
  });

  it("fills the multiplier, then announces double points", () => {
    const { rerender } = render(<EarnPoints {...base} newBooksThisVisit={2} />);
    expect(screen.getByText("66%")).toBeInTheDocument();

    rerender(<EarnPoints {...base} newBooksThisVisit={3} />);
    expect(screen.getByText("Double points for new books")).toBeInTheDocument();
    expect(screen.queryByText("Level 1 Multiplier")).not.toBeInTheDocument();
  });
});
