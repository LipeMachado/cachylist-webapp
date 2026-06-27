"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  parseContent,
  identifyTitles,
  createItems,
  storePreview,
  readPreview,
  deletePreview,
  PREVIEW_LIMIT,
  type EnrichedTitle,
  type ImportItemInput,
} from "@/lib/services/import";

export interface ImportPreviewResult {
  ok: boolean;
  error?: string;
  token?: string;
  items?: EnrichedTitle[];
  total?: number;
  page?: number;
  limit?: number;
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

  const enriched = await identifyTitles(titles);
  const token = randomBytes(16).toString("hex");
  storePreview(token, enriched);

  return {
    ok: true,
    token,
    items: enriched.slice(0, PREVIEW_LIMIT),
    total: enriched.length,
    page: 0,
    limit: PREVIEW_LIMIT,
  };
}

export async function loadImportPage(
  token: string,
  page: number
): Promise<ImportPreviewResult> {
  await requireUser();
  const enriched = readPreview(token);
  if (!enriched) return { ok: false, error: "Sessão expirada. Faça o upload novamente." };

  return {
    ok: true,
    token,
    items: enriched.slice(page * PREVIEW_LIMIT, page * PREVIEW_LIMIT + PREVIEW_LIMIT),
    total: enriched.length,
    page,
    limit: PREVIEW_LIMIT,
  };
}

export async function confirmImport(
  items: ImportItemInput[],
  token?: string
): Promise<{ ok: boolean; count: number }> {
  const user = await requireUser();
  if (!Array.isArray(items) || items.length === 0) return { ok: false, count: 0 };

  const count = await createItems(items, user.id);
  if (token) deletePreview(token);

  revalidatePath("/app");
  revalidatePath("/app/library");
  return { ok: true, count };
}
