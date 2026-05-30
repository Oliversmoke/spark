import dynamic from "next/dynamic";

import { AdminPanelSkeleton } from "../components/skeleton-ui";

const AdminDashboard = dynamic(
  () => import("./admin-dashboard").then((m) => m.AdminDashboard),
  { loading: () => <AdminPanelSkeleton /> }
);

export default function AdminPage() {
  return <AdminDashboard />;
}
