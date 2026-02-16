"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Material, Quest } from "@/lib/types";
import { fetchBaseData, loadDataWithOverlay, saveUserEffectiveData } from "@/lib/user-cache";

function createNewQuest(id: string): Quest {
  return {
    id,
    name: "新規クエスト",
    requirements: [],
  };
}

export default function QuestEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [questId, setQuestId] = useState("");
  const [quests, setQuests] = useState<Quest[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [baseMaterials, setBaseMaterials] = useState<Material[]>([]);
  const [baseQuests, setBaseQuests] = useState<Quest[]>([]);
  const [editing, setEditing] = useState<Quest | null>(null);
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!params.id) {
          return;
        }
        const id = decodeURIComponent(params.id);
        setQuestId(id);

        const loaded = await loadDataWithOverlay();
        const loadedMaterials = loaded.effectiveData.materials;
        const loadedQuests = loaded.effectiveData.quests;
        setMaterials(loadedMaterials);
        setQuests(loadedQuests);
        setBaseMaterials(loaded.baseData.materials);
        setBaseQuests(loaded.baseData.quests);

        if (id === "new") {
          setEditing(createNewQuest("new_quest"));
        } else {
          const found = loadedQuests.find((quest) => quest.id === id);
          setEditing(found ?? null);
        }
      } catch (error) {
        setMessage(String(error));
      } finally {
        setLoaded(true);
      }
    })();
  }, [params.id]);

  const materialOptions = useMemo(
    () => materials.map((material) => ({ id: material.id, name: material.name })),
    [materials],
  );

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

  async function onSave() {
    if (!editing) {
      return;
    }

    try {
      const normalizedId = editing.id.trim();
      const normalizedName = editing.name.trim();
      if (!normalizedId || !normalizedName) {
        throw new Error("クエストIDとクエスト名は必須です。");
      }
      if (editing.requirements.some((item) => !item.material_id.trim())) {
        throw new Error("必要素材に未選択の素材があります。");
      }

      const normalizedEditing: Quest = {
        ...editing,
        id: normalizedId,
        name: normalizedName,
        requirements: editing.requirements.map((item) => ({
          material_id: item.material_id.trim(),
          quantity: item.quantity,
        })),
      };

      const existingIndex = quests.findIndex((quest) => quest.id === questId);
      const next = [...quests];

      if (questId === "new") {
        if (quests.some((quest) => quest.id === normalizedEditing.id)) {
          throw new Error(`ID ${normalizedEditing.id} は既に存在します。`);
        }
        next.push(normalizedEditing);
      } else if (existingIndex >= 0) {
        next[existingIndex] = normalizedEditing;
      } else {
        next.push(normalizedEditing);
      }

      let apiWarning = "";
      try {
        await saveQuests(next);
      } catch {
        apiWarning = " サーバー保存は失敗しましたが、ユーザーキャッシュには保存しました。";
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
      router.push("/admin/quests");
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
        <h2>クエスト編集</h2>
        <p className="error">指定したクエストが見つかりませんでした。</p>
        <Link href="/admin/quests" className="text-link">クエストリストへ戻る</Link>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="row-between">
        <h2>クエスト編集</h2>
        <Link href="/admin/quests" className="text-link">クエストリストへ戻る</Link>
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
            クエスト名
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
        </div>

        {editing.requirements.map((requirement, reqIndex) => (
          <div className="inline-fields" key={`${editing.id}-req-${reqIndex}`}>
            <select
              value={requirement.material_id}
              onChange={(e) => {
                const requirements = [...editing.requirements];
                requirements[reqIndex] = { ...requirement, material_id: e.target.value };
                setEditing({ ...editing, requirements });
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
                const requirements = [...editing.requirements];
                requirements[reqIndex] = {
                  ...requirement,
                  quantity: Math.max(1, Number(e.target.value || 1)),
                };
                setEditing({ ...editing, requirements });
              }}
            />

            <button
              className="danger"
              onClick={() => {
                const requirements = editing.requirements.filter((_, i) => i !== reqIndex);
                setEditing({ ...editing, requirements });
              }}
            >
              削除
            </button>
          </div>
        ))}

        <button
          onClick={() => {
            const requirements = [...editing.requirements, { material_id: "", quantity: 1 }];
            setEditing({ ...editing, requirements });
          }}
        >
          必要素材行を追加
        </button>

        <button onClick={onSave}>保存</button>
      </section>

      <p>{message}</p>
    </main>
  );
}
