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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-full">
        <PageBuilder
          pageId={pageId}
          onClose={handleClose}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

