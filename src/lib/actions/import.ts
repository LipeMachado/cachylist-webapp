"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  parseContent,
  createItems,
  MAX_IMPORT_ITEMS,
  type ImportItemInput,
} from "@/lib/services/import";

export interface ImportPreviewResult {
  ok: boolean;
  error?: string;
  titles?: string[];
  total?: number;
}

// Caps guard against a single upload monopolizing the (single-connection)
// DB pool or ballooning memory — see MAX_IMPORT_ITEMS in import service.
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export async function analyzeImport(formData: FormData): Promise<ImportPreviewResult> {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Selecione um arquivo." };
  if (file.size > MAX_FILE_SIZE_BYTES)
    return { ok: false, error: "Arquivo muito grande (máximo 2MB)." };

  const content = await file.text();
  const titles = parseContent(content, file.name);
  if (titles.length === 0)
    return { ok: false, error: "Nenhum título encontrado no arquivo." };
  if (titles.length > MAX_IMPORT_ITEMS)
    return {
      ok: false,
      error: `Muitos itens no arquivo (máximo ${MAX_IMPORT_ITEMS}). Divida em arquivos menores.`,
    };

  // Just parse and hand the raw titles back — identification happens lazily on
  // the client, per visible card. Keeps this instant even for huge lists.
  return { ok: true, titles, total: titles.length };
}

export async function confirmImport(
  items: ImportItemInput[]
): Promise<{ ok: boolean; count: number }> {
  const user = await requireUser();
  if (!Array.isArray(items) || items.length === 0) return { ok: false, count: 0 };
  if (items.length > MAX_IMPORT_ITEMS) return { ok: false, count: 0 };

  const count = await createItems(items, user.id);

  revalidatePath("/app");
  revalidatePath("/app/library");
  return { ok: true, count };
}
