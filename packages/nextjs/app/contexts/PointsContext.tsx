import React, { createContext, useContext, useEffect, useState } from "react";

interface PointsContextType {
  points: number;
  addPoints: (amount: number) => void;
}

const PointsContext = createContext<PointsContextType | undefined>(undefined);

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const [points, setPoints] = useState(0);

  useEffect(() => {
    // Load points from localStorage on mount
    const savedPoints = localStorage.getItem("userPoints");
    if (savedPoints) {
      setPoints(parseInt(savedPoints));
    }
  }, []);

  const addPoints = (amount: number) => {
    const newPoints = points + amount;
    setPoints(newPoints);
    localStorage.setItem("userPoints", newPoints.toString());
  };

  return <PointsContext.Provider value={{ points, addPoints }}>{children}</PointsContext.Provider>;
}

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (context === undefined) {
    throw new Error("usePoints must be used within a PointsProvider");
  }
  return context;
};
