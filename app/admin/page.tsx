"use client";

import { useEffect, useMemo, useState } from "react";
import { Material, Quest } from "@/lib/types";

function materialTemplate(): Material {
  return {
    id: "new_material",
    name: "新規素材",
    recipe: null,
  };
}

function questTemplate(): Quest {
  return {
    id: "new_quest",
    name: "新規クエスト",
    requirements: [],
  };
}

export default function AdminPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [activeTab, setActiveTab] = useState<"materials" | "quests" | "json">("materials");
  const [message, setMessage] = useState("");
  const [rawMaterials, setRawMaterials] = useState("");
  const [rawQuests, setRawQuests] = useState("");

  useEffect(() => {
    (async () => {
      const [materialsRes, questsRes] = await Promise.all([
        fetch("/api/materials"),
        fetch("/api/quests"),
      ]);
      const loadedMaterials = (await materialsRes.json()) as Material[];
      const loadedQuests = (await questsRes.json()) as Quest[];
      setMaterials(loadedMaterials);
      setQuests(loadedQuests);
    })();
  }, []);

  useEffect(() => {
    setRawMaterials(JSON.stringify(materials, null, 2));
  }, [materials]);

  useEffect(() => {
    setRawQuests(JSON.stringify(quests, null, 2));
  }, [quests]);

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
      <h2>管理画面</h2>

      <div className="tabs">
        <button onClick={() => setActiveTab("materials")} className={activeTab === "materials" ? "selected" : ""}>素材</button>
        <button onClick={() => setActiveTab("quests")} className={activeTab === "quests" ? "selected" : ""}>クエスト</button>
        <button onClick={() => setActiveTab("json")} className={activeTab === "json" ? "selected" : ""}>JSON編集</button>
      </div>

      {activeTab === "materials" ? (
        <section className="card">
          <div className="row-between">
            <h3>素材エディタ</h3>
            <button onClick={() => setMaterials((prev) => [...prev, materialTemplate()])}>素材を追加</button>
          </div>

          {materials.map((material, index) => (
            <div className="editor-block" key={`${material.id}-${index}`}>
              <div className="inline-fields">
                <label>
                  ID
                  <input
                    value={material.id}
                    onChange={(e) => {
                      const next = [...materials];
                      next[index] = { ...material, id: e.target.value };
                      setMaterials(next);
                    }}
                  />
                </label>

                <label>
                  素材名
                  <input
                    value={material.name}
                    onChange={(e) => {
                      const next = [...materials];
                      next[index] = { ...material, name: e.target.value };
                      setMaterials(next);
                    }}
                  />
                </label>

                <button
                  className="danger"
                  onClick={() => setMaterials((prev) => prev.filter((_, i) => i !== index))}
                >
                  削除
                </button>
              </div>

              <label>
                <input
                  type="checkbox"
                  checked={material.recipe === null}
                  onChange={(e) => {
                    const next = [...materials];
                    next[index] = { ...material, recipe: e.target.checked ? null : [] };
                    setMaterials(next);
                  }}
                />
                基礎素材 (recipeなし)
              </label>

              {material.recipe !== null ? (
                <div className="recipe-list">
                  {material.recipe.map((recipeItem, recipeIndex) => (
                    <div className="inline-fields" key={`${material.id}-recipe-${recipeIndex}`}>
                      <select
                        value={recipeItem.material_id}
                        onChange={(e) => {
                          const next = [...materials];
                          const recipe = [...(material.recipe ?? [])];
                          recipe[recipeIndex] = { ...recipeItem, material_id: e.target.value };
                          next[index] = { ...material, recipe };
                          setMaterials(next);
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
                          const next = [...materials];
                          const recipe = [...(material.recipe ?? [])];
                          recipe[recipeIndex] = {
                            ...recipeItem,
                            quantity: Math.max(1, Number(e.target.value || 1)),
                          };
                          next[index] = { ...material, recipe };
                          setMaterials(next);
                        }}
                      />
                      <button
                        className="danger"
                        onClick={() => {
                          const next = [...materials];
                          const recipe = (material.recipe ?? []).filter((_, i) => i !== recipeIndex);
                          next[index] = { ...material, recipe };
                          setMaterials(next);
                        }}
                      >
                        削除
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      const next = [...materials];
                      const recipe = [...(material.recipe ?? []), { material_id: "", quantity: 1 }];
                      next[index] = { ...material, recipe };
                      setMaterials(next);
                    }}
                  >
                    レシピ行を追加
                  </button>
                </div>
              ) : null}
            </div>
          ))}

          <button
            onClick={async () => {
              try {
                await saveMaterials(materials);
                setMessage("素材を保存しました。");
              } catch (error) {
                setMessage(String(error));
              }
            }}
          >
            素材を保存
          </button>
        </section>
      ) : null}

      {activeTab === "quests" ? (
        <section className="card">
          <div className="row-between">
            <h3>クエストエディタ</h3>
            <button onClick={() => setQuests((prev) => [...prev, questTemplate()])}>クエストを追加</button>
          </div>

          {quests.map((quest, index) => (
            <div className="editor-block" key={`${quest.id}-${index}`}>
              <div className="inline-fields">
                <label>
                  ID
                  <input
                    value={quest.id}
                    onChange={(e) => {
                      const next = [...quests];
                      next[index] = { ...quest, id: e.target.value };
                      setQuests(next);
                    }}
                  />
                </label>

                <label>
                  クエスト名
                  <input
                    value={quest.name}
                    onChange={(e) => {
                      const next = [...quests];
                      next[index] = { ...quest, name: e.target.value };
                      setQuests(next);
                    }}
                  />
                </label>

                <button className="danger" onClick={() => setQuests((prev) => prev.filter((_, i) => i !== index))}>
                  削除
                </button>
              </div>

              {quest.requirements.map((requirement, reqIndex) => (
                <div className="inline-fields" key={`${quest.id}-req-${reqIndex}`}>
                  <select
                    value={requirement.material_id}
                    onChange={(e) => {
                      const next = [...quests];
                      const requirements = [...quest.requirements];
                      requirements[reqIndex] = { ...requirement, material_id: e.target.value };
                      next[index] = { ...quest, requirements };
                      setQuests(next);
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
                    value={requirement.quantity}
                    onChange={(e) => {
                      const next = [...quests];
                      const requirements = [...quest.requirements];
                      requirements[reqIndex] = {
                        ...requirement,
                        quantity: Math.max(1, Number(e.target.value || 1)),
                      };
                      next[index] = { ...quest, requirements };
                      setQuests(next);
                    }}
                  />
                  <button
                    className="danger"
                    onClick={() => {
                      const next = [...quests];
                      const requirements = quest.requirements.filter((_, i) => i !== reqIndex);
                      next[index] = { ...quest, requirements };
                      setQuests(next);
                    }}
                  >
                    削除
                  </button>
                </div>
              ))}

              <button
                onClick={() => {
                  const next = [...quests];
                  const requirements = [...quest.requirements, { material_id: "", quantity: 1 }];
                  next[index] = { ...quest, requirements };
                  setQuests(next);
                }}
              >
                必要素材行を追加
              </button>
            </div>
          ))}

          <button
            onClick={async () => {
              try {
                await saveQuests(quests);
                setMessage("クエストを保存しました。");
              } catch (error) {
                setMessage(String(error));
              }
            }}
          >
            クエストを保存
          </button>
        </section>
      ) : null}

      {activeTab === "json" ? (
        <section className="card">
          <h3>JSON直接編集モード</h3>
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
                await Promise.all([saveMaterials(parsedMaterials), saveQuests(parsedQuests)]);
                setMaterials(parsedMaterials);
                setQuests(parsedQuests);
                setMessage("JSONを保存しました。");
              } catch (error) {
                setMessage(String(error));
              }
            }}
          >
            JSONを保存
          </button>
        </section>
      ) : null}

      <p>{message}</p>
    </main>
  );
}
