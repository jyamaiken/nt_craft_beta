import { Material, Quest } from "@/lib/types";

type CraftData = {
  materials: Material[];
  quests: Quest[];
};

type CachePayload = CraftData & {
  savedAt: string;
};

const CACHE_KEY = "nt_craft_beta_user_cache_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isArrayValue(value: unknown): boolean {
  return Array.isArray(value);
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

export function readUserCache(): CachePayload | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CachePayload>;
    if (!isArrayValue(parsed.materials) && !isArrayValue(parsed.quests)) {
      return null;
    }
    return {
      materials: isArrayValue(parsed.materials) ? (parsed.materials as Material[]) : [],
      quests: isArrayValue(parsed.quests) ? (parsed.quests as Quest[]) : [],
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeUserCache(data: CraftData): void {
  if (!isBrowser()) {
    return;
  }

  const payload: CachePayload = {
    ...data,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export function mergeUserCache(
  partial: Partial<CraftData>,
  fallback?: CraftData,
): CachePayload | null {
  if (!isBrowser()) {
    return null;
  }

  const current = readUserCache();
  const base: CraftData =
    current ??
    fallback ?? {
      materials: [],
      quests: [],
    };

  const merged: CraftData = {
    materials: partial.materials ?? base.materials,
    quests: partial.quests ?? base.quests,
  };
  writeUserCache(merged);
  return readUserCache();
}

export function clearUserCache(): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(CACHE_KEY);
}

export async function loadDataPreferUserCache(): Promise<{
  data: CraftData;
  fromCache: boolean;
  savedAt?: string;
}> {
  const base = await fetchBaseData();
  const cache = readUserCache();
  if (!cache) {
    return { data: base, fromCache: false };
  }

  return {
    data: {
      materials: cache.materials.length > 0 ? cache.materials : base.materials,
      quests: cache.quests.length > 0 ? cache.quests : base.quests,
    },
    fromCache: true,
    savedAt: cache.savedAt,
  };
}
