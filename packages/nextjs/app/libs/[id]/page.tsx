import { unstable_cache as cache } from "next/cache";
import prisma from "../../../lib/db";
import Scan from "../../scan/App";

//  you can pregenerate all the paths at build time
// export async function getStaticParams() {
//   const posts = await prisma.post.findMany();
//   const paths = posts.map((post) => ({ slug: post.slug }));
//   return posts.map((post) => ({ slug: post.slug }));
// }

const getCachedLibrary = cache(async (id: string) => {
  const library = await prisma.library.findUnique({
    where: { id },
  });
  return library;
});

export default async function LibraryPage({ params }: { params: { id: string } }) {
  const library = await prisma.library.findUnique({
    where: { id: params.id },
  });

  const cachedLibrary = await getCachedLibrary(params.id);

  if (cachedLibrary) {
    return (
      <main className="flex flex-col items-center gap-y-5 pt-24, text-center">
        <h1 className="text-2xl font-semibold">{cachedLibrary.locationName}</h1>

        <Scan libraryId={cachedLibrary.id} />
      </main>
    );
  }
  return (
    <main className="flex flex-col items-center gap-y-5 pt-24, text-center">
      <h1 className="text-2xl font-semibold">{library?.locationName}</h1>

      {library?.id && <Scan libraryId={library.id} />}
    </main>
  );
}
