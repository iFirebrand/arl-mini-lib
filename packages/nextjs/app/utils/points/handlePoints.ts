// import { PointAction } from "../../types/points";

// You'll need to create this type

export const handlePoints = async (
  address: string | undefined,
  points: number,
  actionType: string,
  addPoints: (points: number, action: string) => void,
  setBankedPointsTotal: (total: number) => void,
) => {
  try {
    if (!address) {
      addPoints(points, actionType);

      return;
    }

    addPoints(-points, actionType);

    const pointAction = {
      points,
      type: actionType,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch("/api/points", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress: address,
        pointActions: [pointAction],
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`Points added successfully. New total: ${data.currentTotal}`);
      setBankedPointsTotal(data.currentTotal);
    } else {
      console.error("Failed to add points:", data.error);
    }
  } catch (error) {
    console.error("Error adding points:", error);
  }
};
