import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount } from "wagmi";

interface BankedPointAction {
  type: string;
  points: number;
  timestamp: string;
}

interface BankedPointsContextType {
  bankedPoints: number;
  addBankedPoints: (amount: number, actionType: string) => Promise<void>;
  setBankedPointsTotal: (total: number) => void;
}

export const BankedPointsContext = createContext<BankedPointsContextType | undefined>(undefined);

export function BankedPointsProvider({ children }: { children: React.ReactNode }) {
  const [bankedPoints, setBankedPoints] = useState(0);
  const { address } = useAccount();

  useEffect(() => {
    const loadInitialPoints = async () => {
      if (!address) return;

      try {
        const response = await fetch(`/api/points?walletAddress=${address}`, {
          method: "GET",
        });

        const data = await response.json();
        if (data.success) {
          setBankedPoints(data.currentTotal);
        }
      } catch (error) {
        console.error("Error loading initial points:", error);
      }
    };

    loadInitialPoints();
  }, [address]);

  const addBankedPoints = async (amount: number, actionType: string) => {
    if (!address) {
      console.error("No wallet connected");
      return;
    }

    const pointAction: BankedPointAction = {
      points: amount,
      type: actionType,
      timestamp: new Date().toISOString(),
    };

    try {
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
        setBankedPoints(data.currentTotal);
        console.log(`Banked points updated. New total: ${data.currentTotal}`);
      } else {
        console.error("Failed to add banked points:", data.error);
      }
    } catch (error) {
      console.error("Error adding banked points:", error);
    }
  };

  const setBankedPointsTotal = (total: number) => {
    setBankedPoints(total);
  };

  return (
    <BankedPointsContext.Provider
      value={{
        bankedPoints,
        addBankedPoints,
        setBankedPointsTotal,
      }}
    >
      {children}
    </BankedPointsContext.Provider>
  );
}

export const useBankedPoints = () => {
  const context = useContext(BankedPointsContext);
  if (context === undefined) {
    throw new Error("useBankedPoints must be used within a BankedPointsProvider");
  }
  return context;
};
