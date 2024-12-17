"use client";

import React from "react";
import confetti from "canvas-confetti";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useBankedPoints } from "~~/app/contexts/BankedPointsContext";
import { usePoints } from "~~/app/contexts/PointsContext";
import { handlePoints } from "~~/app/utils/points/handlePoints";

// TEST POINTS

const Exp: NextPage = () => {
  const { address } = useAccount();
  const { addPoints } = usePoints();
  const { setBankedPointsTotal } = useBankedPoints();

  const handleAddPoints = () => {
    handlePoints(address, 10, "TEST_POINTS", addPoints, setBankedPointsTotal);
  };

  const handleConfettiAction = () => {
    // Fire the confetti with options
    confetti({
      particleCount: 500,
      spread: 1000,
      startVelocity: 100,
      decay: 0.8,
      scalar: 1.3,
      origin: { y: 0.3, x: 0.5 }, // Position the confetti to start lower on the screen
    });
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-4xl font-bold">Experiments</span>
        </h1>
        <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
          <p className="my-2 font-medium">Discover libs, their contents, and curate them</p>
        </div>
        <div>
          <button className="btn btn-accent" onClick={handleAddPoints}>
            Add Points
          </button>
        </div>
      </div>
      <div>
        <button onClick={handleConfettiAction} className="btn">
          Celebrate 🎉
        </button>
      </div>
    </div>
  );
};
export default Exp;
