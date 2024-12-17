export function EarnPoints({
  failedAttempts,
  failedAttemptsBonusThreshold,
  bookRecencyBonus,
  newBookPoints,
  booksScanned,
  level1MultiplierCount,
  level1MultiplierThreshold,
}: {
  failedAttempts: number;
  failedAttemptsBonusThreshold: number;
  bookRecencyBonus: number;
  newBookPoints: number;
  booksScanned: number;
  level1MultiplierCount: number;
  level1MultiplierThreshold: number;
}) {
  console.log({ failedAttempts, failedAttemptsBonusThreshold, bookRecencyBonus, newBookPoints, booksScanned });

  const bonusPercentage = Math.floor((failedAttempts / failedAttemptsBonusThreshold) * 100);

  const level1MultiplierPercentage = Math.floor((level1MultiplierCount / level1MultiplierThreshold) * 100);

  console.log({ bonusPercentage, level1MultiplierPercentage });

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
            <div className="stat-value">{level1MultiplierPercentage >= 100 ? newBookPoints * 2 : newBookPoints}</div>
            <div className="stat-desc">First scan at library pays big</div>
          </div>
        )}
      </div>
      <div className="font-bold">
        <div>Persistence bonus progress</div>
        <div
          className="radial-progress"
          style={{ "--value": bonusPercentage } as React.CSSProperties}
          role="progressbar"
        >
          <span className="font-bold">{bonusPercentage}%</span>
        </div>
      </div>
      <div className="font-bold">
        {level1MultiplierCount <= level1MultiplierThreshold && (
          <>
            {" "}
            <div>Level 1 Multiplier</div>
            <div
              className="radial-progress"
              style={{ "--value": level1MultiplierPercentage } as React.CSSProperties}
              role="progressbar"
            >
              <span className="font-bold">{level1MultiplierPercentage}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
