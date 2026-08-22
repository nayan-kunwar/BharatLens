import type { Metadata } from 'next';
import Link from 'next/link';
import { DataUnavailable } from '../components/data-unavailable';
import { getTopics } from '../lib/api';

export const metadata: Metadata = { title: 'Topics' };

export default async function TopicsPage() {
  const topics = await getTopics().catch(() => null);

  return (
    <main className="page-shell page-content">
      <header className="page-intro">
        <p className="eyebrow">Topics</p>
        <h1>Issue areas</h1>
        <p>Follow global developments through the themes that matter to India.</p>
      </header>
      {topics ? (
        <div className="directory-grid">
          {topics.map((topic) => (
            <Link className="directory-item" href={`/topics/${topic.slug}`} key={topic.slug}>
              <span>Topic</span>
              <strong>{topic.name}</strong>
            </Link>
          ))}
        </div>
      ) : (
        <DataUnavailable area="Topics" />
      )}
    </main>
  );
}
