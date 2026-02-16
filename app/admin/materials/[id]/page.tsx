"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Material } from "@/lib/types";

function createNewMaterial(id: string): Material {
  return {
    id,
    name: "新規素材",
    recipe: null,
  };
}

export default function MaterialEditPage() {
  const params = useParams<{ id: string }>();
  const [materialId, setMaterialId] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editing, setEditing] = useState<Material | null>(null);
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      if (!params.id) {
        return;
      }
      const id = decodeURIComponent(params.id);
      setMaterialId(id);

      const materialsRes = await fetch("/api/materials");
      const loadedMaterials = (await materialsRes.json()) as Material[];
      setMaterials(loadedMaterials);

      if (id === "new") {
        setEditing(createNewMaterial("new_material"));
      } else {
        const found = loadedMaterials.find((material) => material.id === id);
        setEditing(found ?? null);
      }

      setLoaded(true);
    })();
  }, [params.id]);

  const materialOptions = useMemo(
    () => materials.map((material) => ({ id: material.id, name: material.name })),
    [materials],
  );

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

  async function onSave() {
    if (!editing) {
      return;
    }

    try {
      const existingIndex = materials.findIndex((material) => material.id === materialId);
      const next = [...materials];

      if (materialId === "new") {
        if (materials.some((material) => material.id === editing.id)) {
          throw new Error(`ID ${editing.id} は既に存在します。`);
        }
        next.push(editing);
      } else if (existingIndex >= 0) {
        next[existingIndex] = editing;
      } else {
        next.push(editing);
      }

      await saveMaterials(next);
      setMaterials(next);
      setMessage("保存しました。素材リストに戻って確認してください。");
    } catch (error) {
      setMessage(String(error));
    }
  }

  if (!loaded) {
    return <main className="admin-page"><p>読み込み中...</p></main>;
  }

  if (!editing) {
    return (
      <main className="admin-page">
        <h2>素材編集</h2>
        <p className="error">指定した素材が見つかりませんでした。</p>
        <Link href="/admin/materials" className="text-link">素材リストへ戻る</Link>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="row-between">
        <h2>素材編集</h2>
        <Link href="/admin/materials" className="text-link">素材リストへ戻る</Link>
      </div>

      <section className="card">
        <div className="inline-fields">
          <label>
            ID
            <input
              value={editing.id}
              onChange={(e) => setEditing({ ...editing, id: e.target.value })}
            />
          </label>

          <label>
            素材名
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
        </div>

        <label className="inline-check">
          <span>基礎素材（レシピなし）</span>
          <input
            type="checkbox"
            checked={editing.recipe === null}
            onChange={(e) => setEditing({ ...editing, recipe: e.target.checked ? null : [] })}
          />
        </label>

        {editing.recipe !== null ? (
          <div className="recipe-list">
            {editing.recipe.map((recipeItem, recipeIndex) => (
              <div className="inline-fields" key={`${editing.id}-recipe-${recipeIndex}`}>
                <select
                  value={recipeItem.material_id}
                  onChange={(e) => {
                    const recipe = [...(editing.recipe ?? [])];
                    recipe[recipeIndex] = { ...recipeItem, material_id: e.target.value };
                    setEditing({ ...editing, recipe });
                  }}
                >
                  <option value="">素材を選択</option>
                  {materialOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} ({option.id})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={1}
                  value={recipeItem.quantity}
                  onChange={(e) => {
                    const recipe = [...(editing.recipe ?? [])];
                    recipe[recipeIndex] = {
                      ...recipeItem,
                      quantity: Math.max(1, Number(e.target.value || 1)),
                    };
                    setEditing({ ...editing, recipe });
                  }}
                />

                <button
                  className="danger"
                  onClick={() => {
                    const recipe = (editing.recipe ?? []).filter((_, i) => i !== recipeIndex);
                    setEditing({ ...editing, recipe });
                  }}
                >
                  削除
                </button>
              </div>
            ))}

            <button
              onClick={() => {
                const recipe = [...(editing.recipe ?? []), { material_id: "", quantity: 1 }];
                setEditing({ ...editing, recipe });
              }}
            >
              レシピ行を追加
            </button>
          </div>
        ) : null}

        <button onClick={onSave}>保存</button>
      </section>

      <p>{message}</p>
    </main>
  );
}
