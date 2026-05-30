import { assignPathIds } from "@/lib/path-utils";
import type { Path } from "@/types";

export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  category: "skill" | "fitness" | "habit";
  icon: string;
  path: Path;
}

const base = (partial: Omit<GoalTemplate, "path"> & { path: Omit<Path, never> }): GoalTemplate => ({
  ...partial,
  path: assignPathIds(partial.path),
});

export const GOAL_TEMPLATES: GoalTemplate[] = [
  base({
    id: "software-engineering",
    name: "Software Engineering",
    description: "From foundations to shipping a full-stack project",
    category: "skill",
    icon: "💻",
    path: {
      title: "Learn Software Engineering",
      durationWeeks: 24,
      phases: [
        {
          id: "",
          name: "Foundations",
          checkpoints: [
            {
              id: "",
              title: "HTML/CSS Portfolio Page",
              criteria: "Deployed static site with 3 sections",
              dueInDays: 14,
              completed: false,
              tasks: [
                {
                  id: "",
                  title: "Study HTML semantics (30 min)",
                  frequency: "daily",
                  durationMin: 30,
                  isMinimumViable: true,
                },
                {
                  id: "",
                  title: "CSS layout practice",
                  frequency: "daily",
                  durationMin: 45,
                },
                {
                  id: "",
                  title: "Build one portfolio section",
                  frequency: "daily",
                  durationMin: 60,
                },
              ],
            },
            {
              id: "",
              title: "JavaScript Fundamentals",
              criteria: "Complete 20 coding exercises",
              dueInDays: 21,
              completed: false,
              tasks: [
                {
                  id: "",
                  title: "JavaScript tutorial chapter",
                  frequency: "daily",
                  durationMin: 45,
                  isMinimumViable: true,
                },
                {
                  id: "",
                  title: "Solve 2 coding exercises",
                  frequency: "daily",
                  durationMin: 30,
                },
              ],
            },
          ],
        },
        {
          id: "",
          name: "React & Frontend",
          checkpoints: [
            {
              id: "",
              title: "React Todo App",
              criteria: "Working todo app with local storage",
              dueInDays: 21,
              completed: false,
              tasks: [
                {
                  id: "",
                  title: "React docs reading",
                  frequency: "daily",
                  durationMin: 30,
                  isMinimumViable: true,
                },
                {
                  id: "",
                  title: "Build React component",
                  frequency: "daily",
                  durationMin: 60,
                },
              ],
            },
          ],
        },
      ],
    },
  }),
  base({
    id: "gym-bulk",
    name: "Gym Bulk",
    description: "Structured bulk program with progressive overload",
    category: "fitness",
    icon: "🏋️",
    path: {
      title: "Gym Bulk Program",
      durationWeeks: 16,
      phases: [
        {
          id: "",
          name: "Foundation Block",
          checkpoints: [
            {
              id: "",
              title: "Establish Training Routine",
              criteria: "Complete 12 gym sessions in 4 weeks",
              dueInDays: 28,
              completed: false,
              tasks: [
                {
                  id: "",
                  title: "Gym session (push/pull/legs)",
                  frequency: "daily",
                  durationMin: 60,
                },
                {
                  id: "",
                  title: "Hit protein target",
                  frequency: "daily",
                  durationMin: 15,
                  isMinimumViable: true,
                },
                {
                  id: "",
                  title: "Track calories",
                  frequency: "daily",
                  durationMin: 10,
                },
              ],
            },
            {
              id: "",
              title: "Strength Baseline",
              criteria: "Log baseline lifts for squat, bench, deadlift",
              dueInDays: 14,
              completed: false,
              tasks: [
                {
                  id: "",
                  title: "Progressive overload session",
                  frequency: "weekly",
                  durationMin: 75,
                },
                {
                  id: "",
                  title: "Mobility / stretching",
                  frequency: "daily",
                  durationMin: 15,
                  isMinimumViable: true,
                },
              ],
            },
          ],
        },
      ],
    },
  }),
  base({
    id: "language-learning",
    name: "Language Learning",
    description: "Daily practice path to conversational fluency",
    category: "skill",
    icon: "🌍",
    path: {
      title: "Language Learning",
      durationWeeks: 20,
      phases: [
        {
          id: "",
          name: "Basics",
          checkpoints: [
            {
              id: "",
              title: "Core Vocabulary (500 words)",
              criteria: "Learn and review 500 common words",
              dueInDays: 30,
              completed: false,
              tasks: [
                {
                  id: "",
                  title: "Vocabulary flashcards",
                  frequency: "daily",
                  durationMin: 20,
                  isMinimumViable: true,
                },
                {
                  id: "",
                  title: "Listening practice",
                  frequency: "daily",
                  durationMin: 15,
                },
                {
                  id: "",
                  title: "Speak aloud / shadowing",
                  frequency: "daily",
                  durationMin: 15,
                },
              ],
            },
          ],
        },
      ],
    },
  }),
  base({
    id: "reading-habit",
    name: "Reading Habit",
    description: "Build a consistent daily reading practice",
    category: "habit",
    icon: "📚",
    path: {
      title: "Daily Reading Habit",
      durationWeeks: 12,
      phases: [
        {
          id: "",
          name: "Habit Formation",
          checkpoints: [
            {
              id: "",
              title: "21-Day Reading Streak",
              criteria: "Read at least 15 minutes for 21 days",
              dueInDays: 21,
              completed: false,
              tasks: [
                {
                  id: "",
                  title: "Read for 15+ minutes",
                  frequency: "daily",
                  durationMin: 15,
                  isMinimumViable: true,
                },
                {
                  id: "",
                  title: "Journal one takeaway",
                  frequency: "daily",
                  durationMin: 5,
                },
              ],
            },
            {
              id: "",
              title: "Finish First Book",
              criteria: "Complete one book cover to cover",
              dueInDays: 45,
              completed: false,
              tasks: [
                {
                  id: "",
                  title: "Extended reading session",
                  frequency: "daily",
                  durationMin: 30,
                  isMinimumViable: true,
                },
              ],
            },
          ],
        },
      ],
    },
  }),
];

export function getTemplate(id: string) {
  return GOAL_TEMPLATES.find((t) => t.id === id);
}
