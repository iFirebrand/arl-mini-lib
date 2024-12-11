import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

// Import Leaflet

// Set default icon for markers
const DefaultIcon = L.icon({
  iconUrl: "/images/marker-icon.png", // Direct path to marker icon in public folder
  iconSize: [25, 41], // Size of the icon
  iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
  popupAnchor: [1, -34], // Point from which the popup should open relative to the iconAnchor
  shadowUrl: "/images/marker-shadow.png", // Direct path to shadow icon in public folder
  shadowSize: [41, 41], // Size of the shadow
});

L.Marker.prototype.options.icon = DefaultIcon; // Set the default icon for all markers

const Map = ({ libraries, position }) => {
  // Center the map around the specified coordinates

  return (
    <MapContainer center={position} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {libraries.map(library => (
        <Marker key={library.id} position={[library.latitude, library.longitude]}>
          <Popup>
            <div>
              <p>{library.locationName}</p>
              <a
                href={`/browse/${library.id}`}
                className="text-blue-500 hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                See books here
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;
