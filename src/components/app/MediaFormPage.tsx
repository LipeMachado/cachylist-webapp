"use client";

import { useRouter } from "next/navigation";
import MediaForm from "./MediaForm";
import { type MediaFormValues } from "@/lib/media-form";

// Non-modal form wrapper for the new/edit pages.
export default function MediaFormPage({
  mode,
  id,
  initial,
  cancelHref,
  successHref,
}: {
  mode: "create" | "edit";
  id?: number;
  initial: MediaFormValues;
  cancelHref: string;
  successHref: string;
}) {
  const router = useRouter();
  return (
    <MediaForm
      mode={mode}
      id={id}
      initial={initial}
      onCancel={() => router.push(cancelHref)}
      onSuccess={() => router.push(successHref)}
    />
  );
}
