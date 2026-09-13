"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { setBookHidden, setLibraryHidden } from "~~/actions/moderation";

type Target = "library" | "item";

const NOUN: Record<Target, string> = { library: "Library", item: "Book" };

// One-click hide/unhide for moderators. The server checks the moderator role on every call.
export const HideButton = ({
  target,
  id,
  hidden,
  onChange,
  className = "",
}: {
  target: Target;
  id: string;
  hidden: boolean;
  onChange?: (hidden: boolean) => void;
  className?: string;
}) => {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    const next = !hidden;
    const result = await (target === "library" ? setLibraryHidden(id, next) : setBookHidden(id, next));
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${NOUN[target]} ${next ? "hidden" : "visible again"}`);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      className={`btn btn-sm ${hidden ? "btn-primary" : "btn-ghost"} ${className}`}
      disabled={busy}
      onClick={toggle}
    >
      {hidden ? (
        <EyeIcon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <EyeSlashIcon className="h-4 w-4" aria-hidden="true" />
      )}
      {hidden ? "Unhide" : "Hide"}
    </button>
  );
};
