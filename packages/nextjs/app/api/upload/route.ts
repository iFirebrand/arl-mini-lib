import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { rateLimit } from "../../../lib/rate-limit";
import { getClientIp, isAllowedReferer } from "../../../lib/requestGuards";
import { MAX_UPLOAD_BYTES, uploadToSupabase } from "../../../lib/supabase";

// Library photos only: a handful per visit is plenty.
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  limit: 10,
});

// Uploads a library photo with the server-side Supabase key, so browsers never hold one.
export async function POST(request: Request) {
  if (!limiter.check(getClientIp(request)).success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  if (!isAllowedReferer((await headers()).get("referer"))) {
    return NextResponse.json({ error: "Unauthorized request origin" }, { status: 403 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "Expected a multipart form with a file" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected a multipart form with a file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 413 });
  }

  try {
    return NextResponse.json({ url: await uploadToSupabase(file) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("File type not supported")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Error uploading image:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
