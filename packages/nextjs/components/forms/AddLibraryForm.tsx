type AddLibraryFormProps = {
  isGeolocationAvailable: boolean;
  latitude: string | null;
  longitude: string | null;
  libraryExists: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export const AddLibraryForm = ({
  isGeolocationAvailable,
  latitude,
  longitude,
  libraryExists,
  onSubmit,
}: AddLibraryFormProps) => {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-y-2 w-[300px]">
      <input
        type="text"
        name="locationName"
        placeholder="Discover a new library to name it!"
        className="px-2 py-1 rounded-sm"
      />
      <input type="hidden" id="latitude" name="latitude" value={isGeolocationAvailable ? (latitude ?? "") : ""} />
      <input type="hidden" id="longitude" name="longitude" value={isGeolocationAvailable ? (longitude ?? "") : ""} />
      <button
        type="submit"
        className={`bg-blue-500 py-2 text-white rounded-sm ${
          libraryExists || !isGeolocationAvailable ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={libraryExists || !isGeolocationAvailable}
      >
        Add Library
      </button>
      {!isGeolocationAvailable && <p className="text-red-500">Enable geolocation please.</p>}
    </form>
  );
};
