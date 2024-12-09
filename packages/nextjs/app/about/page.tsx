"use client";

// Import the events data

function AboutPage() {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            {/* <span className="block text-2xl mb-2">Arlib</span> */}
            <span className="block text-4xl font-bold">About ARLib</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <p className="my-2 font-medium">
              Mini libraries are more than just book collections—they’re hubs of creativity, community, and
              knowledge-sharing. ARLib empowers you to connect these vibrant spaces online, so everyone can access and
              celebrate the stories within. By putting mini libraries on the map, we’re strengthening connections and
              making it easier for readers to explore, share, and discover books in their neighborhoods.
            </p>
          </div>

          {/* <p className="text-center text-lg">Get started by editing </p> */}
        </div>

        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
              <h2 className="font-bold">How It Works</h2>
              <p className="my-2 font-medium">
                With ARLib, bringing a mini library online is simple and fun. Use your phone to:{" "}
                <p className="my-2 font-medium"></p>
                <ol className="list-decimal pl-5">
                  <li>
                    <strong>Find a Library:</strong> Look up nearby libraries using geolocation or add a new one if it’s
                    not in the database.
                  </li>
                  <li>
                    <strong>Add a Library:</strong> If the library isn’t listed, pull its location from your phone, snap
                    a photo, and submit it.
                  </li>
                  <li>
                    <strong>Catalog Books:</strong> Scan barcodes on the library’s books to automatically add them to
                    its catalog.
                  </li>
                </ol>
                <p className="my-2 font-medium"></p>
                Every library and book you add becomes part of a growing, mapped network that anyone can explore. It’s a
                community-driven way to make books more accessible while celebrating the stories in our neighborhoods.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AboutPage;
