// Asks for the position, then navigates to redirectURL with it as query parameters.
export const handleGeoLocation = async (redirectURL: string, navigate: (url: string) => void) => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        navigate(`${redirectURL}?latitude=${latitude}&longitude=${longitude}`);
      },
      error => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location. Please check your settings.");
      },
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }
};
