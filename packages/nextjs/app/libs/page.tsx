import LibsClient from "./LibsClient";

// The phone's position arrives as ?latitude=…&longitude=… (see handleGeoLocation).
export default async function LibsPage({
  searchParams,
}: {
  searchParams: Promise<{ latitude?: string; longitude?: string }>;
}) {
  const { latitude, longitude } = await searchParams;
  const lat = typeof latitude === "string" && latitude ? latitude : null;
  const long = typeof longitude === "string" && longitude ? longitude : null;
  // A new position is a fresh visit, so reset the form's state.
  return <LibsClient key={`${lat},${long}`} latitude={lat} longitude={long} />;
}
