import React from "react";
import Link from "next/link";

interface ModalProps {
  id: string; // ID for the modal element
}

export const LoginOrCreateAccountModal = ({ id }: ModalProps) => {
  console.log("Rendering modal with id:", id); // Debug log

  return (
    <dialog id={id} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">🎉 Nicely done! 20 points earned.</h3>
        <ul className="list-disc pl-6">
          <li className="py-4">
            <strong>Earn points</strong> pseudonymously for leaderboards and potential future rewards.{" "}
            <Link href="/about#accounts" target="_blank" rel="noopener noreferrer">
              Learn more
            </Link>
            .
          </li>
          <li className="py-4">
            Continue without claiming and <strong>forfeit points</strong> to remain anonymous for this contribution.
          </li>
        </ul>

        <div className="modal-action">
          <form method="dialog">
            <button
              className="btn btn-primary mr-2"
              onClick={() => {
                console.log("Create account clicked"); // Debug log
                // Handle create account logic
              }}
            >
              Create Account & Claim Points
            </button>

            <button
              className="btn"
              onClick={() => {
                console.log("Continue without claiming clicked"); // Debug log
              }}
            >
              Continue without claiming
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
};
