export function EarnPoints({
  failedAttempts,
  failedAttemptsBonusThreshold,
  bookRecencyBonus,
  newBookPoints,
  booksScanned,
}: {
  failedAttempts: number;
  failedAttemptsBonusThreshold: number;
  bookRecencyBonus: number;
  newBookPoints: number;
  booksScanned: number;
}) {
  console.log({ failedAttempts, failedAttemptsBonusThreshold, bookRecencyBonus, newBookPoints, booksScanned });

  const bonusPercentage = (failedAttempts / failedAttemptsBonusThreshold) * 100;

  return (
    <div>
      <div className="stats stats-vertical shadow">
        {booksScanned === 0 && (
          <div className="stat">
            <div className="stat-title">Points This Session</div>
            <div className="stat-value">0</div>
            <div className="stat-desc">Points & Bonuses appear here</div>
          </div>
        )}
      </div>
      <div className="stats stats-vertical shadow">
        {bookRecencyBonus > 0 && (
          <div className="stat">
            <div className="stat-title">Book Recency Bonus</div>
            <div className="stat-value">{bookRecencyBonus}</div>
            <div className="stat-desc">More points for stale books</div>
          </div>
        )}

        {failedAttempts === failedAttemptsBonusThreshold && (
          <div className="stat">
            <div className="stat-title">Persistency Bonus</div>
            <div className="stat-value">5</div>
            <div className="stat-desc">For trying again after failures</div>
          </div>
        )}

        {newBookPoints > 0 && (
          <div className="stat">
            <div className="stat-title">New Book Points</div>
            <div className="stat-value">{newBookPoints}</div>
            <div className="stat-desc">First scan at library pays big</div>
          </div>
        )}
      </div>
      <div className="font-bold" key={1}>
        <div>Persistence bonus progress</div>
        <div
          className="radial-progress"
          style={{ "--value": bonusPercentage } as React.CSSProperties}
          role="progressbar"
        >
          <span className="font-bold">{bonusPercentage}%</span>
        </div>
      </div>
    </div>
  );
}
