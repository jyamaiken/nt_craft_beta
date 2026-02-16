"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Material, Quest } from "@/lib/types";

type LoadState = "loading" | "ready" | "error";

function recipeSummary(material: Material, nameById: Map<string, string>): string {
  if (!material.recipe || material.recipe.length === 0) {
    return "基礎素材";
  }

  return material.recipe
    .map((item) => `${nameById.get(item.material_id) ?? item.material_id} x${item.quantity}`)
    .join(", ");
}

function requirementsSummary(quest: Quest, nameById: Map<string, string>): string {
  if (quest.requirements.length === 0) {
    return "必要素材なし";
  }

  return quest.requirements
    .map((item) => `${nameById.get(item.material_id) ?? item.material_id} x${item.quantity}`)
    .join(", ");
}

export default function AdminListPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [questFilter, setQuestFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setState("loading");
        const [materialsRes, questsRes] = await Promise.all([
          fetch("/api/materials"),
          fetch("/api/quests"),
        ]);

        if (!materialsRes.ok || !questsRes.ok) {
          throw new Error("一覧データの読み込みに失敗しました。");
        }

        setMaterials((await materialsRes.json()) as Material[]);
        setQuests((await questsRes.json()) as Quest[]);
        setState("ready");
      } catch (error) {
        setState("error");
        setMessage(String(error));
      }
    })();
  }, []);

  const materialNameById = useMemo(
    () => new Map<string, string>(materials.map((material) => [material.id, material.name])),
    [materials],
  );

  const materialRefs = useMemo(() => {
    const refsInRecipes: Record<string, number> = {};
    const refsInQuests: Record<string, number> = {};

    for (const material of materials) {
      for (const ingredient of material.recipe ?? []) {
        refsInRecipes[ingredient.material_id] = (refsInRecipes[ingredient.material_id] ?? 0) + 1;
      }
    }

    for (const quest of quests) {
      for (const requirement of quest.requirements) {
        refsInQuests[requirement.material_id] = (refsInQuests[requirement.material_id] ?? 0) + 1;
      }
    }

    return { refsInRecipes, refsInQuests };
  }, [materials, quests]);

  const filteredMaterials = useMemo(() => {
    const keyword = materialFilter.trim().toLowerCase();
    if (!keyword) {
      return materials;
    }
    return materials.filter(
      (material) =>
        material.id.toLowerCase().includes(keyword) || material.name.toLowerCase().includes(keyword),
    );
  }, [materials, materialFilter]);

  const filteredQuests = useMemo(() => {
    const keyword = questFilter.trim().toLowerCase();
    if (!keyword) {
      return quests;
    }
    return quests.filter(
      (quest) => quest.id.toLowerCase().includes(keyword) || quest.name.toLowerCase().includes(keyword),
    );
  }, [quests, questFilter]);

  async function saveMaterials(nextMaterials: Material[]) {
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextMaterials),
    });
    if (!res.ok) {
      throw new Error("素材の保存に失敗しました。");
    }
  }

  async function saveQuests(nextQuests: Quest[]) {
    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextQuests),
    });
    if (!res.ok) {
      throw new Error("クエストの保存に失敗しました。");
    }
  }

  async function deleteMaterial(materialId: string) {
    const refsRecipe = materialRefs.refsInRecipes[materialId] ?? 0;
    const refsQuest = materialRefs.refsInQuests[materialId] ?? 0;
    if (refsRecipe > 0 || refsQuest > 0) {
      setMessage(
        `素材 ${materialId} は参照中です (レシピ: ${refsRecipe}, クエスト: ${refsQuest})。先に参照先を編集してください。`,
      );
      return;
    }

    if (!window.confirm(`素材 ${materialId} を削除します。よろしいですか？`)) {
      return;
    }

    try {
      const next = materials.filter((material) => material.id !== materialId);
      await saveMaterials(next);
      setMaterials(next);
      setMessage(`素材 ${materialId} を削除しました。`);
    } catch (error) {
      setMessage(String(error));
    }
  }

  async function deleteQuest(questId: string) {
    if (!window.confirm(`クエスト ${questId} を削除します。よろしいですか？`)) {
      return;
    }

    try {
      const next = quests.filter((quest) => quest.id !== questId);
      await saveQuests(next);
      setQuests(next);
      setMessage(`クエスト ${questId} を削除しました。`);
    } catch (error) {
      setMessage(String(error));
    }
  }

  return (
    <main className="admin-page list-page">
      <div className="row-between">
        <h2>登録済み一覧</h2>
        <Link href="/admin" className="text-link">
          編集画面へ戻る
        </Link>
      </div>

      {state === "loading" ? <p>読み込み中...</p> : null}
      {state === "error" ? <p className="error">{message}</p> : null}

      {state === "ready" ? (
        <>
          <section className="card">
            <div className="row-between">
              <h3>素材一覧 ({filteredMaterials.length})</h3>
              <input
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
                placeholder="素材ID・名前で検索"
                className="list-filter"
              />
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>素材名</th>
                  <th>種別</th>
                  <th>レシピ</th>
                  <th>参照(レシピ)</th>
                  <th>参照(クエスト)</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((material) => (
                  <tr key={material.id}>
                    <td>{material.id}</td>
                    <td>{material.name}</td>
                    <td>{material.recipe && material.recipe.length > 0 ? "合成素材" : "基礎素材"}</td>
                    <td>{recipeSummary(material, materialNameById)}</td>
                    <td>{materialRefs.refsInRecipes[material.id] ?? 0}</td>
                    <td>{materialRefs.refsInQuests[material.id] ?? 0}</td>
                    <td>
                      <button className="danger" onClick={() => deleteMaterial(material.id)}>
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <div className="row-between">
              <h3>クエスト一覧 ({filteredQuests.length})</h3>
              <input
                value={questFilter}
                onChange={(e) => setQuestFilter(e.target.value)}
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
                    <td>{requirementsSummary(quest, materialNameById)}</td>
                    <td>
                      <button className="danger" onClick={() => deleteQuest(quest.id)}>
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p>{message}</p>
        </>
      ) : null}
    </main>
  );
}
