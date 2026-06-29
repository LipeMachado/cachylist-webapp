"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  parseContent,
  createItems,
  type ImportItemInput,
} from "@/lib/services/import";

export interface ImportPreviewResult {
  ok: boolean;
  error?: string;
  titles?: string[];
  total?: number;
}

export async function analyzeImport(formData: FormData): Promise<ImportPreviewResult> {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Selecione um arquivo." };

  const content = await file.text();
  const titles = parseContent(content, file.name);
  if (titles.length === 0)
    return { ok: false, error: "Nenhum título encontrado no arquivo." };

  // Just parse and hand the raw titles back — identification happens lazily on
  // the client, per visible card. Keeps this instant even for huge lists.
  return { ok: true, titles, total: titles.length };
}

export async function confirmImport(
  items: ImportItemInput[]
): Promise<{ ok: boolean; count: number }> {
  const user = await requireUser();
  if (!Array.isArray(items) || items.length === 0) return { ok: false, count: 0 };

  const count = await createItems(items, user.id);

  revalidatePath("/app");
  revalidatePath("/app/library");
  return { ok: true, count };
}
