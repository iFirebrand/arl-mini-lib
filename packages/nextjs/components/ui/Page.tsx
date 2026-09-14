import React from "react";

// Shared page layout: a centered column with side gutters, and a consistent page title block.

export const Container = ({
  children,
  className = "",
  width = "wide",
}: {
  children: React.ReactNode;
  className?: string;
  width?: "wide" | "narrow";
}) => (
  <div className={`mx-auto w-full px-4 sm:px-6 ${width === "wide" ? "max-w-6xl" : "max-w-3xl"} ${className}`}>
    {children}
  </div>
);

export const PageHeader = ({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:py-10">
    <div className="flex max-w-2xl flex-col gap-2">
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-link">{eyebrow}</p>}
      <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl sm:leading-10">{title}</h1>
      {children && <div className="text-base text-base-content/75 sm:text-lg">{children}</div>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-box border border-base-300/70 bg-base-100 shadow-card ${className}`}>{children}</div>
);
