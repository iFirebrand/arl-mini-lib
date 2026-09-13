import { notFound } from "next/navigation";
import { getModerationQueue, getModeratorId } from "../../lib/moderation";
import ModerateClient from "./ModerateClient";

export const dynamic = "force-dynamic";

// The newest libraries and books with one-click hide. Everyone else gets a 404.
export default async function ModeratePage() {
  if (!(await getModeratorId())) notFound();
  const queue = await getModerationQueue();
  return <ModerateClient queue={queue} />;
}
