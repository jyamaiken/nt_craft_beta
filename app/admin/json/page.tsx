"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Material, Quest } from "@/lib/types";
import { fetchBaseData, loadDataWithOverlay, saveUserEffectiveData } from "@/lib/user-cache";

export default function AdminJsonPage() {
  const [rawMaterials, setRawMaterials] = useState("");
  const [rawQuests, setRawQuests] = useState("");
  const [baseMaterials, setBaseMaterials] = useState<Material[]>([]);
  const [baseQuests, setBaseQuests] = useState<Quest[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const loaded = await loadDataWithOverlay();
      setRawMaterials(JSON.stringify(loaded.effectiveData.materials, null, 2));
      setRawQuests(JSON.stringify(loaded.effectiveData.quests, null, 2));
      setBaseMaterials(loaded.baseData.materials);
      setBaseQuests(loaded.baseData.quests);
    })();
  }, []);

  async function saveMaterials(nextMaterials: Material[]) {
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextMaterials),
    });
    if (!res.ok) {
      throw new Error("素材保存に失敗しました。");
    }
  }

  async function saveQuests(nextQuests: Quest[]) {
    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextQuests),
    });
    if (!res.ok) {
      throw new Error("クエスト保存に失敗しました。");
    }
  }

  return (
    <main className="admin-page">
      <div className="row-between">
        <h2>JSON一括編集</h2>
        <Link href="/admin" className="text-link">管理メニュー</Link>
      </div>

      <section className="card">
        <p className="muted">上級者向け機能です。通常は素材/クエストのUI編集を使用してください。</p>
        <label>
          materials.json
          <textarea value={rawMaterials} onChange={(e) => setRawMaterials(e.target.value)} rows={14} />
        </label>
        <label>
          quests.json
          <textarea value={rawQuests} onChange={(e) => setRawQuests(e.target.value)} rows={14} />
        </label>
        <button
          onClick={async () => {
            try {
              const parsedMaterials = JSON.parse(rawMaterials) as Material[];
              const parsedQuests = JSON.parse(rawQuests) as Quest[];
              let apiWarning = "";
              try {
                await Promise.all([saveMaterials(parsedMaterials), saveQuests(parsedQuests)]);
              } catch {
                apiWarning = " サーバー保存は失敗しましたが、ユーザーキャッシュには保存しました。";
              }
              const baseData =
                baseMaterials.length > 0 || baseQuests.length > 0
                  ? { materials: baseMaterials, quests: baseQuests }
                  : await fetchBaseData();
              await saveUserEffectiveData(
                { materials: parsedMaterials, quests: parsedQuests },
                baseData,
              );
              setMessage(`JSONを保存しました。ユーザーキャッシュも更新しました。${apiWarning}`);
            } catch (error) {
              setMessage(String(error));
            }
          }}
        >
          JSONを保存
        </button>
      </section>

      <p>{message}</p>
    </main>
  );
}
