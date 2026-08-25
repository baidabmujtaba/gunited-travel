import { createFileRoute } from "@tanstack/react-router";
import { CrmDetail } from "@/components/admin/CrmDetail";

export const Route = createFileRoute("/_authenticated/admin/agency/$id")({
  component: AgencyDetailPage,
});

function AgencyDetailPage() {
  const { id } = Route.useParams();
  return <CrmDetail kind="agency" id={id} />;
}
