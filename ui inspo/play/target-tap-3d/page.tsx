import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { GamePlayerSkeleton } from "../../components/skeleton-ui";
import { getBuiltInGame } from "@/lib/games/config";

const SkillBuiltInGameClient = dynamic(
  () => import("../[gameId]/skill-play-client").then((m) => m.SkillBuiltInGameClient),
  { loading: () => <GamePlayerSkeleton /> },
);

export default function TargetTap3DPage() {
  const game = getBuiltInGame("target-tap-3d");
  if (!game) return notFound();
  return <SkillBuiltInGameClient game={game} />;
}

