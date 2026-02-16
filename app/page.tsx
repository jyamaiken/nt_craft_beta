"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateQuestMaterials } from "@/lib/bom";
import { Material, Quest, TreeNode } from "@/lib/types";
import { loadDataWithOverlay } from "@/lib/user-cache";

type LoadState = "loading" | "ready" | "error";

function Tree({
  nodes,
  fixedMaterialIds,
  onToggleFixed,
  depth = 0,
}: {
  nodes: TreeNode[];
  fixedMaterialIds: Set<string>;
  onToggleFixed: (materialId: string) => void;
  depth?: number;
}) {
  return (
    <ul className={`tree-list ${depth === 0 ? "root" : "child"}`}>
      {nodes.map((node, index) => (
        <li key={`${node.id}-${index}`} className="tree-item">
          <button
            type="button"
            className={`tree-node ${node.children.length > 0 ? "branch" : "leaf"} ${node.fixed ? "fixed" : ""}`}
            onClick={() => onToggleFixed(node.id)}
            title={fixedMaterialIds.has(node.id) ? "固定を解除" : "所持済みとして固定"}
          >
            <span className="tree-name">{node.name}</span>
            <span className="tree-kind">
              {node.fixed ? "固定" : node.children.length > 0 ? "合成" : "基礎"}
            </span>
            {node.reserveRequired ? <span className="tree-reserve">予備</span> : null}
            <span className="tree-qty">x{node.quantity}</span>
          </button>
          {node.children.length > 0 ? (
            <div className="tree-children">
              <Tree
                nodes={node.children}
                fixedMaterialIds={fixedMaterialIds}
                onToggleFixed={onToggleFixed}
                depth={depth + 1}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [fixedMaterialIds, setFixedMaterialIds] = useState<Set<string>>(new Set<string>());

  useEffect(() => {
    (async () => {
      try {
        setState("loading");
        const loaded = await loadDataWithOverlay();
        const loadedMaterials = loaded.effectiveData.materials;
        const loadedQuests = loaded.effectiveData.quests;

        setMaterials(loadedMaterials);
        setQuests(loadedQuests);
        setSelectedQuestId(loadedQuests[0]?.id ?? null);
        setState("ready");
      } catch (error) {
        setState("error");
        setErrorMessage(String(error));
      }
    })();
  }, []);

  const filteredQuests = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return quests;
    }
    return quests.filter((q) => q.name.toLowerCase().includes(normalized) || q.id.toLowerCase().includes(normalized));
  }, [quests, search]);

  const selectedQuest = useMemo(
    () => quests.find((quest) => quest.id === selectedQuestId) ?? null,
    [quests, selectedQuestId],
  );

  const calculation = useMemo(() => {
    if (!selectedQuest || materials.length === 0) {
      return null;
    }
    return calculateQuestMaterials(selectedQuest.requirements, materials, fixedMaterialIds);
  }, [selectedQuest, materials, fixedMaterialIds]);

  const reserveRequiredIds = useMemo(
    () =>
      new Set(
        (selectedQuest?.requirements ?? [])
          .filter((item) => Boolean(item.reserve_required))
          .map((item) => item.material_id),
      ),
    [selectedQuest],
  );

  const materialNameById = useMemo(
    () => new Map<string, string>(materials.map((material) => [material.id, material.name])),
    [materials],
  );
  const materialById = useMemo(
    () => new Map<string, Material>(materials.map((material) => [material.id, material])),
    [materials],
  );

  const fixedMaterialList = useMemo(
    () =>
      Array.from(fixedMaterialIds)
        .map((id) => ({ id, name: materialNameById.get(id) ?? id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [fixedMaterialIds, materialNameById],
  );

  const totals = useMemo(() => {
    if (!calculation) {
      return [];
    }
    const raw = calculation.baseTotals;
    return Object.entries(raw)
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
  }, [calculation]);

  return (
    <main className="page-grid viewer-page">
      <aside className="sidebar">
        <h2>クエスト一覧</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="クエスト検索"
        />
        <div className="quest-list">
          {filteredQuests.map((quest) => (
            <button
              key={quest.id}
              className={quest.id === selectedQuestId ? "selected" : ""}
              onClick={() => setSelectedQuestId(quest.id)}
            >
              <span>{quest.name}</span>
              <small>{quest.id}</small>
            </button>
          ))}
          {filteredQuests.length === 0 ? <p>該当するクエストがありません。</p> : null}
        </div>
      </aside>

      <section className="content">
        {state === "loading" ? <p>読み込み中...</p> : null}
        {state === "error" ? <p className="error">{errorMessage}</p> : null}

        {state === "ready" && selectedQuest && calculation ? (
          <>
            <div className="section-head">
              <h2>{selectedQuest.name}</h2>
              <p>{selectedQuest.id}</p>
            </div>

            <div className="card">
              <div className="row-between">
                <h3>合成ツリー</h3>
                <p className="tree-legend">
                  <span className="legend-chip branch">合成</span>
                  <span className="legend-chip leaf">基礎</span>
                  <span className="legend-chip fixed">固定</span>
                  <span className="legend-chip reserve">予備</span>
                </p>
              </div>
              <p className="muted">素材をクリックすると「所持済みとして固定/解除」できます。</p>
              {fixedMaterialList.length > 0 ? (
                <div className="fixed-list">
                  <strong>固定中:</strong>
                  {fixedMaterialList.map((item) => (
                    <button
                      key={item.id}
                      className="fixed-chip"
                      onClick={() =>
                        setFixedMaterialIds((prev) => {
                          const next = new Set(prev);
                          next.delete(item.id);
                          return next;
                        })
                      }
                    >
                      {item.name}
                    </button>
                  ))}
                  <button className="danger" onClick={() => setFixedMaterialIds(new Set<string>())}>
                    すべて解除
                  </button>
                </div>
              ) : null}
              <Tree
                nodes={calculation.tree}
                fixedMaterialIds={fixedMaterialIds}
                onToggleFixed={(materialId) =>
                  setFixedMaterialIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(materialId)) {
                      next.delete(materialId);
                    } else {
                      next.add(materialId);
                    }
                    return next;
                  })
                }
              />
            </div>

            <div className="card">
              <h3>必要素材一覧</h3>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>素材名</th>
                    <th>数量</th>
                    <th>備考</th>
                    <th>入手メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{reserveRequiredIds.has(item.id) ? "予備必要" : ""}</td>
                      <td>{materialById.get(item.id)?.acquisition_note || "-"}</td>
                    </tr>
                  ))}
                  {totals.length === 0 ? (
                    <tr>
                      <td colSpan={5}>必要素材はありません（固定設定により全て充足）。</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
