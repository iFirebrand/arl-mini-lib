export const handleGeoLocation = async () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      window.location.href = `/libs?latitude=${latitude}&longitude=${longitude}`;
    });
  } else {
    alert("Geolocation is not supported by this browser.");
  }
};
