import dagre from "@dagrejs/dagre";

export const REFERENCE_POSITIONS = {
  samuel: { x: 190, y: 40 },
  nathan: { x: 420, y: 40 },
  jesse: { x: 70, y: 175 },
  michal: { x: 45, y: 330 },
  bathsheba: { x: 180, y: 455 },
  david: { x: 365, y: 235 },
  saul: { x: 650, y: 75 },
  jonathan: { x: 735, y: 200 },
  goliath: { x: 675, y: 335 },
  solomon: { x: 330, y: 480 },
  absalom: { x: 500, y: 485 },
  "elah-battle": { x: 630, y: 455 },
  "book-1sam17": { x: 820, y: 460 },
};

const NODE_SIZE = {
  person: { width: 120, height: 104 },
  event: { width: 138, height: 92 },
  book: { width: 152, height: 88 },
  place: { width: 130, height: 92 },
  group: { width: 130, height: 92 },
};

export function getReferenceLayout(entities) {
  return Object.fromEntries(
    entities.map((entity, index) => [
      entity.id,
      REFERENCE_POSITIONS[entity.id] ?? { x: 160 + (index % 4) * 180, y: 80 + Math.floor(index / 4) * 140 },
    ]),
  );
}

export function getCoreLayout(entities, centerId) {
  if (centerId === "david") return getReferenceLayout(entities);

  const center = { x: 510, y: 300 };
  const peripheral = entities.filter((entity) => entity.id !== centerId);
  const positions = {
    [centerId]: {
      x: center.x - NODE_SIZE.person.width / 2,
      y: center.y - NODE_SIZE.person.height / 2,
    },
  };

  peripheral.forEach((entity, index) => {
    const size = NODE_SIZE[entity.type] ?? NODE_SIZE.person;
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(peripheral.length, 1);
    positions[entity.id] = {
      x: center.x + Math.cos(angle) * 380 - size.width / 2,
      y: center.y + Math.sin(angle) * 240 - size.height / 2,
    };
  });

  return positions;
}

export function getDagreLayout(entities, relations, direction = "LR") {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: direction === "LR" ? 46 : 54,
    ranksep: direction === "LR" ? 118 : 100,
    marginx: 36,
    marginy: 28,
    acyclicer: "greedy",
    ranker: "network-simplex",
  });

  entities.forEach((entity) => {
    const size = NODE_SIZE[entity.type] ?? NODE_SIZE.person;
    graph.setNode(entity.id, { ...size });
  });
  relations.forEach((relation) => graph.setEdge(relation.sourceId, relation.targetId));
  dagre.layout(graph);

  return Object.fromEntries(
    entities.map((entity) => {
      const size = NODE_SIZE[entity.type] ?? NODE_SIZE.person;
      const position = graph.node(entity.id);
      return [entity.id, { x: position.x - size.width / 2, y: position.y - size.height / 2 }];
    }),
  );
}

export function getTimelineLayout(entities) {
  const datedEntities = entities.map((entity, index) => ({
    entity,
    index,
    year: entity.time.start ?? entity.time.end,
  }));
  const years = datedEntities.map(({ year }) => year).filter(Number.isFinite);
  const min = (years.length ? Math.min(...years) : 0) - 15;
  const max = (years.length ? Math.max(...years) : 1) + 15;
  const span = Math.max(max - min, 1);
  const timelineX = (year) => 60 + (((Number.isFinite(year) ? year : max) - min) / span) * 1040;
  const positions = {};
  const personLanes = [
    { y: 10, lastX: Number.NEGATIVE_INFINITY },
    { y: 140, lastX: Number.NEGATIVE_INFINITY },
    { y: 270, lastX: Number.NEGATIVE_INFINITY },
  ];
  const personGap = 152;

  datedEntities
    .filter(({ entity }) => entity.type === "person")
    .sort((a, b) => (a.year ?? max) - (b.year ?? max) || a.index - b.index)
    .forEach(({ entity, year }) => {
      const idealX = timelineX(year);
      const availableLanes = personLanes.filter((lane) => lane.lastX <= idealX - personGap);
      const lane = (availableLanes.length ? availableLanes : personLanes)
        .reduce((earliest, candidate) => candidate.lastX < earliest.lastX ? candidate : earliest);
      const x = Math.max(idealX, lane.lastX + personGap);
      lane.lastX = x;
      positions[entity.id] = { x, y: lane.y };
    });

  const typeRows = { event: 400, place: 510, group: 620, book: 730 };
  const rowLastX = new Map();
  datedEntities
    .filter(({ entity }) => entity.type !== "person")
    .sort((a, b) => (a.year ?? max) - (b.year ?? max) || a.index - b.index)
    .forEach(({ entity, year }) => {
      const y = typeRows[entity.type] ?? 520;
      const rowKey = `${entity.type}:${y}`;
      const size = NODE_SIZE[entity.type] ?? NODE_SIZE.person;
      const idealX = timelineX(year);
      const x = Math.max(idealX, (rowLastX.get(rowKey) ?? Number.NEGATIVE_INFINITY) + size.width + 40);
      rowLastX.set(rowKey, x);
      positions[entity.id] = { x, y };
    });

  return positions;
}
