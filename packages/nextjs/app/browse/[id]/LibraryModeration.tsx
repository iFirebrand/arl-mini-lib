"use client";

import { useRouter } from "next/navigation";
import { HideButton } from "~~/components/moderation/HideButton";

// Shown only to moderators (the page checks on the server).
export default function LibraryModeration({ libraryId, hidden }: { libraryId: string; hidden: boolean }) {
  const router = useRouter();
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-box border px-4 py-3 ${
        hidden ? "border-warning bg-warning/20" : "border-base-300 bg-base-100"
      }`}
    >
      <span className="text-sm">
        {hidden ? "Hidden: only moderators can see this library." : "Moderator: you can hide this library."}
      </span>
      <HideButton target="library" id={libraryId} hidden={hidden} onChange={() => router.refresh()} />
    </div>
  );
}
