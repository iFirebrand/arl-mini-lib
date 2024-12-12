/**
 * write a function that will determine if user's location is within 20 feet of a mini library.
 * The function takes an object as an input. Define the object as well.
 * The object should have longitude and lattitude of a library and longitude and lattitude of a user.
 * If the user location is within 20 feet of the library location, then return true. otherwise false.
 */

interface Location {
  libraryLatitude: number;
  libraryLongitude: number;
  userLatitude: number;
  userLongitude: number;
}

export function checkIfLocationMatches(location: Location): boolean {
  // Convert 20 feet to kilometers (1 foot = 0.0003048 kilometers)
  const distanceInKm = 1500 * 0.0003048;

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

  // Check if the distance is within 20 feet
  return distance <= distanceInKm;
}
