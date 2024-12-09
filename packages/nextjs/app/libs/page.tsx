import Link from "next/link";
import { createLibrary } from "../../actions/actions";
import prisma from "../../lib/db";

export default async function LibsPage() {
  const libraries = await prisma.library.findMany({
    where: {
      locationName: {
        not: {
          equals: "",
        },
      },
    },
    // where: { published: false, title: { contains: "asdf3" } },
    // where: { title: { endsWith: "3" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, locationName: true },
    // take: 2,
    // skip: 0,
  });

  const librariesCount = await prisma.library.count({
    where: {
      locationName: {
        not: {
          equals: "",
        },
      },
    },
  });

  return (
    <>
      <div className="container mx-auto">Libs</div>
      <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
        <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <p className="my-2 font-medium">{/* ... existing content ... */}</p>
            {/* Add Search Button */}

            {/* <button
              className="btn btn-accent mt-4"
              onClick={async () => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(position => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;

                    // Set the hidden input values
                    document.getElementById("latitude").value = latitude.toString();
                    document.getElementById("longitude").value = longitude.toString();
                  });
                } else {
                  alert("Geolocation is not supported by this browser.");
                }
              }}
            >
              Add Library
            </button> */}
          </div>
        </div>
      </div>
      <main className="flex flex-col items-center gap-y-5 pt-24, text-center">
        <h1 className="text-3xl font-semibold">All Libraries ({librariesCount})</h1>
        <ul className="border-t border-b border-black/10 py-5 leading-8">
          {libraries.map(library => (
            <li key={library.id} className="flex items-center justify-between px-5">
              <Link href={`/libs/${library.id}`} className="underline">
                {library.locationName}
              </Link>{" "}
              {library.id}
            </li>
          ))}
        </ul>

        <form action={createLibrary} className="flex flex-col gap-y-2 w-[300px]">
          <input type="text" name="locationName" placeholder="Location Name" className="px-2 py-1 rounded-sm" />
          <input type="hidden" id="latitude" name="latitude" />
          <input type="hidden" id="longitude" name="longitude" />
          <button type="submit" className="bg-blue-500 py-2 text-white rounded-sm">
            Add Library
          </button>
        </form>
      </main>
    </>
  );
}
