import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { GamePlayerSkeleton } from "../../components/skeleton-ui";
import { getBuiltInGame } from "@/lib/games/config";

const DevQuizClient = dynamic(
  () => import("../[gameId]/dev-quiz-client").then((m) => m.DevQuizClient),
  { loading: () => <GamePlayerSkeleton /> },
);

export default function DesignSprintQuizPage() {
  const game = getBuiltInGame("design-sprint-quiz");
  if (!game) return notFound();
  return <DevQuizClient game={game} />;
}

