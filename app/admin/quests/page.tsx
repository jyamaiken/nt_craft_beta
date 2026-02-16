"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Material, Quest } from "@/lib/types";
import { fetchBaseData, loadDataWithOverlay, saveUserEffectiveData } from "@/lib/user-cache";

function requirementsSummary(quest: Quest, nameById: Map<string, string>): string {
  if (quest.requirements.length === 0) {
    return "必要素材なし";
  }

  return quest.requirements
    .map((item) => {
      const label = `${nameById.get(item.material_id) ?? item.material_id} x${item.quantity}`;
      return item.reserve_required ? `${label}(予備)` : label;
    })
    .join(", ");
}

export default function QuestsListPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [baseMaterials, setBaseMaterials] = useState<Material[]>([]);
  const [baseQuests, setBaseQuests] = useState<Quest[]>([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadDataWithOverlay();
        setMaterials(loaded.effectiveData.materials);
        setQuests(loaded.effectiveData.quests);
        setBaseMaterials(loaded.baseData.materials);
        setBaseQuests(loaded.baseData.quests);
      } catch {
        setMessage("クエスト一覧の読み込みに失敗しました。");
      }
    })();
  }, []);

  const nameById = useMemo(
    () => new Map<string, string>(materials.map((material) => [material.id, material.name])),
    [materials],
  );

  const filteredQuests = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    if (!keyword) {
      return quests;
    }

    return quests.filter(
      (quest) => quest.id.toLowerCase().includes(keyword) || quest.name.toLowerCase().includes(keyword),
    );
  }, [filter, quests]);

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

  async function deleteQuest(questId: string) {
    if (!window.confirm(`クエスト ${questId} を削除します。よろしいですか？`)) {
      return;
    }

    try {
      const next = quests.filter((quest) => quest.id !== questId);
      let apiWarning = "";
      try {
        await saveQuests(next);
      } catch {
        apiWarning = " サーバー削除は失敗しましたが、ユーザーキャッシュは更新しました。";
      }
      const baseData =
        baseMaterials.length > 0 || baseQuests.length > 0
          ? { materials: baseMaterials, quests: baseQuests }
          : await fetchBaseData();
      await saveUserEffectiveData({ materials, quests: next }, baseData);
      setQuests(next);
      if (apiWarning) {
        console.warn(apiWarning.trim());
      }
      setMessage(`クエスト ${questId} を削除しました。`);
    } catch (error) {
      setMessage(String(error));
    }
  }

  return (
    <main className="admin-page list-page">
      <div className="row-between">
        <h2>クエストリスト</h2>
        <div className="inline-actions">
          <Link href="/admin" className="text-link">管理メニュー</Link>
          <Link href="/admin/quests/new" className="text-link">新規クエストを作成</Link>
        </div>
      </div>

      <section className="card">
        <div className="row-between">
          <h3>登録済みクエスト ({filteredQuests.length})</h3>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="クエストID・名前で検索"
            className="list-filter"
          />
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>クエスト名</th>
              <th>必要素材</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuests.map((quest) => (
              <tr key={quest.id}>
                <td>{quest.id}</td>
                <td>{quest.name}</td>
                <td>{requirementsSummary(quest, nameById)}</td>
                <td className="inline-actions">
                  <Link href={`/admin/quests/${encodeURIComponent(quest.id)}`} className="text-link">編集</Link>
                  <button className="danger" onClick={() => deleteQuest(quest.id)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p>{message}</p>
    </main>
  );
}
