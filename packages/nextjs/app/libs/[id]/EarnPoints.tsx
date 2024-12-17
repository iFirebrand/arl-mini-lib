export function EarnPoints({
  failedAttempts,
  failedAttemptsBonusThreshold,
}: {
  failedAttempts: number;
  failedAttemptsBonusThreshold: number;
}) {
  const bonusPercentage = (failedAttempts / failedAttemptsBonusThreshold) * 100;

  return (
    <div>
      <div className="font-bold" key={1}>
        <div>Persistence bonus</div>
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
