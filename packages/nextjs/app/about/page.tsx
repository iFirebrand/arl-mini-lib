"use client";

function AboutPage() {
  return (
    <div className="container mx-auto px-4 max-w-4xl py-8">
      <h1 className="text-center mb-8">
        <span className="block text-4xl font-bold">About ArLib.me</span>
      </h1>
      <div className="flex flex-col gap-8">
        <div id="intro" className="card bg-base-300 rounded-box p-6">
          <p className="text-lg">
            ArLib.me is a public goods community project to map and catalog mini libraries by Jan. 31, 2025. Mini
            libraries are more than book collections—they&apos;re neighborhood gems of creativity and connection. ArLib
            puts these spaces on the map and in your pocket, making it easy to explore, share, and discover books
            nearby. Each cataloged book links to its openlibrary.org page, helping you decide your next great read
            effortlessly!{" "}
            <a
              href="https://www.arlnow.com/2025/01/08/new-arlington-mini-libraries-map-uses-community-help-to-locate-free-books/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Click here to read the article about the project on Arlington Now.
            </a>
          </p>
        </div>

        <div id="map-and-catalog" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">🗺️ Map The Libraries!</span>
          </h3>
          <p className="text-lg mb-4">
            It&apos;s simple and fun. Use your phone to <strong>add a library</strong> and earn <strong>50</strong>{" "}
            points:{" "}
          </p>
          <ol className="list-decimal pl-8 space-y-2 text-lg">
            <li>You must be at the library. This is an IRL experience. </li>
            <li>Snap a pic of the library and name it to place it on the map. </li>
          </ol>
        </div>
        <div id="map-and-catalog" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">📚 Catalog The Books!</span>
          </h3>
          <p className="text-lg mb-4">Scan barcode on books to catalog them.</p>
          <ol className="list-decimal pl-8 space-y-2 text-lg">
            <li>Scan the barcode on the back of the book with your phone. </li>
            <li>Best in daylight. ISBN 13 barcodes to start.</li>
          </ol>
          <p className="text-lg mb-4">
            Over time the catalog can get stale. A 5 minute re-scan of the books will keep it up to date.
          </p>
        </div>
        <div id="map-and-catalog" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">⭐️ Earn Points!</span>
          </h3>
          <p className="text-lg mb-4">
            Earn points for discovering libraries and scanning books. Get on top of the leaderboards. Rewards in the
            future?
          </p>
          <ol className="list-decimal pl-8 space-y-2 text-lg">
            <li>
              Never before scanned books earn <strong>5</strong> points.{" "}
            </li>
            <li>Rescans of books in the catalog earn points based on freshness.</li>
            <li>
              Point <strong>multipliers</strong> kick in after a <strong>streak</strong> of scans.
            </li>
            <li>Accumulated failed scans earn points for persistence.</li>
          </ol>
        </div>

        <div id="browse-books" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">👀 Browse Books Remotely</span>
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
            <span className="block text-2xl font-bold">🏆 Make This Happen</span>
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
            <a href="mailto:ArlingtonAndUkraine+arlib@gmail.com">ArlingtonAndUkraine+arlib@gmail.com</a> and help shape
            something awesome! This is a fun community project. Don&apos;t be shy.
          </p>
        </div>

        <div id="accounts" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-2xl font-bold">🌟 Accounts & Points</span>
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
            <span className="block text-2xl font-bold">💫 Epilogue</span>
          </h3>

          <p className="text-lg mt-4">
            Every library and book you add becomes part of a growing, mapped network that anyone can explore. It&apos;s
            a community-driven way to make books more accessible while celebrating the stories in our neighborhoods.
          </p>
        </div>
        <div id="epilogue" className="card bg-base-300 rounded-box p-6">
          <h3 className="text-center mb-8">
            <span className="block text-lg font-bold">🇺🇦 🇺🇸 </span>
          </h3>

          <p className="text-lg mt-4">Victory for Ukraine is a victory for all of us.</p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
