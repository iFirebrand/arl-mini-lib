"use client";

function AboutPage() {
  return (
    <div className="container mx-auto px-4 max-w-4xl py-8">
      <h1 className="text-center mb-8">
        <span className="block text-4xl font-bold">About ARLib.me</span>
      </h1>
      <div className="flex flex-col gap-8">
        <div className="card bg-base-300 rounded-box p-6">
          <p className="text-lg">
            Mini libraries are more than book collections—they’re neighborhood gems of creativity and connection. ARLib
            puts these spaces on the map and in your pocket, making it easy to explore, share, and discover books
            nearby. Each listed book links to its openlibrary.org page, helping you decide your next great read
            effortlessly!
          </p>
        </div>

        <div className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">Go on a discovery quest!</span>
          </h3>
          <p className="text-lg mb-4">
            Do you know of a local mini library not on the <a href="/browse">map?</a> Bring it online! With ARLib, it's
            simple and fun. Use your phone to:
          </p>
          <ol className="list-decimal pl-8 space-y-2 text-lg">
            <li>
              <strong>Add a Library:</strong> If the library isn't listed you can add it. You must be at the library to
              snap a pic, geotag it, and catalog a few books (or all of them) to bring it online. You also get to name
              it!{" "}
            </li>
            <li>
              <strong>Catalog Books:</strong> Rescan the barcode on all the books with your phone to refesh the catalog
              and earn points. Since there is no check-in and check-out system information can get stale. But a 5 minute
              re-scan of all or some of the books will keep it up to date.
            </li>
          </ol>
          <p className="text-lg mt-4">
            Every library and book you add becomes part of a growing, mapped network that anyone can explore. It's a
            community-driven way to make books more accessible while celebrating the stories in our neighborhoods.
          </p>
        </div>

        <div className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">Browse Books Remotely</span>
          </h3>

          <p className="text-lg mt-4">
            Looking for a good book but don’t feel like trekking to a mini library? Need something for your book club or
            just curious about what others nearby are reading? Find a library on the map and browse its collection—quick
            and simple. Spotted a book but not sure if it’s worth your time? Look it up later and decide.
          </p>
        </div>

        <div className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">Be a Sponsor</span>
          </h3>

          <p className="text-lg mt-4">
            Season "Alpha" needs to solve the cold start problem and get as many mini-libraries as possible by the end
            of January. Enter quests. People hunt to discover new libraries and catalog its contents to complete for
            points. Quests are more fun with real rewards! Sure, bragging rights are cool, but how about points that can
            turn into something tangible, like money or gift cards to local businesses? Imagine earning $1 to $10 for
            putting a library online—or $2-5 for refreshing its catalog. The prize-to-points ratio? That’s the exciting
            part—it depends on how many sponsors and funds join the quest! Gamification ideas are flowing, and we’re
            just getting started. Got thoughts or want to chip in ideas or funds? Let’s team up and make it happen—reach
            out and help shape something awesome! This is a fun community project. Don't be shy.
          </p>
        </div>

        <div className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">Epilogue</span>
          </h3>

          <p className="text-lg mt-4">
            Every library and book you add becomes part of a growing, mapped network that anyone can explore. It's a
            community-driven way to make books more accessible while celebrating the stories in our neighborhoods.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
