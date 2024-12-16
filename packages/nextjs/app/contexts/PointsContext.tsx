import React, { createContext, useContext, useEffect, useState } from "react";
import { decrypt, encrypt } from "~~/lib/encryption";

// We'll create this

interface PointAction {
  action: string;
  points: number;
  timestamp: number;
}

interface PointsContextType {
  points: number;
  addPoints: (amount: number, actionType: string) => void;
  clearTemporaryPoints: () => void;
  getPointActions: () => PointAction[];
}

export const PointsContext = createContext<PointsContextType | undefined>(undefined);

const POINTS_STORAGE_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "arlib_temp_points";
const MAX_POINTS_PER_ACTION = 100; // Reasonable limit per action
const MAX_TOTAL_TEMP_POINTS = 1000; // Reasonable total limit

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const [points, setPoints] = useState(0);
  const [pointActions, setPointActions] = useState<PointAction[]>([]);

  useEffect(() => {
    // Load encrypted points from localStorage on mount
    const savedData = localStorage.getItem(POINTS_STORAGE_KEY);
    if (savedData) {
      try {
        const decrypted = decrypt(savedData);
        const { points: savedPoints, actions } = JSON.parse(decrypted);
        setPoints(savedPoints);
        setPointActions(actions);
      } catch (error) {
        console.error("Error loading points:", error);
        // If there's an error, clear corrupted data
        localStorage.removeItem(POINTS_STORAGE_KEY);
      }
    }
  }, []);

  const saveToLocalStorage = (newPoints: number, newActions: PointAction[]) => {
    const data = {
      points: newPoints,
      actions: newActions,
    };
    const encrypted = encrypt(JSON.stringify(data));
    localStorage.setItem(POINTS_STORAGE_KEY, encrypted);
  };

  const addPoints = (amount: number, actionType: string) => {
    console.log("Starting addPoints:", { amount, actionType });

    // Validate point amount
    if (amount <= 0 || amount > MAX_POINTS_PER_ACTION) {
      console.error("Invalid points amount");
      return;
    }

    // Check if total would exceed maximum
    if (points + amount > MAX_TOTAL_TEMP_POINTS) {
      console.error("Maximum temporary points limit reached");
      return;
    }

    const newAction: PointAction = {
      action: actionType,
      points: amount,
      timestamp: Date.now(),
    };

    const newPoints = points + amount;
    const newActions = [...pointActions, newAction];

    console.log("About to save:", { newPoints, newActions });

    setPoints(newPoints);
    setPointActions(newActions);

    try {
      saveToLocalStorage(newPoints, newActions);
      console.log("Successfully saved to localStorage");

      // Verify the save
      const saved = localStorage.getItem(POINTS_STORAGE_KEY);
      console.log("Verification - saved data:", saved);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const clearTemporaryPoints = () => {
    setPoints(0);
    setPointActions([]);
    localStorage.removeItem(POINTS_STORAGE_KEY);
  };

  const getPointActions = () => pointActions;

  return (
    <PointsContext.Provider
      value={{
        points,
        addPoints,
        clearTemporaryPoints,
        getPointActions,
      }}
    >
      {children}
    </PointsContext.Provider>
  );
}

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (context === undefined) {
    throw new Error("usePoints must be used within a PointsProvider");
  }
  return context;
};
