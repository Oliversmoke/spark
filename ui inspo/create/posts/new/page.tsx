import dynamic from "next/dynamic";

import { FormPageSkeleton } from "../../../components/skeleton-ui";

const CreatorPostForm = dynamic(
  () => import("../creator-post-form").then((m) => m.CreatorPostForm),
  { loading: () => <FormPageSkeleton /> }
);

export default function NewCreatorPostPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Create · Posts</p>
        <h1 className="text-2xl font-semibold tracking-tight">New post</h1>
      </div>
      <CreatorPostForm />
    </div>
  );
}
