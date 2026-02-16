"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateQuestMaterials } from "@/lib/bom";
import { Material, Quest, TreeNode } from "@/lib/types";
import { loadDataPreferUserCache } from "@/lib/user-cache";

type LoadState = "loading" | "ready" | "error";

function Tree({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="tree-list">
      {nodes.map((node, index) => (
        <li key={`${node.id}-${index}`} className="tree-item">
          <div className={`tree-node ${node.children.length > 0 ? "branch" : "leaf"}`}>
            <span className="tree-name">{node.name}</span>
            <span className="tree-kind">{node.children.length > 0 ? "合成" : "基礎"}</span>
            <span className="tree-qty">x{node.quantity}</span>
          </div>
          {node.children.length > 0 ? (
            <div className="tree-children">
              <Tree nodes={node.children} />
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
  const [showIntermediate, setShowIntermediate] = useState(false);
  const [cacheMessage, setCacheMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setState("loading");
        const loaded = await loadDataPreferUserCache();
        const loadedMaterials = loaded.data.materials;
        const loadedQuests = loaded.data.quests;

        setMaterials(loadedMaterials);
        setQuests(loadedQuests);
        setSelectedQuestId(loadedQuests[0]?.id ?? null);
        setCacheMessage(
          loaded.fromCache
            ? "ブラウザ保存データを反映中です。管理メニューから初期値に戻せます。"
            : "",
        );
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
    return calculateQuestMaterials(selectedQuest.requirements, materials);
  }, [selectedQuest, materials]);

  const totals = useMemo(() => {
    if (!calculation) {
      return [];
    }
    const raw = showIntermediate ? calculation.allTotals : calculation.baseTotals;
    return Object.entries(raw)
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
  }, [calculation, showIntermediate]);

  return (
    <main className="page-grid">
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
              {cacheMessage ? <p className="muted">{cacheMessage}</p> : null}
            </div>

            <div className="card">
              <div className="row-between">
                <h3>合成ツリー</h3>
                <p className="tree-legend">
                  <span className="legend-chip branch">合成</span>
                  <span className="legend-chip leaf">基礎</span>
                </p>
              </div>
              <Tree nodes={calculation.tree} />
            </div>

            <div className="card">
              <div className="row-between">
                <h3>必要素材一覧</h3>
                <label>
                  <input
                    type="checkbox"
                    checked={showIntermediate}
                    onChange={(e) => setShowIntermediate(e.target.checked)}
                  />
                  中間素材を含める
                </label>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>素材名</th>
                    <th>数量</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
