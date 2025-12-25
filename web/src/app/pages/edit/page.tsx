"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageBuilder } from "@/components/page-builder";

export default function EditPage() {
  const router = useRouter();
  const [pageId, setPageId] = useState<string | null>(null);

  useEffect(() => {
    // Read query parameter from URL (works with static export)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (!id) {
        // Redirect to pages list if no ID provided
        router.push("/pages");
      } else {
        setPageId(id);
      }
    }
  }, [router]);

  const handleClose = () => {
    router.push("/pages");
  };

  const handleSave = () => {
    router.push("/pages");
  };

  if (!pageId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col min-h-0">
        <PageBuilder
          pageId={pageId}
          onClose={handleClose}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

