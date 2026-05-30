import { redirect } from "next/navigation";

/** Legacy route: community discovery now lives on Explore. */
export default function DiscoverPage() {
  redirect("/explore?view=people");
}
