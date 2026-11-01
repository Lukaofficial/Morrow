import { Cabins } from "@/components/home/Cabins";
import { DepartureBoard } from "@/components/home/DepartureBoard";
import { Hero } from "@/components/home/Hero";
import { HouseRules } from "@/components/home/HouseRules";
import { NetworkMap } from "@/components/home/NetworkMap";
import { NightStory } from "@/components/home/NightStory";
import { PosterWall } from "@/components/home/PosterWall";
import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";
import { getBoard } from "@/lib/board";
import { localDate, NETWORK_TZ } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const today = localDate(now, NETWORK_TZ);
  const board = await getBoard(8, now);

  return (
    <>
      <main>
        <Hero today={today} nav={<Nav />} />
        <DepartureBoard initial={board} updatedAt={now.toISOString()} />
        <NightStory />
        <PosterWall />
        <NetworkMap />
        <Cabins />
        <HouseRules />
      </main>
      <Footer />
    </>
  );
}
