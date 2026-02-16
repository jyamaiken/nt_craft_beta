import { Material, Quest } from "@/lib/types";

type CraftData = {
  materials: Material[];
  quests: Quest[];
};

type EntityOverlay<T extends { id: string }> = {
  added: T[];
  updated: Record<string, T>;
  deleted: string[];
};

type UserOverlay = {
  baseSignature: string;
  savedAt: string;
  materials: EntityOverlay<Material>;
  quests: EntityOverlay<Quest>;
};

const CACHE_KEY = "nt_craft_beta_user_overlay_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

function stableStringifyData(data: CraftData): string {
  return JSON.stringify({
    materials: sortById(data.materials),
    quests: sortById(data.quests),
  });
}

function createSignature(data: CraftData): string {
  const text = stableStringifyData(data);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}

function toMap<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function shallowEqualByJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildEntityOverlay<T extends { id: string }>(
  baseItems: T[],
  effectiveItems: T[],
): EntityOverlay<T> {
  const baseMap = toMap(baseItems);
  const effectiveMap = toMap(effectiveItems);

  const added: T[] = [];
  const updated: Record<string, T> = {};
  const deleted: string[] = [];

  for (const [id, item] of effectiveMap.entries()) {
    const baseItem = baseMap.get(id);
    if (!baseItem) {
      added.push(item);
      continue;
    }

    if (!shallowEqualByJson(baseItem, item)) {
      updated[id] = item;
    }
  }

  for (const id of baseMap.keys()) {
    if (!effectiveMap.has(id)) {
      deleted.push(id);
    }
  }

  return { added, updated, deleted };
}

function applyEntityOverlay<T extends { id: string }>(
  baseItems: T[],
  overlay: EntityOverlay<T>,
): T[] {
  const deletedSet = new Set(overlay.deleted);
  const updatedMap = new Map(Object.entries(overlay.updated));

  const merged: T[] = [];

  for (const baseItem of baseItems) {
    if (deletedSet.has(baseItem.id)) {
      continue;
    }

    const updated = updatedMap.get(baseItem.id);
    merged.push(updated ?? baseItem);
  }

  for (const added of overlay.added) {
    if (deletedSet.has(added.id)) {
      continue;
    }
    merged.push(added);
  }

  return sortById(merged);
}

function emptyOverlay(): UserOverlay {
  return {
    baseSignature: "",
    savedAt: new Date().toISOString(),
    materials: { added: [], updated: {}, deleted: [] },
    quests: { added: [], updated: {}, deleted: [] },
  };
}

function parseOverlay(raw: string): UserOverlay | null {
  try {
    const parsed = JSON.parse(raw) as Partial<UserOverlay>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      baseSignature: typeof parsed.baseSignature === "string" ? parsed.baseSignature : "",
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      materials: {
        added: Array.isArray(parsed.materials?.added) ? (parsed.materials?.added as Material[]) : [],
        updated:
          parsed.materials?.updated && typeof parsed.materials.updated === "object"
            ? (parsed.materials.updated as Record<string, Material>)
            : {},
        deleted: Array.isArray(parsed.materials?.deleted) ? (parsed.materials?.deleted as string[]) : [],
      },
      quests: {
        added: Array.isArray(parsed.quests?.added) ? (parsed.quests?.added as Quest[]) : [],
        updated:
          parsed.quests?.updated && typeof parsed.quests.updated === "object"
            ? (parsed.quests.updated as Record<string, Quest>)
            : {},
        deleted: Array.isArray(parsed.quests?.deleted) ? (parsed.quests?.deleted as string[]) : [],
      },
    };
  } catch {
    return null;
  }
}

export async function fetchBaseData(): Promise<CraftData> {
  const [materialsRes, questsRes] = await Promise.all([
    fetch("/api/materials"),
    fetch("/api/quests"),
  ]);

  if (!materialsRes.ok || !questsRes.ok) {
    throw new Error("データ読み込みに失敗しました。");
  }

  return {
    materials: (await materialsRes.json()) as Material[],
    quests: (await questsRes.json()) as Quest[],
  };
}

export function readUserOverlay(): UserOverlay | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) {
    return null;
  }

  return parseOverlay(raw);
}

export function persistOverlay(overlay: UserOverlay): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(overlay));
}

export function clearUserCache(): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(CACHE_KEY);
}

export function buildOverlayFromEffectiveData(base: CraftData, effective: CraftData): UserOverlay {
  return {
    baseSignature: createSignature(base),
    savedAt: new Date().toISOString(),
    materials: buildEntityOverlay(base.materials, effective.materials),
    quests: buildEntityOverlay(base.quests, effective.quests),
  };
}

export function applyOverlay(base: CraftData, overlay: UserOverlay | null): CraftData {
  if (!overlay) {
    return {
      materials: sortById(base.materials),
      quests: sortById(base.quests),
    };
  }

  return {
    materials: applyEntityOverlay(base.materials, overlay.materials),
    quests: applyEntityOverlay(base.quests, overlay.quests),
  };
}

export async function saveUserEffectiveData(
  effective: CraftData,
  baseData?: CraftData,
): Promise<UserOverlay> {
  const base = baseData ?? (await fetchBaseData());
  const overlay = buildOverlayFromEffectiveData(base, effective);
  persistOverlay(overlay);
  return overlay;
}

export async function loadDataWithOverlay(): Promise<{
  baseData: CraftData;
  effectiveData: CraftData;
  hasOverlay: boolean;
  savedAt?: string;
  baseUpdatedSinceOverlay: boolean;
}> {
  const base = await fetchBaseData();
  const overlay = readUserOverlay();

  if (!overlay) {
    return {
      baseData: base,
      effectiveData: applyOverlay(base, null),
      hasOverlay: false,
      baseUpdatedSinceOverlay: false,
    };
  }

  const currentBaseSignature = createSignature(base);
  const baseUpdatedSinceOverlay =
    overlay.baseSignature.length > 0 && overlay.baseSignature !== currentBaseSignature;

  return {
    baseData: base,
    effectiveData: applyOverlay(base, overlay),
    hasOverlay: true,
    savedAt: overlay.savedAt,
    baseUpdatedSinceOverlay,
  };
}

export async function getCacheInfo(): Promise<{
  hasOverlay: boolean;
  savedAt?: string;
  baseUpdatedSinceOverlay: boolean;
}> {
  const overlay = readUserOverlay();
  if (!overlay) {
    return { hasOverlay: false, baseUpdatedSinceOverlay: false };
  }

  try {
    const base = await fetchBaseData();
    const currentBaseSignature = createSignature(base);
    return {
      hasOverlay: true,
      savedAt: overlay.savedAt,
      baseUpdatedSinceOverlay:
        overlay.baseSignature.length > 0 && overlay.baseSignature !== currentBaseSignature,
    };
  } catch {
    return {
      hasOverlay: true,
      savedAt: overlay.savedAt,
      baseUpdatedSinceOverlay: false,
    };
  }
}
