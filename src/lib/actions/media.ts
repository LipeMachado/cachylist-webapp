"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  CATEGORY_TO_INT,
  STATUS_TO_INT,
  categoryKey,
  type CategoryKey,
  type StatusKey,
} from "@/lib/media";
import type { Prisma } from "@prisma/client";

export interface MediaActionState {
  ok: boolean;
  errors: string[];
  id?: number;
}

// Hard length caps on user-supplied text — prevents pathologically large
// strings from bloating storage (Postgres TEXT columns are unbounded).
const MAX_SHORT_LENGTH = 500; // title, platform, author, director
const MAX_LONG_LENGTH = 5000; // description, notes
const MAX_URL_LENGTH = 2000;

function str(formData: FormData, key: string, maxLength = MAX_LONG_LENGTH): string | null {
  const v = formData.get(key);
  if (v == null) return null;
  const s = String(v).trim().slice(0, maxLength);
  return s.length ? s : null;
}

function int(formData: FormData, key: string): number | null {
  const s = str(formData, key);
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function bool(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === "1" || v === "true" || v === "on";
}

function date(formData: FormData, key: string): Date | null {
  const s = str(formData, key);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function buildData(formData: FormData): {
  data: Prisma.MediaItemUncheckedCreateInput | Prisma.MediaItemUpdateInput;
  errors: string[];
  title: string | null;
  categoryInt: number;
  statusInt: number;
} {
  const errors: string[] = [];

  const title = str(formData, "title", MAX_SHORT_LENGTH);
  const categoryRaw = (str(formData, "category") ?? "anime") as CategoryKey;
  const statusRaw = (str(formData, "status") ?? "planned") as StatusKey;

  if (!title) errors.push("Título não pode ficar em branco");

  const categoryInt = CATEGORY_TO_INT[categoryRaw] ?? CATEGORY_TO_INT.anime;
  const statusInt = STATUS_TO_INT[statusRaw] ?? STATUS_TO_INT.planned;

  const rating = int(formData, "rating");
  if (rating != null && (rating < 0 || rating > 10))
    errors.push("Avaliação deve estar entre 0 e 10");

  const releaseYear = int(formData, "release_year");
  if (releaseYear != null && (releaseYear <= 1800 || releaseYear >= 2200))
    errors.push("Ano de lançamento inválido");

  const cat = categoryKey(categoryInt);
  const episodic = cat === "anime" || cat === "series";

  const data = {
    title: title ?? "",
    description: str(formData, "description", MAX_LONG_LENGTH),
    category: categoryInt,
    status: statusInt,
    platform: str(formData, "platform", MAX_SHORT_LENGTH),
    releaseYear,
    rating,
    notes: str(formData, "notes", MAX_LONG_LENGTH),
    coverUrl: str(formData, "cover_url", MAX_URL_LENGTH),
    startedAt: date(formData, "started_at"),
    finishedAt: date(formData, "finished_at"),
    currentEpisode: episodic ? int(formData, "current_episode") : null,
    totalEpisodes: episodic ? int(formData, "total_episodes") : null,
    currentSeason: episodic ? int(formData, "current_season") : null,
    totalSeasons: episodic ? int(formData, "total_seasons") : null,
    currentPage: int(formData, "current_page"),
    totalPages: int(formData, "total_pages"),
    author: str(formData, "author", MAX_SHORT_LENGTH),
    director: str(formData, "director", MAX_SHORT_LENGTH),
    durationMinutes: int(formData, "duration_minutes"),
    hoursPlayed: int(formData, "hours_played"),
    wantsPlatinum: bool(formData, "wants_platinum"),
    platinumCompleted: bool(formData, "platinum_completed"),
  };

  // Marking something "Concluído" should max out its progress so it reads as
  // truly finished — fill current from the total whenever the total is known.
  if (statusInt === STATUS_TO_INT.completed) {
    if (data.totalEpisodes != null) data.currentEpisode = data.totalEpisodes;
    if (data.totalSeasons != null) data.currentSeason = data.totalSeasons;
    if (data.totalPages != null) data.currentPage = data.totalPages;
  }

  return { data, errors, title, categoryInt, statusInt };
}

async function isDuplicateTitle(
  userId: number,
  title: string,
  excludeId?: number
): Promise<boolean> {
  const existing = await prisma.mediaItem.findFirst({
    where: {
      userId,
      title: { equals: title, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !!existing;
}

export async function createMedia(formData: FormData): Promise<MediaActionState> {
  const user = await requireUser();
  const { data, errors, title, statusInt } = buildData(formData);

  if (title && (await isDuplicateTitle(user.id, title)))
    errors.push("Título já existe na sua biblioteca");

  if (errors.length) return { ok: false, errors };

  const maxSort = await prisma.mediaItem.aggregate({
    where: { userId: user.id, status: statusInt },
    _max: { sortOrder: true },
  });

  const created = await prisma.mediaItem.create({
    data: {
      ...(data as Prisma.MediaItemUncheckedCreateInput),
      userId: user.id,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/library");
  return { ok: true, errors: [], id: created.id };
}

export async function updateMedia(
  id: number,
  formData: FormData
): Promise<MediaActionState> {
  const user = await requireUser();
  const owned = await prisma.mediaItem.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!owned) return { ok: false, errors: ["Mídia não encontrada"] };

  const { data, errors, title } = buildData(formData);
  if (title && (await isDuplicateTitle(user.id, title, id)))
    errors.push("Título já existe na sua biblioteca");

  if (errors.length) return { ok: false, errors };

  await prisma.mediaItem.update({
    where: { id },
    data: data as Prisma.MediaItemUpdateInput,
  });

  revalidatePath("/app");
  revalidatePath("/app/library");
  revalidatePath(`/app/media_items/${id}`);
  return { ok: true, errors: [], id };
}

export async function deleteMedia(id: number): Promise<void> {
  const user = await requireUser();
  await prisma.mediaItem.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/app");
  revalidatePath("/app/library");
}
