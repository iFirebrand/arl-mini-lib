import Image from "next/image";

export const ShowLibraryCard = ({ existingLibrary }: { existingLibrary: any }) => {
  return (
    <div className="hero bg-base-200 min-h-screen">
      <div className="hero-content flex-col lg:flex-row">
        <Image
          src="https://img.daisyui.com/images/stock/photo-1635805737707-575885ab0820.webp"
          alt="temp placeholder"
          width={384}
          height={384}
          className="rounded-lg shadow-2xl"
        />
        <div>
          <h1 className="text-5xl font-bold">{existingLibrary.locationName}</h1>
          <p className="py-6">
            Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem quasi. In
            deleniti eaque aut repudiandae et a id nisi.
          </p>

          <a href={`/browse/${existingLibrary.id}`} className="btn btn-primary">
            View Catalog
          </a>
        </div>
      </div>
    </div>
  );
};
