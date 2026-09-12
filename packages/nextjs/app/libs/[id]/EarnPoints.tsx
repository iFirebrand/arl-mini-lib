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

  return (
    <div>
      <div className="stats stats-vertical shadow">
        <div className="stat">
          <div className="stat-title">Points This Session</div>
          <div className="stat-value">{pointsThisVisit}</div>
          <div className="stat-desc">Points & Bonuses appear here</div>
        </div>
      </div>
      <div className="stats stats-vertical shadow">
        {lastAward?.kind === "new" && lastAward.points > 0 && (
          <div className="stat">
            <div className="stat-title">New Book Points</div>
            <div className="stat-value">{lastAward.points}</div>
            <div className="stat-desc">First scan at library pays big</div>
          </div>
        )}

        {lastAward?.kind === "recency" && lastAward.points > 0 && (
          <div className="stat">
            <div className="stat-title">Book Recency Bonus</div>
            <div className="stat-value">{lastAward.points}</div>
            <div className="stat-desc">More points for stale books</div>
          </div>
        )}
      </div>
      <div className="font-bold">
        {doublePointsActive ? (
          <div>Double points for new books</div>
        ) : (
          <>
            <div>Level 1 Multiplier</div>
            <div
              className="radial-progress"
              style={{ "--value": multiplierPercentage } as React.CSSProperties}
              role="progressbar"
            >
              <span className="font-bold">{multiplierPercentage}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
