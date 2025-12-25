"use client";

import { useRouter } from "next/navigation";
import { PageBuilder } from "@/components/page-builder";

export default function NewPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push("/pages");
  };

  const handleSave = () => {
    router.push("/pages");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 flex-1 flex flex-col min-h-0 max-w-full">
        <PageBuilder
          onClose={handleClose}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

