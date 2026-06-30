"use client";

import { useRouter } from "next/navigation";
import MediaForm from "./MediaForm";
import { type MediaFormValues } from "@/lib/media-form";

// Edit form rendered inside the intercepting-route modal. Cancel/save just pop
// the modal (router.back); updateMedia already revalidates the list/detail, so
// the page underneath reflects the change when you land back on it.
export default function MediaFormModal({
  id,
  initial,
}: {
  id: number;
  initial: MediaFormValues;
}) {
  const router = useRouter();
  return (
    <MediaForm
      mode="edit"
      id={id}
      initial={initial}
      onCancel={() => router.back()}
      onSuccess={() => router.back()}
    />
  );
}
