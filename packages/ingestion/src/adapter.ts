export type RawArticle = {
  title: string;
  url: string;
  externalId?: string;
  author?: string;
  publishedAt?: string;
  summary?: string;
};

export interface NewsSourceAdapter {
  fetchArticles(): Promise<RawArticle[]>;
}
