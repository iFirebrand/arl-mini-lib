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
        <h3 className="font-bold text-lg">⚠️ Your earned points are at risk until logged in!</h3>
        <ul className="list-disc pl-6">
          <li className="py-4">
            Login to <strong>save points</strong> pseudonymously for leaderboards and potential future rewards.{" "}
            <Link href="/about#accounts" target="_blank" rel="noopener noreferrer">
              Learn more
            </Link>
            .
          </li>
          <li className="py-4">
            Or continue without account and <strong>forfeit points</strong> to remain anonymous.
          </li>
        </ul>
        <p>
          Your points are currently saved temporarily in your browser and are not linked to your account yet. If you
          clear your browser data or switch devices, these points will disappear. To keep them safe and tied to your
          account, you need to login to save them.
        </p>

        <div className="modal-action">
          <form method="dialog">
            <button
              className="btn"
              value="dismiss"
              onClick={() => {
                console.log("Continue without claiming clicked");
              }}
            >
              Got it
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
};
