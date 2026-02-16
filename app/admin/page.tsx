import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="admin-page">
      <h2>管理メニュー</h2>

      <section className="card">
        <h3>よく使う導線</h3>
        <div className="admin-links">
          <Link href="/" className="admin-link-card">
            <strong>Viewer</strong>
            <span>クエスト必要素材の確認</span>
          </Link>
          <Link href="/admin/materials" className="admin-link-card">
            <strong>素材リスト</strong>
            <span>素材の検索・管理・編集遷移</span>
          </Link>
          <Link href="/admin/quests" className="admin-link-card">
            <strong>クエストリスト</strong>
            <span>クエストの検索・管理・編集遷移</span>
          </Link>
        </div>
      </section>

      <section className="card">
        <h3>上級者向け</h3>
        <p className="muted">JSON一括編集は残していますが、通常運用はUI編集を推奨します。</p>
        <Link href="/admin/json" className="text-link">
          JSON一括編集へ
        </Link>
      </section>
    </main>
  );
}
