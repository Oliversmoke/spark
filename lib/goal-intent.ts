const GOAL_INTENT =
  /\b(learn|want to|goal|bulk|gym|habit|study|build|become|master|start|train|practice|get fit|lose weight|read more|ship|launch|certification|course)\b/i;

export function isGoalCreationIntent(message: string) {
  const trimmed = message.trim();
  return trimmed.length >= 12 && GOAL_INTENT.test(trimmed);
}
