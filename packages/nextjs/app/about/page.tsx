"use client";

function AboutPage() {
  return (
    <div className="container mx-auto px-4 max-w-4xl py-8">
      <h1 className="text-center mb-8">
        <span className="block text-4xl font-bold">About ARLib.me</span>
      </h1>
      <div className="flex flex-col gap-8">
        <div id="intro" className="card bg-base-300 rounded-box p-6">
          <p className="text-lg">
            Mini libraries are more than book collections—they&apos;re neighborhood gems of creativity and connection.
            ARLib puts these spaces on the map and in your pocket, making it easy to explore, share, and discover books
            nearby. Each listed book links to its openlibrary.org page, helping you decide your next great read
            effortlessly!
          </p>
        </div>

        <div id="map-and-catalog" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">Map and Catalog Them!</span>
          </h3>
          <p className="text-lg mb-4">
            Let&apos;s put all mini libraries on the <a href="/browse">map</a>! With ARLib, it&apos;s simple and fun.
            Use your phone to:
          </p>
          <ol className="list-decimal pl-8 space-y-2 text-lg">
            <li>
              <strong>Add a Library:</strong> If the library isn&apos;t listed you can add it. You must be at the
              library to snap a pic, geotag it, and catalog a few books (or all of them) to bring it online. You also
              get to name it!{" "}
            </li>
            <li>
              <strong>Catalog Books:</strong> For mapped libraries you can rescan the barcode on all the books with your
              phone to refesh the catalog and earn points. Over time the catalog can get stale. But a 5 minute re-scan
              of all or some of the books will keep it up to date.
            </li>
          </ol>
        </div>

        <div id="browse-books" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">Browse Books Remotely</span>
          </h3>

          <p className="text-lg mt-4">
            Looking for a good book but don&apos;t feel like trekking to a mini library? Need something for your book
            club or just curious about what others nearby are reading? Find a library on the map and browse its
            collection—quick and simple. Spotted a book but not sure if it&apos;s worth your time? Look it up later and
            decide.
          </p>
        </div>

        <div id="sponsor-quest" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">Sponsor Mapping Quest</span>
          </h3>

          <p className="text-lg mt-4">
            Mini libraries are a public goods. We need a burst to get as many mini-libraries online as possible by the
            end of January. <strong>Enter quests.</strong> People hunt to discover new libraries and catalog its
            contents to compete for points. Quests are more fun with real rewards! Sure, bragging rights are cool, but
            how about points that can turn into something tangible, like money or gift cards to local businesses?
            Imagine earning something of value for putting libraries online—or for refreshing the catalog while on a dog
            walk. For some it is not about the money. But we know incentives work. The prize-to-points ratio?
            That&apos;s the exciting part—it depends on how many sponsors and funds join the quest! Gamification ideas
            are flowing, and we&apos;re just getting started. Will there be a golden ticket? Got thoughts or want to
            chip in ideas or funds? Let&apos;s team up and make it happen—reach out{" "}
            <div className="tooltip" data-tip="ArlingtonAndUkraine @ gmail.com">
              (by email)
            </div>{" "}
            and help shape something awesome! This is a fun community project. Don&apos;t be shy.
          </p>
        </div>

        <div id="accounts" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">Accounts & Points</span>
          </h3>

          <p className="text-lg mt-4">
            Claiming points requires setting up a passcode-protected account. For simplicity, we use a Coinbase smart
            wallet. No personal data is collected or stored by the site. Your passcode is stored only on your device and
            secured by Face ID, Touch ID, or your password manager. The site only stores the public wallet address
            associated with your account—no email, name, or other PII is required. This ensures your account remains
            pseudonymous. Leaderboards are pseudonymous and designed for fun. Your public account address and points are
            visible to everyone. If rewards are introduced in the future, points will determine eligibility.
          </p>
        </div>
        <div id="epilogue" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">Epilogue</span>
          </h3>

          <p className="text-lg mt-4">
            Every library and book you add becomes part of a growing, mapped network that anyone can explore. It&apos;s
            a community-driven way to make books more accessible while celebrating the stories in our neighborhoods.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
