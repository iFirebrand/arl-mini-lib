import { getLast50Books } from "../../actions/actions";
import { totalBookCount } from "../../actions/actions";
import { totalLibraryCount } from "../../actions/actions";
import { totalUserCount } from "../../actions/actions";
import StatsClient from "./StatsClient";

export default async function StatsPage() {
  const last50Books = await getLast50Books();
  const totalBooks = await totalBookCount();
  const totalLibraries = await totalLibraryCount();
  const totalUsers = await totalUserCount();

  return (
    <div>
      <StatsClient
        last50Books={last50Books}
        totalBooks={totalBooks}
        totalLibraries={totalLibraries}
        totalUsers={totalUsers}
      />
    </div>
  );
}
