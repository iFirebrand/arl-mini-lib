// How close (in feet) a user must be for the scanner to unlock. Phone GPS is often off by
// tens of meters, so this is generous.
export const LIBRARY_MATCH_RADIUS_FEET = 1500;

interface Location {
  libraryLatitude: number;
  libraryLongitude: number;
  userLatitude: number;
  userLongitude: number;
}

/** True when the user is within LIBRARY_MATCH_RADIUS_FEET of the library. */
export function checkIfLocationMatches(location: Location): boolean {
  // 1 foot = 0.0003048 kilometers
  const distanceInKm = LIBRARY_MATCH_RADIUS_FEET * 0.0003048;

  // Radius of the Earth in kilometers
  const earthRadius = 6371;

  // Convert degrees to radians
  const libraryLatitudeRad = (location.libraryLatitude * Math.PI) / 180;
  const libraryLongitudeRad = (location.libraryLongitude * Math.PI) / 180;
  const userLatitudeRad = (location.userLatitude * Math.PI) / 180;
  const userLongitudeRad = (location.userLongitude * Math.PI) / 180;

  // Haversine formula to calculate distance between two points on a sphere
  const dLatitude = userLatitudeRad - libraryLatitudeRad;
  const dLongitude = userLongitudeRad - libraryLongitudeRad;
  const a =
    Math.sin(dLatitude / 2) * Math.sin(dLatitude / 2) +
    Math.cos(libraryLatitudeRad) * Math.cos(userLatitudeRad) * Math.sin(dLongitude / 2) * Math.sin(dLongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;

  // Check if the distance is within the radius
  return distance <= distanceInKm;
}
