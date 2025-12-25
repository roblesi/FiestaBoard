"use client";

import { useRouter } from "next/navigation";
import { PageBuilder } from "@/components/page-builder";

interface EditPageClientProps {
  pageId: string;
}

export function EditPageClient({ pageId }: EditPageClientProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push("/pages");
  };

  const handleSave = () => {
    router.push("/pages");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <PageBuilder
          pageId={pageId}
          onClose={handleClose}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

