import Link from "next/link";
import { Container } from "~~/components/ui/Page";

export default function NotFound() {
  return (
    <Container width="narrow" className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="font-display text-6xl font-semibold text-base-content/30">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">This page isn&apos;t on the shelf</h1>
      <p className="text-base-content/75">The link may be old or mistyped.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn btn-neutral rounded-full">
          Home
        </Link>
        <Link href="/browse" className="btn btn-primary rounded-full">
          Browse the map
        </Link>
      </div>
    </Container>
  );
}
