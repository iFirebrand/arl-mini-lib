"use client";

// Mark this component as a Client Component
import { useState } from "react";
import eventsData from "../eventsdata/events.json";

// Import the events data

function EventsPage() {
  const [expandedIndex, setExpandedIndex] = useState(null); // State to track expanded accordion

  const handleToggle = index => {
    setExpandedIndex(expandedIndex === index ? null : index); // Toggle accordion
  };

  return (
    <div className="container mx-auto">
      {eventsData["December 4, 2024"].map((event, index) => (
        <div key={index} className="accordion">
          <div className="accordion-header" onClick={() => handleToggle(index)}>
            <h2 className="text-lg font-bold">{event.title}</h2>
            <p>{event.date}</p>
            <p>{event.description.slice(0, 140)}...</p>
          </div>
          {expandedIndex === index && (
            <div className="accordion-body">
              <p>
                <strong>Location:</strong> {event.location}
              </p>
              <p>
                <strong>Description:</strong> {event.description}
              </p>
              <p>
                <strong>Links:</strong>
              </p>
              <ul>
                {event.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default EventsPage;
