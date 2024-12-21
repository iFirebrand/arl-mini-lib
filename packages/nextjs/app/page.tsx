"use client";

import { useState } from "react";
import Image from "next/image";
import type { NextPage } from "next";
import { FireIcon, InformationCircleIcon, MapIcon } from "@heroicons/react/24/outline";
import { recordVote } from "~~/actions/actions";
import { handleGeoLocation } from "~~/components/maps/handleGeoLocation";
import { useLocalStorage } from "~~/hooks/useLocalStorage";

// Import the recordVote function

const Home: NextPage = () => {
  const [isGeolocationRequested, setIsGeolocationRequested] = useState(false);
  const [voted, setVoted] = useLocalStorage("bpyr", false);
  const [selectedRating, setSelectedRating] = useState<number | null>(0);

  // Define the target date and calculate days remaining
  const targetDate = new Date("2025-01-31");
  const currentDate = new Date();
  const timeDifference = targetDate.getTime() - currentDate.getTime();
  const daysRemaining = Math.ceil(timeDifference / (1000 * 3600 * 24)); // Calculate days remaining

  const questionId = "rewards-pool"; // Define your question ID here

  const handleGeoLocationClick = () => {
    setIsGeolocationRequested(true);
    handleGeoLocation("/libs");
  };

  const handleVoteSubmit = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the default anchor tag behavior
    if (selectedRating !== null) {
      try {
        await recordVote(questionId, selectedRating);
        setVoted(true); // This should now work correctly
      } catch (error) {
        console.error("Error recording vote:", error);
        alert("Failed to record your vote. Please try again.");
      }
    } else {
      alert("Please select a rating before submitting.");
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-2">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-4xl font-bold">Arlington Mini Libraries</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <p className="my-2 font-medium">Discover, view books, curate, get points</p>
          </div>
          <div className="w-full max-w-3xl mx-auto mt-8 px-4">
            <div className="aspect-w-9 aspect-h-19">
              <iframe
                className="w-full h-full rounded-lg"
                src="https://www.youtube.com/embed/EH-OhAvPn_g?autoplay=0"
                title="Arlington Mini Libraries Introduction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <p></p>
          </div>

          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <span className="loading loading-ring loading-lg"></span>
              <p className="mb-2">In front of a library? </p>
              <button className="btn btn-accent mt-4" onClick={handleGeoLocationClick}>
                {isGeolocationRequested ? (
                  <>
                    Getting Location <span className="loading loading-ring loading-lg"></span>
                  </>
                ) : (
                  "Enable Geolocation"
                )}
              </button>
              <p className="mt-2">Browser location service must be enabled in settings</p>
            </div>

            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MapIcon className="h-8 w-8 fill-secondary" />
              <p className="mb-2">See all mapped libraries</p>
              <a href="/browse" className="btn btn-accent mt-4">
                Browse Libs
              </a>
              <p className="mt-2">This list is updated in real-time as people add libraries</p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <FireIcon className="h-8 w-8 fill-secondary" />
              <p className="mb-2">Libraries with character</p>
              <a href="/stats/personality" className="btn btn-accent mt-4">
                Browse Libs
              </a>
              <p className="mt-2">A couple of books gets you a personality</p>
            </div>

            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <InformationCircleIcon className="h-8 w-8 fill-secondary" />
              <p className="mb-2">About ARLib.me</p>
              <a href="/about" className="btn btn-accent mt-4">
                Learn More
              </a>
              <p className="mt-2">Why? Catalog. Map. Sponsor. Quests & points.</p>
            </div>
          </div>

          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row mt-12">
            <div className="card bg-base-100 w-96 shadow-xl">
              <figure className="px-10 pt-10">
                <Image
                  src="https://dtmqxpohipopgolmirik.supabase.co/storage/v1/object/public/altbucket/OG-Season.jpg"
                  alt="Shoes"
                  className="rounded-xl"
                  width={398}
                  height={398}
                />
              </figure>
              <div className="card-body items-center text-center">
                <h2 className="card-title">OG Season</h2>
                <p>The quest to map 50 libraries in on through January!</p>
                <div className="grid grid-flow-col gap-5 text-center auto-cols-max">
                  <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
                    <span className="countdown font-mono text-5xl center">
                      <span style={{ "--value": daysRemaining } as React.CSSProperties}></span>
                    </span>
                    Days left
                  </div>
                </div>
                <div className="card-actions">
                  <a href="/about#map-and-catalog" className="btn btn-primary">
                    Learn More
                  </a>
                </div>
              </div>
            </div>
          </div>

          {!voted && (
            <div className="flex justify-center items-center gap-12 flex-col sm:flex-row mt-12">
              <div className="card bg-base-100 w-96 shadow-xl">
                <figure className="px-10 pt-10">
                  <Image
                    src="https://dtmqxpohipopgolmirik.supabase.co/storage/v1/object/public/altbucket/rewards-cover.jpeg?t=2024-12-20T14%3A44%3A46.952Z"
                    alt="Rewards?"
                    className="rounded-xl"
                    width={398}
                    height={398}
                  />
                </figure>
                <div className="card-body items-center text-center">
                  <h2 className="card-title">$ Rewards Pool?</h2>
                  <p>Should we have a rewards pool to convert points to cash or local bucks? Vote.</p>

                  <div className="rating rating-lg">
                    <input
                      type="radio"
                      name="rating-2"
                      className="mask mask-star-2 bg-orange-400"
                      onChange={() => setSelectedRating(1)}
                      checked={selectedRating === 1}
                    />
                    <input
                      type="radio"
                      name="rating-2"
                      className="mask mask-star-2 bg-orange-400"
                      onChange={() => setSelectedRating(2)}
                      checked={selectedRating === 2}
                    />
                    <input
                      type="radio"
                      name="rating-2"
                      className="mask mask-star-2 bg-orange-400"
                      onChange={() => setSelectedRating(3)}
                      checked={selectedRating === 3}
                    />
                    <input
                      type="radio"
                      name="rating-2"
                      className="mask mask-star-2 bg-orange-400"
                      onChange={() => setSelectedRating(4)}
                      checked={selectedRating === 4}
                    />
                  </div>
                  {/* Area to show the selected message */}
                  {selectedRating === 0 && <p>Pick a star to see rating guidance</p>}
                  {selectedRating === 1 && <p>😐 No. This will ruin it.</p>}
                  {selectedRating === 2 && <p>🧐 Will not motivate me.</p>}
                  {selectedRating === 3 && <p>😁 I want the rewards!</p>}
                  {selectedRating === 4 && <p>🤩 I may contribute to the pool!</p>}
                  <div className="card-actions">
                    <a
                      className="btn btn-primary"
                      onClick={handleVoteSubmit}
                      // Disable the button if selectedRating is 0
                      aria-disabled={selectedRating === 0}
                      style={{ pointerEvents: selectedRating === 0 ? "none" : "auto" }}
                    >
                      {selectedRating === 0 ? "Pick a ⭐️ to Vote" : "Vote"}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {voted && (
            <div className="flex justify-center items-center gap-12 flex-col sm:flex-row mt-12">
              <div className="card bg-base-100 w-96 shadow-xl">
                <figure className="px-10 pt-10">
                  <Image
                    src="https://dtmqxpohipopgolmirik.supabase.co/storage/v1/object/public/altbucket/rewards-cover.jpeg?t=2024-12-20T14%3A44%3A46.952Z"
                    alt="Rewards?"
                    className="rounded-xl"
                    width={398}
                    height={398}
                  />
                </figure>
                <div className="card-body items-center text-center">
                  <h2 className="card-title">$ Rewards Pool?</h2>
                  <p>Thank you for voting! We are accumulating the votes.</p>

                  {selectedRating === 0 && <p>Pick a star to see rating guidance</p>}
                  {selectedRating === 1 && (
                    <p>
                      You are absolutely right—money should never overshadow the core values of contributing to public
                      goods. However, small rewards can sometimes act as a catalyst to spark initial participation and
                      help build momentum. The goal is always to keep the spirit of the project intact. Let us see how
                      others feel about this approach and ensure we strike the right balance.{" "}
                    </p>
                  )}
                  {selectedRating === 2 && (
                    <p>
                      That makes a lot of sense—rewards aren not always the key motivator, especially for those who
                      genuinely care about the cause. For some, though, small incentives can be a way to encourage
                      participation and build early momentum. Of course, the spirit of contributing to public goods
                      remains at the heart of it all. I would love to hear your thoughts on how we might inspire others
                      who might need a little nudge to get involved!
                    </p>
                  )}
                  {selectedRating === 3 && (
                    <p>
                      Great to hear you are excited about the rewards! They can definitely make participation more
                      engaging while keeping the focus on building something meaningful together. Your enthusiasm is
                      what can help make this community thrive—thank you!
                    </p>
                  )}
                  {selectedRating === 4 && (
                    <p>
                      That is amazing! Your willingness to contribute goes beyond just participating—it helps create a
                      cycle of giving and sharing that strengthens the entire community.{" "}
                      <a href="mailto:ArlingtonAndUkraine+arlib@gmail.com">Email me</a> and we can explore how you can
                      help grow the rewards pool. Together, we can make this initiative even more impactful!
                    </p>
                  )}

                  <div className="card-actions">
                    <a href="/about#sponsor-quest" className="btn btn-primary">
                      Learn More
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
