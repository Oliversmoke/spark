import dynamic from "next/dynamic";

import { FormPageSkeleton } from "../../../../components/skeleton-ui";

const CreatorPostForm = dynamic(
  () => import("../../creator-post-form").then((m) => m.CreatorPostForm),
  { loading: () => <FormPageSkeleton /> }
);

export default async function EditCreatorPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Create · Posts</p>
        <h1 className="text-2xl font-semibold tracking-tight">Edit post</h1>
      </div>
      <CreatorPostForm postId={id} />
    </div>
  );
}
