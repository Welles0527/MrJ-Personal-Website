import { relationLegend } from './bibleRelations';

export default function RelationLegend() {
  return (
    <section className="map-legend" aria-label="关系图例">
      {relationLegend.map((item) => (
        <article key={item.type}>
          <span className={`legend-line legend-${item.type}`} />
          <div>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
