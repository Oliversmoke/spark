import dynamic from "next/dynamic";
import Link from "next/link";

import { FormPageSkeleton } from "../components/skeleton-ui";

const CreateSubmissionForm = dynamic(
  () => import("./create-submission-form").then((m) => m.CreateSubmissionForm),
  { loading: () => <FormPageSkeleton /> }
);

export default function CreatePage() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Create</p>
      <h1 className="text-2xl font-semibold tracking-tight">Submit games & content</h1>
      <p className="text-sm text-muted">
        Submit to moderation. For instant publishing use{" "}
        <Link href="/create/posts" className="font-semibold text-foreground underline decoration-border-low">
          Posts
        </Link>
        .
      </p>
      <CreateSubmissionForm />
    </div>
  );
}

