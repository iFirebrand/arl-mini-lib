export interface Award {
  kind: "new" | "recency";
  points: number;
}

// Shows what the server awarded for the last scan and progress toward double points.
export function EarnPoints({
  lastAward,
  pointsThisVisit,
  newBooksThisVisit,
  multiplierAfter,
}: {
  lastAward: Award | null;
  pointsThisVisit: number;
  newBooksThisVisit: number;
  multiplierAfter: number;
}) {
  const multiplierPercentage = Math.min(100, Math.floor((newBooksThisVisit / multiplierAfter) * 100));
  const doublePointsActive = newBooksThisVisit >= multiplierAfter;

  const tile = "flex flex-col rounded-xl bg-base-200 p-3";
  const label = "text-xs font-medium text-base-content/70";
  const value = "font-display text-3xl font-semibold tabular-nums";
  const note = "text-xs text-base-content/60";

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className={tile}>
          <div className={label}>Points This Session</div>
          <div className={value}>{pointsThisVisit}</div>
          <div className={note}>Points & Bonuses appear here</div>
        </div>

        {lastAward?.kind === "new" && lastAward.points > 0 && (
          <div className={`${tile} bg-flag-yellow/40`}>
            <div className={label}>New Book Points</div>
            <div className={value}>{lastAward.points}</div>
            <div className={note}>First scan at library pays big</div>
          </div>
        )}

        {lastAward?.kind === "recency" && lastAward.points > 0 && (
          <div className={`${tile} bg-flag-yellow/40`}>
            <div className={label}>Book Recency Bonus</div>
            <div className={value}>{lastAward.points}</div>
            <div className={note}>More points for stale books</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-base-300/70 p-3 font-semibold">
        {doublePointsActive ? (
          <div>Double points for new books</div>
        ) : (
          <>
            <div
              className="radial-progress text-link"
              style={
                { "--value": multiplierPercentage, "--size": "3.25rem", "--thickness": "5px" } as React.CSSProperties
              }
              role="progressbar"
              aria-valuenow={multiplierPercentage}
            >
              <span className="text-xs font-bold text-base-content">{multiplierPercentage}%</span>
            </div>
            <div className="flex flex-col">
              <span>Level 1 Multiplier</span>
              <span className="text-xs font-normal text-base-content/65">
                New books after the first {multiplierAfter} this visit earn double
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
