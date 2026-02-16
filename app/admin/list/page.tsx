import Link from "next/link";

export default function AdminListIndexPage() {
  return (
    <main className="admin-page">
      <h2>一覧ページ</h2>
      <section className="card">
        <div className="admin-links">
          <Link href="/admin/materials" className="admin-link-card">
            <strong>素材リスト</strong>
            <span>登録済み素材の検索と管理</span>
          </Link>
          <Link href="/admin/quests" className="admin-link-card">
            <strong>クエストリスト</strong>
            <span>登録済みクエストの検索と管理</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
