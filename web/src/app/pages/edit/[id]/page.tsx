import { EditPageClient } from "./edit-page-client";

// Required for static export with dynamic routes
export function generateStaticParams() {
  // Return empty array - we handle routing client-side
  return [];
}

export default function EditPage({ params }: { params: { id: string } }) {
  return <EditPageClient pageId={params.id} />;
}

