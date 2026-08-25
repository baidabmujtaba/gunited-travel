import { createFileRoute } from "@tanstack/react-router";
import { CrmDetail } from "@/components/admin/CrmDetail";

export const Route = createFileRoute("/_authenticated/admin/customer/$id")({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();
  return <CrmDetail kind="customer" id={id} />;
}
