"use client";

import { useRouter } from "next/navigation";
import { HideButton } from "~~/components/moderation/HideButton";

// Shown only to moderators (the page checks on the server).
export default function LibraryModeration({ libraryId, hidden }: { libraryId: string; hidden: boolean }) {
  const router = useRouter();
  return (
    <div role="status" className={`alert ${hidden ? "alert-warning" : ""} max-w-xl justify-between`}>
      <span>{hidden ? "Hidden: only moderators can see this library." : "You can hide this library."}</span>
      <HideButton target="library" id={libraryId} hidden={hidden} onChange={() => router.refresh()} />
    </div>
  );
}
