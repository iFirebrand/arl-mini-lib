import {
  getLibrariesWithDescriptionCount,
  getManyLibraryDescriptions,
  totalLibraryCount,
} from "../../../actions/actions";
import PersonalityClient from "./PersonalityClient";

export const dynamic = "force-dynamic";

export default async function PersonalityPage() {
  const totalLibraries = await totalLibraryCount();
  const libraryDescriptions = await getManyLibraryDescriptions();
  const librariesWithDescriptionCount = await getLibrariesWithDescriptionCount();

  const formattedLibraryDescriptions = libraryDescriptions.map(desc => ({
    id: desc.libraryId,
    description: desc.description ?? undefined,
    locationName: desc.locationName,
    imageUrl: desc.imageUrl ?? undefined,
  }));

  return (
    <div>
      <PersonalityClient
        totalLibraries={totalLibraries}
        librariesWithDescriptionCount={librariesWithDescriptionCount}
        libraryDescriptions={formattedLibraryDescriptions}
      />
    </div>
  );
}
