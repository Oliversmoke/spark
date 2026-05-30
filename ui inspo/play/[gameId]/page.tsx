import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { GamePlayerSkeleton } from "../../components/skeleton-ui";
import { getBuiltInGame } from "@/lib/games/config";
import { isBuiltinQuizClientId } from "@/lib/games/builtinQuizClientMeta";

const DevQuizClient = dynamic(
  () => import("./dev-quiz-client").then((m) => m.DevQuizClient),
  { loading: () => <GamePlayerSkeleton /> },
);

const SkillBuiltInGameClient = dynamic(
  () => import("./skill-play-client").then((m) => m.SkillBuiltInGameClient),
  { loading: () => <GamePlayerSkeleton /> },
);

export default async function PlayGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = getBuiltInGame(gameId);
  if (!game) return notFound();

  if (isBuiltinQuizClientId(game.id)) {
    return <DevQuizClient game={game} />;
  }

  return <SkillBuiltInGameClient game={game} />;
}
