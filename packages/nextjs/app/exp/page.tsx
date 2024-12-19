"use client";

import React, { useRef, useState } from "react";
import type { NextPage } from "next";
// import confetti from "canvas-confetti";
import Confetti from "react-dom-confetti";
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

  const [isExploding, setIsExploding] = useState(false);
  const targetRef = useRef(null);

  const config = {
    angle: 90, // Explodes straight upwards
    spread: 120, // Wider spread to resemble blooming petals
    startVelocity: 60, // Strong upward force
    elementCount: 150, // More confetti for a fuller effect
    dragFriction: 0.1, // Slower fall for a floaty effect
    duration: 4000, // Slightly longer for a dramatic bloom
    stagger: 0.05, // Faster successive particle release
    width: "10px", // Slightly smaller confetti for delicacy
    height: "10px",
    colors: ["#0057B7", "#FFDD00"],
  };

  const handleConfettiAction = () => {
    // Fire the confetti with options
    // confetti({
    //   particleCount: 500,
    //   spread: 1000,
    //   startVelocity: 100,
    //   decay: 0.8,
    //   scalar: 1.3,
    //   origin: { y: 0.3, x: 0.5 }, // Position the confetti to start lower on the screen
    // });
    setIsExploding(true);
    setTimeout(() => {
      setIsExploding(false);
    }, 3000);
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-4xl font-bold">Experiments</span>
        </h1>
        <div ref={targetRef} style={{ display: "inline-block", padding: "10px" }}>
          <Confetti active={isExploding} config={config}></Confetti>
        </div>
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
