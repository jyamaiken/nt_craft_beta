"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Material, Quest } from "@/lib/types";
import { loadDataPreferUserCache, mergeUserCache } from "@/lib/user-cache";

type LoadState = "loading" | "ready" | "error";

function recipeSummary(material: Material, nameById: Map<string, string>): string {
  if (!material.recipe || material.recipe.length === 0) {
    return "基礎素材";
  }

  return material.recipe
    .map((item) => {
      const materialName = nameById.get(item.material_id);
      if (!materialName) {
        return `未登録素材（${item.material_id}）${item.quantity}個`;
      }
      return `${materialName} ${item.quantity}個`;
    })
    .join("、");
}

export default function MaterialsListPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setState("loading");
        const loaded = await loadDataPreferUserCache();
        setMaterials(loaded.data.materials);
        setQuests(loaded.data.quests);
        setState("ready");
      } catch (error) {
        setState("error");
        setMessage(String(error));
      }
    })();
  }, []);

  const nameById = useMemo(
    () => new Map<string, string>(materials.map((material) => [material.id, material.name])),
    [materials],
  );

  const refs = useMemo(() => {
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
    const keyword = filter.trim().toLowerCase();
    if (!keyword) {
      return materials;
    }
    return materials.filter(
      (material) =>
        material.id.toLowerCase().includes(keyword) || material.name.toLowerCase().includes(keyword),
    );
  }, [filter, materials]);

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

  async function deleteMaterial(materialId: string) {
    const refsRecipe = refs.refsInRecipes[materialId] ?? 0;
    const refsQuest = refs.refsInQuests[materialId] ?? 0;
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
      let apiWarning = "";
      try {
        await saveMaterials(next);
      } catch {
        apiWarning = " サーバー削除は失敗しましたが、ユーザーキャッシュは更新しました。";
      }
      mergeUserCache({ materials: next }, { materials: next, quests });
      setMaterials(next);
      setMessage(`素材 ${materialId} を削除しました。ユーザーキャッシュも更新しました。${apiWarning}`);
    } catch (error) {
      setMessage(String(error));
    }
  }

  return (
    <main className="admin-page list-page">
      <div className="row-between">
        <h2>素材リスト</h2>
        <div className="inline-actions">
          <Link href="/admin" className="text-link">管理メニュー</Link>
          <Link href="/admin/materials/new" className="text-link">新規素材を作成</Link>
        </div>
      </div>

      {state === "loading" ? <p>読み込み中...</p> : null}
      {state === "error" ? <p className="error">{message}</p> : null}

      {state === "ready" ? (
        <section className="card">
          <div className="row-between">
            <h3>登録済み素材 ({filteredMaterials.length})</h3>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
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
                  <td>{recipeSummary(material, nameById)}</td>
                  <td>{refs.refsInRecipes[material.id] ?? 0}</td>
                  <td>{refs.refsInQuests[material.id] ?? 0}</td>
                  <td className="inline-actions">
                    <Link href={`/admin/materials/${encodeURIComponent(material.id)}`} className="text-link">編集</Link>
                    <button className="danger" onClick={() => deleteMaterial(material.id)}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <p>{message}</p>
    </main>
  );
}
