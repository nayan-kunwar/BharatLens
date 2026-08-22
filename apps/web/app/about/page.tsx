import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <main className="page-shell page-content about-page">
      <header className="page-intro">
        <p className="eyebrow">About</p>
        <h1>See the world through India&apos;s lens.</h1>
        <p>
          BharatLens is an India-focused geopolitical context platform. It is not a generic news
          aggregator. The product question is: something happened in the world — what does it mean
          for India?
        </p>
      </header>

      <section className="detail-section">
        <h2>What you will see</h2>
        <ol className="about-flow">
          <li>What happened</li>
          <li>Why it happened, where evidence supports that reading</li>
          <li>Why India cares</li>
          <li>What in India is exposed</li>
          <li>What could happen (labeled as scenario, not fact)</li>
          <li>What to watch next</li>
        </ol>
      </section>

      <section className="detail-section">
        <h2>India Impact</h2>
        <p>
          <strong>India Impact</strong> is a feature inside BharatLens, not a second product name.
          Category levels such as energy or trade are product assessments with reasoning. They are
          not objective measurements.
        </p>
      </section>

      <section className="detail-section">
        <h2>Facts, analysis, and uncertainty</h2>
        <p>
          Claims are labeled FACT, ANALYSIS, SCENARIO, or UNKNOWN. Evidence strength (how well
          sources support a claim) is stored separately from analysis confidence (how sure an
          interpretation is). Neither is a statistical percentage.
        </p>
      </section>

      <section className="detail-section">
        <h2>Neutrality</h2>
        <p>
          BharatLens does not promote parties or ideologies, invent sources, or present speculation
          as fact. If evidence is thin, the honest label is UNKNOWN.
        </p>
        <p>
          <Link href="/events">Browse published events</Link>
        </p>
      </section>
    </main>
  );
}
