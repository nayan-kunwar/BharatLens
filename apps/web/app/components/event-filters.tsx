import type { Country, ImportanceLevel, Topic } from '../lib/api';

const importanceLevels: ImportanceLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

type EventFiltersProps = {
  countries: Country[];
  topics: Topic[];
  current: {
    country?: string;
    topic?: string;
    importance?: ImportanceLevel;
    sort?: string;
  };
};

export function EventFilters({ countries, topics, current }: EventFiltersProps) {
  return (
    <form action="/events" className="filter-bar">
      <label>
        <span>Country</span>
        <select defaultValue={current.country ?? ''} name="country">
          <option value="">All countries</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Topic</span>
        <select defaultValue={current.topic ?? ''} name="topic">
          <option value="">All topics</option>
          {topics.map((topic) => (
            <option key={topic.slug} value={topic.slug}>
              {topic.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Importance</span>
        <select defaultValue={current.importance ?? ''} name="importance">
          <option value="">All levels</option>
          {importanceLevels.map((level) => (
            <option key={level} value={level}>
              {level.charAt(0)}
              {level.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Sort by</span>
        <select defaultValue={current.sort ?? 'publishedAt'} name="sort">
          <option value="publishedAt">Recently published</option>
          <option value="updatedAt">Recently updated</option>
          <option value="occurredAt">Date occurred</option>
        </select>
      </label>
      <input name="order" type="hidden" value="desc" />
      <button type="submit">Apply filters</button>
    </form>
  );
}
