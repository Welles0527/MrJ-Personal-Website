import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  IconAdjustmentsHorizontal,
  IconArrowLeft,
  IconBook2,
  IconBooks,
  IconCalendarEvent,
  IconChevronRight,
  IconCompass,
  IconCross,
  IconFocus2,
  IconGitBranch,
  IconHierarchy,
  IconInfoCircle,
  IconLayoutGrid,
  IconMapPin,
  IconMaximize,
  IconMenu2,
  IconMinus,
  IconMoon,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSun,
  IconTimeline,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import {
  CORE_NETWORKS,
  CORE_PERSON_IDS,
  ENTITY_BY_ID,
  ERAS,
  EVIDENCE_LABELS,
  GRAPH_ENTITIES,
  GRAPH_RELATIONS,
  RELATION_TYPES,
} from "./core-network-data.js";
import { getCoreLayout, getDagreLayout, getTimelineLayout } from "./graph-layout.js";
import { RadialEdge } from "./graph-edges.jsx";
import { createCenteredRelations } from "./centered-relations.js";
import { CHARACTER_STORIES } from "./character-stories.js";

const CORE_PERSON_ID_SET = new Set(CORE_PERSON_IDS);
const TIMELINE_BASE_IDS = CORE_PERSON_IDS;
const CHILD_JUNCTION_ID = "children-junction";

function getCoreIdForEntity(entityId, currentCoreId) {
  if (CORE_PERSON_ID_SET.has(entityId)) return entityId;
  if (CORE_NETWORKS[currentCoreId].entityIds.includes(entityId)) return currentCoreId;
  return CORE_PERSON_IDS.find((coreId) => CORE_NETWORKS[coreId].entityIds.includes(entityId)) ?? currentCoreId;
}

const EDGE_LABEL_ROUTES = {
  "samuel-david": { labelPosition: 0.54, labelOffset: -8 },
  "nathan-david": { labelPosition: 0.5, labelOffset: 9 },
  "jesse-david": { labelPosition: 0.48, labelOffset: -8 },
  "michal-david": { labelPosition: 0.48, labelOffset: 9 },
  "bathsheba-david": { labelPosition: 0.48, labelOffset: 10 },
  "jonathan-david": { labelPosition: 0.48, labelOffset: -9 },
  "saul-david": { labelPosition: 0.5, labelOffset: -10 },
  "david-goliath": { labelPosition: 0.52, labelOffset: 10 },
  "david-elah": { labelPosition: 0.53, labelOffset: -10 },
  "elah-book": { labelPosition: 0.52, labelOffset: -10 },
};

const NAV_ITEMS = [
  { id: "timeline", label: "时间线", icon: IconTimeline, planned: true },
  { id: "graph", label: "关系图谱", icon: IconGitBranch },
  { id: "people", label: "人物", icon: IconUsers, planned: true },
  { id: "events", label: "事件", icon: IconCalendarEvent, planned: true },
  { id: "places", label: "地点", icon: IconMapPin, planned: true },
  { id: "books", label: "书卷", icon: IconBooks, planned: true },
  { id: "explore", label: "探索", icon: IconCompass, planned: true },
];

const ENTITY_COLORS = {
  person: "#2f76cf",
  event: "#ed7717",
  place: "#5b9c59",
  book: "#8a4fd3",
  group: "#e4a62d",
};

function PersonNode({ data, selected }) {
  const { entity, dimmed } = data;
  return (
    <div className={`person-node ${selected ? "is-selected" : ""} ${dimmed ? "is-dimmed" : ""}`}>
      <Handle className="node-handle" type="target" position={Position.Left} />
      <div className="portrait-ring" style={{ "--ring-color": entity.id === data.activeCoreId ? "#f0a824" : "#b66dde" }}>
        <img src={entity.image} alt="" draggable="false" />
      </div>
      <span className="person-node-name">{entity.nameZh}</span>
      <Handle className="node-handle" type="source" position={Position.Right} />
    </div>
  );
}

function EventNode({ data, selected }) {
  return (
    <div className={`event-node ${selected ? "is-selected" : ""} ${data.dimmed ? "is-dimmed" : ""}`}>
      <Handle className="node-handle" type="target" position={Position.Left} />
      <div className="event-diamond"><span>{data.entity.nameZh}</span></div>
      <Handle className="node-handle" type="source" position={Position.Right} />
    </div>
  );
}

function BookNode({ data, selected }) {
  return (
    <div className={`book-node ${selected ? "is-selected" : ""} ${data.dimmed ? "is-dimmed" : ""}`}>
      <Handle className="node-handle" type="target" position={Position.Left} />
      <div className="book-icon"><IconBook2 size={22} stroke={1.8} /></div>
      <span>{data.entity.nameZh}</span>
      <Handle className="node-handle" type="source" position={Position.Right} />
    </div>
  );
}

function ContextNode({ data, selected }) {
  const isPlace = data.entity.type === "place";
  const Icon = isPlace ? IconMapPin : IconUsers;
  return (
    <div className={`context-node ${data.entity.type} ${selected ? "is-selected" : ""} ${data.dimmed ? "is-dimmed" : ""}`}>
      <Handle className="node-handle" type="target" position={Position.Left} />
      <div className="context-icon"><Icon size={23} stroke={1.8} /></div>
      <span>{data.entity.nameZh}</span>
      <Handle className="node-handle" type="source" position={Position.Right} />
    </div>
  );
}

function JunctionNode() {
  return (
    <div className="junction-node" aria-hidden="true">
      <Handle className="node-handle" type="target" position={Position.Top} />
      <Handle className="node-handle" type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { person: PersonNode, event: EventNode, book: BookNode, context: ContextNode, junction: JunctionNode };
const edgeTypes = { radial: RadialEdge };

function getChildrenJunctionPosition(positions) {
  const david = positions.david;
  const solomon = positions.solomon;
  const absalom = positions.absalom;
  if (!david || !solomon || !absalom) return { x: 424, y: 420 };

  const davidCenter = { x: david.x + 60, y: david.y + 47 };
  const childrenCenter = { x: (solomon.x + absalom.x) / 2 + 60, y: (solomon.y + absalom.y) / 2 + 31 };
  return {
    x: davidCenter.x + (childrenCenter.x - davidCenter.x) * 0.58 - 2,
    y: davidCenter.y + (childrenCenter.y - davidCenter.y) * 0.58 - 2,
  };
}

function makeNodes(positions, activeCoreId = "david") {
  const entityNodes = GRAPH_ENTITIES.map((entity) => ({
    id: entity.id,
    type: entity.type === "place" || entity.type === "group" ? "context" : entity.type,
    position: positions[entity.id] ?? { x: 0, y: 0 },
    data: { entity, dimmed: false, activeCoreId },
    selected: entity.id === "david",
    draggable: true,
  }));
  return [
    ...entityNodes,
    {
      id: CHILD_JUNCTION_ID,
      type: "junction",
      position: getChildrenJunctionPosition(positions),
      data: { dimmed: false },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: -1,
    },
  ];
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return isMobile;
}

function Header({ search, setSearch, searchResults, onSelect, onPlanned, dark, setDark, onMobileMenu }) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark"><IconCross size={31} stroke={1.7} /></div>
        <div><strong>圣经人物关系图谱</strong><span>Bible Character Map</span></div>
      </div>

      <nav className="desktop-nav" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={item.id === "graph" ? "active" : ""} onClick={() => item.planned && onPlanned(item.label)}>
              <Icon className="nav-icon" size={17} /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="header-actions">
        <div className="header-search">
          <IconSearch size={19} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchResults[0]) onSelect(searchResults[0].id, true);
            }}
            placeholder="搜索人物、事件、地点或经文"
            aria-label="搜索图谱"
          />
          {search.trim() && (
            <div className="header-search-results">
              {searchResults.length ? searchResults.slice(0, 6).map((entity) => (
                <button key={entity.id} onClick={() => onSelect(entity.id, true)}>
                  <span className="result-type-dot" style={{ background: ENTITY_COLORS[entity.type] }} />
                  <span><b>{entity.nameZh}</b><small>{entity.nameEn}</small></span>
                </button>
              )) : <div className="empty-result">没有匹配结果</div>}
            </div>
          )}
        </div>
        <button className="icon-button desktop-action" title={dark ? "切换浅色模式" : "切换深色模式"} onClick={() => setDark((value) => !value)}>
          {dark ? <IconSun size={21} /> : <IconMoon size={21} />}
        </button>
        <button className="icon-button desktop-action" title="设置" onClick={() => onPlanned("设置")}><IconSettings size={21} /></button>
        <button className="icon-button mobile-menu-button" title="打开导航" onClick={onMobileMenu}><IconMenu2 size={23} /></button>
      </div>
    </header>
  );
}

function FilterPanel({ selectedEras, setSelectedEras, activeRelations, setActiveRelations, search, setSearch, onSelect, activeCoreId }) {
  const allErasSelected = selectedEras.size === ERAS.length;
  const allRelationsSelected = activeRelations.size === Object.keys(RELATION_TYPES).length;
  const corePeopleByEra = useMemo(() => ERAS.map((era) => ({
    era,
    people: CORE_PERSON_IDS
      .map((id) => ENTITY_BY_ID[id])
      .filter((person) => person.eraIds[0] === era.id),
  })).filter((group) => group.people.length), []);
  const personMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return GRAPH_ENTITIES.filter((entity) => entity.type === "person" && [entity.nameZh, entity.nameEn, ...entity.aliases].join(" ").toLowerCase().includes(query));
  }, [search]);

  const toggleEra = (eraId) => {
    setSelectedEras((current) => {
      const next = new Set(current);
      if (next.has(eraId)) next.delete(eraId); else next.add(eraId);
      return next;
    });
  };

  const toggleRelation = (type) => {
    setActiveRelations((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  return (
    <aside className="filter-panel side-panel">
      <div className="panel-search">
        <IconSearch size={17} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索人物..." aria-label="筛选人物" />
      </div>
      {search.trim() && (
        <div className="filter-search-results">
          {personMatches.length ? personMatches.slice(0, 4).map((person) => (
            <button key={person.id} onClick={() => onSelect(person.id, true)}>{person.nameZh}<span>{person.nameEn}</span></button>
          )) : <span>没有匹配人物</span>}
        </div>
      )}

      <div className="filter-panel-heading">
        <b>筛选</b>
        <button onClick={() => {
          setSelectedEras(new Set(ERAS.map((era) => era.id)));
          setActiveRelations(new Set(Object.keys(RELATION_TYPES)));
        }}>清除</button>
      </div>

      <section className="filter-section era-section">
        <div className="section-title"><b>时代</b><button onClick={() => setSelectedEras(new Set(allErasSelected ? [] : ERAS.map((era) => era.id)))}>{allErasSelected ? "清除" : "全选"}</button></div>
        <div className="check-list">
          {ERAS.map((era) => (
            <label key={era.id}>
              <input type="checkbox" checked={selectedEras.has(era.id)} onChange={() => toggleEra(era.id)} />
              <span className="era-dot" style={{ background: era.color }} />
              <span>{era.label} <small>({era.range})</small></span>
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section relation-section">
        <div className="section-title"><b>关系类型</b><button onClick={() => setActiveRelations(new Set(allRelationsSelected ? [] : Object.keys(RELATION_TYPES)))}>{allRelationsSelected ? "清除" : "全选"}</button></div>
        <div className="check-list relation-check-list">
          {Object.entries(RELATION_TYPES).map(([type, relation]) => (
            <label key={type}>
              <input type="checkbox" checked={activeRelations.has(type)} onChange={() => toggleRelation(type)} />
              <span className="relation-symbol" style={{ background: relation.color }}><IconGitBranch size={11} /></span>
              <span>{relation.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section people-section">
        <div className="section-title"><b>核心人物 <small>{CORE_PERSON_IDS.length}</small></b><button onClick={() => onSelect(activeCoreId, true)}>查看当前</button></div>
        <div className="people-list">
          {corePeopleByEra.map(({ era, people }) => (
            <div className="people-era-group" key={era.id}>
              <div className="people-era-label"><span style={{ background: era.color }} />{era.label}<small>{people.length}</small></div>
              {people.map((person) => (
                <button key={person.id} className={activeCoreId === person.id ? "active" : ""} onClick={() => onSelect(person.id, true)} aria-label={`打开${CORE_NETWORKS[person.id].label}`}>
                  <img src={person.image} alt="" /><span>{person.nameZh}</span><small>{person.nameEn}</small>
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function LayoutToolbar({ layoutMode, onLayout, onPlanned }) {
  const layouts = [
    { id: "auto", label: "自动布局", icon: IconLayoutGrid },
    { id: "hierarchy", label: "层级布局", icon: IconHierarchy },
    { id: "timeline", label: "时间轴布局", icon: IconTimeline },
  ];
  return (
    <div className="graph-toolbar">
      <div className="layout-buttons">
        {layouts.map((layout) => {
          const Icon = layout.icon;
          const active = layoutMode === layout.id;
          return <button key={layout.id} className={active ? "active" : ""} aria-label={layout.label} title={layout.label} onClick={() => onLayout(layout.id)}><Icon size={17} /><span>{layout.label}</span></button>;
        })}
      </div>
      <div className="entity-legend">
        {Object.entries({ person: "人物", event: "事件", place: "地点", book: "书卷", group: "家族/群体" }).map(([type, label]) => (
          <span key={type}><i style={{ background: ENTITY_COLORS[type] }} />{label}</span>
        ))}
        <button onClick={() => onPlanned("图例说明")}>图例说明 <IconChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function ZoomTools({ onFit, activeCoreId }) {
  const { zoomIn, zoomOut } = useReactFlow();
  const activeName = ENTITY_BY_ID[activeCoreId].nameZh;
  return (
    <div className="zoom-tools">
      <button title="放大" onClick={() => zoomIn({ duration: 180 })}><IconPlus size={20} /></button>
      <button title="缩小" onClick={() => zoomOut({ duration: 180 })}><IconMinus size={20} /></button>
      <button title="适应画布" onClick={onFit}><IconMaximize size={19} /></button>
      <button title={`定位${activeName}`} onClick={() => onFit(activeCoreId)}><IconFocus2 size={19} /></button>
    </div>
  );
}

function DetailPanel({ entity, relations, onSelect, onPlanned, onOpenStory }) {
  const relationGroups = useMemo(() => {
    const groups = {};
    relations.forEach((relation) => { groups[relation.type] = (groups[relation.type] ?? 0) + 1; });
    return groups;
  }, [relations]);

  const DetailIcon = entity.type === "book"
    ? IconBook2
    : entity.type === "place"
      ? IconMapPin
      : entity.type === "group"
        ? IconUsers
        : IconCalendarEvent;

  return (
    <aside className="detail-panel side-panel">
      <div className="detail-hero">
        {entity.type === "person" ? <img src={entity.image} alt="" /> : (
          <div className={`detail-type-icon ${entity.type}`}><DetailIcon size={31} /></div>
        )}
        <div><h2>{entity.nameZh} <span>({entity.nameEn})</span></h2><p>{entity.summary}</p><div className="tag-row">{entity.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
      </div>

      <section className="detail-section">
        <h3>基本信息</h3>
        <dl>
          <div><dt>时代</dt><dd>{entity.eraIds.map((id) => ERAS.find((era) => era.id === id)?.label).filter(Boolean).join("、")}</dd></div>
          <div><dt>活动时间</dt><dd>{entity.time.display}</dd></div>
          {Object.entries(entity.facts).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>

      <section className="detail-section scripture-section">
        <h3>经文出处</h3>
        {entity.scriptures.map((scripture) => <button key={scripture} onClick={() => onPlanned(`经文阅读：${scripture}`)}>{scripture}</button>)}
      </section>

      <section className="detail-section relation-summary">
        <div className="detail-section-title"><h3>关系 <span>({relations.length})</span></h3><button onClick={() => onPlanned("全部关系")}>查看全部</button></div>
        <div className="relation-stats">
          {Object.entries(relationGroups).map(([type, count]) => (
            <div key={type}><span className="relation-symbol" style={{ background: RELATION_TYPES[type].color }}><IconGitBranch size={11} /></span><b>{RELATION_TYPES[type].label}</b><strong>{count}</strong></div>
          ))}
        </div>
        <div className="relation-evidence">
          {relations.slice(0, 2).map((relation) => {
            const otherId = relation.sourceId === entity.id ? relation.targetId : relation.sourceId;
            return <button key={relation.id} onClick={() => onSelect(otherId, true)}><span>{relation.label} · {ENTITY_BY_ID[otherId].nameZh}</span><small>{EVIDENCE_LABELS[relation.evidenceLevel]}</small></button>;
          })}
        </div>
      </section>
      <button className="primary-detail-button" onClick={() => entity.type === "person" ? onOpenStory(entity) : onPlanned(`${entity.nameZh}完整档案`)}>{entity.type === "person" ? "人物故事" : "查看详情"}</button>
    </aside>
  );
}

function CharacterStoryDialog({ entity, story, onClose, onScripture }) {
  let stepNumber = 0;
  const titleLength = [...story.title].length;
  const titleClassName = titleLength > 23 ? "is-long" : titleLength > 19 ? "is-medium" : "";
  return (
    <div className="story-dialog" role="dialog" aria-modal="true" aria-labelledby="story-title">
      <header className="story-dialog-header">
        <div><span>人物故事</span><strong>{entity.nameZh} · {entity.nameEn}</strong></div>
        <button className="story-return-button" type="button" onClick={onClose} autoFocus><IconArrowLeft size={18} /><span>返回圣经人物关系图</span></button>
      </header>

      <main className="story-scroll">
        <section className="story-hero">
          <img src={story.heroImage} alt={story.heroAlt} />
          <div className="story-hero-shade" />
          <div className="story-hero-copy">
            <p>{story.eyebrow}</p>
            <h1 id="story-title" className={titleClassName}>{story.title}</h1>
            <div className="story-lead">{story.lead}</div>
            <dl>
              <div><dt>身份</dt><dd>{story.role}</dd></div>
              <div><dt>时代</dt><dd>{story.scope}</dd></div>
              <div><dt>终年</dt><dd>{story.lifespan}</dd></div>
            </dl>
          </div>
        </section>

        <section className="story-body">
          <aside className="story-aside">
            <span className="story-aside-kicker">READING LENS</span>
            <h2>读{entity.nameZh}的一生</h2>
            <p>不只把{entity.nameZh}简化为“{story.role}”，而是沿着关键节点，看见{story.themes.join("、")}如何交织。</p>
            <ul>{story.themes.map((theme) => <li key={theme}>{theme}</li>)}</ul>
            <div className="story-portrait"><img src={entity.image} alt={`${entity.nameZh}人物画像`} /><span><b>{entity.nameZh}</b><small>{entity.nameEn}</small></span></div>
          </aside>

          <div className="story-timeline" aria-label={`${entity.nameZh}人物故事线`}>
            {story.phases.map((phase) => (
              <section className="story-phase" key={phase.label}>
                <header><span>{phase.label}</span><p>{phase.caption}</p></header>
                <div className="story-steps">
                  {phase.steps.map((step) => {
                    stepNumber += 1;
                    return (
                      <article className={`story-step tone-${step.tone}`} key={step.title}>
                        <span className="story-step-number">{String(stepNumber).padStart(2, "0")}</span>
                        <div><h3>{step.title}</h3><p>{step.detail}</p><button type="button" onClick={() => onScripture(step.scripture)}>{step.scripture}</button></div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>

        <footer className="story-ending"><span>THE STORY CONTINUES</span><strong>{story.ending}</strong><button type="button" onClick={onClose}>返回关系图谱</button></footer>
      </main>
    </div>
  );
}

function TimelinePanel({ selectedId, selectedEras, setSelectedEras, onSelect, zoom, setZoom, onReset }) {
  const people = TIMELINE_BASE_IDS
    .map((id) => ENTITY_BY_ID[id])
    .sort((left, right) => (left.time.start ?? left.time.end ?? 100) - (right.time.start ?? right.time.end ?? 100));
  const markerGap = 66 * zoom;
  const markerStart = 42;
  const trackWidth = Math.max(920, markerStart * 2 + Math.max(people.length - 1, 0) * markerGap);
  const markers = people.map((person, index) => ({ person, left: markerStart + index * markerGap }));
  const axisTicks = [
    { year: -4000, label: "4000 BC" },
    { year: -3000, label: "3000 BC" },
    { year: -2000, label: "2000 BC" },
    { year: -1500, label: "1500 BC" },
    { year: -1000, label: "1000 BC" },
    { year: 0, label: "0" },
    { year: 100, label: "100 AD" },
  ].map((tick) => {
    const index = people.findIndex((person) => (person.time.start ?? person.time.end ?? 100) >= tick.year);
    const resolvedIndex = index < 0 ? people.length - 1 : index;
    return { ...tick, left: markerStart + Math.max(0, resolvedIndex) * markerGap };
  });
  return (
    <section className="timeline-panel">
      <div className="timeline-heading">
        <b>时间线</b>
        <div className="timeline-actions"><span><IconFocus2 size={15} /> 缩放</span><input aria-label="时间轴缩放" type="range" min="1" max="1.8" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><button onClick={onReset}>重置视图</button></div>
      </div>
      <div className="era-bands">
        {ERAS.map((era) => (
          <button key={era.id} className={selectedEras.has(era.id) ? "selected" : ""} style={{ background: era.color }} onClick={() => setSelectedEras(new Set([era.id]))}>
            <span>{era.label}</span><small>{era.range}</small>
          </button>
        ))}
      </div>
      <div className="timeline-track">
        <div className="timeline-track-inner" style={{ width: `${trackWidth}px` }}>
          <div className="timeline-markers">
            {markers.map(({ person, left }) => (
              <button
                key={person.id}
                className={selectedId === person.id ? "selected" : ""}
                data-core-id={person.id}
                style={{ left: `${left}px`, top: "2px" }}
                onClick={() => onSelect(person.id, true)}
                title={`${person.nameZh} · ${person.time.display}`}
              >
                <img src={person.image} alt="" /><span>{person.nameZh}</span>
              </button>
            ))}
          </div>
          <div className="timeline-axis">
            {axisTicks.map((tick) => <span key={tick.label} style={{ left: `${tick.left}px` }}>{tick.label}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileNavigation({ onClose, onPlanned, dark, setDark }) {
  return (
    <div className="mobile-nav-panel">
      <div className="mobile-panel-heading"><b>导航</b><button title="关闭" onClick={onClose}><IconX size={22} /></button></div>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return <button key={item.id} className={item.id === "graph" ? "active" : ""} onClick={() => item.planned ? onPlanned(item.label) : onClose()}><Icon size={19} /><span>{item.label}</span></button>;
      })}
      <button onClick={() => setDark((value) => !value)}>{dark ? <IconSun size={19} /> : <IconMoon size={19} />}<span>{dark ? "浅色模式" : "深色模式"}</span></button>
    </div>
  );
}

function GraphDemo() {
  const isMobile = useIsMobile();
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("david");
  const [activeCoreId, setActiveCoreId] = useState("david");
  const [selectedEras, setSelectedEras] = useState(new Set(ERAS.map((era) => era.id)));
  const [activeRelations, setActiveRelations] = useState(new Set(Object.keys(RELATION_TYPES)));
  const [layoutMode, setLayoutMode] = useState("auto");
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [mobilePanel, setMobilePanel] = useState(null);
  const [toast, setToast] = useState("");
  const [storyId, setStoryId] = useState(null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [nodes, setNodes, onNodesChange] = useNodesState(() => {
    const initialEntities = CORE_NETWORKS.david.entityIds.map((id) => ENTITY_BY_ID[id]);
    return makeNodes(getCoreLayout(initialEntities, "david"), "david");
  });
  const { fitView, getNodes } = useReactFlow();

  const selectedEntity = ENTITY_BY_ID[selectedId] ?? ENTITY_BY_ID.david;
  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return GRAPH_ENTITIES.filter((entity) => [entity.nameZh, entity.nameEn, ...entity.aliases, ...entity.scriptures].join(" ").toLowerCase().includes(query));
  }, [search]);

  const activeNetworkIds = useMemo(() => new Set(CORE_NETWORKS[activeCoreId].entityIds), [activeCoreId]);
  const activeNetworkEntities = useMemo(() => CORE_NETWORKS[activeCoreId].entityIds.map((id) => ENTITY_BY_ID[id]), [activeCoreId]);
  const activeNetworkRelations = useMemo(() => GRAPH_RELATIONS.filter((relation) => activeNetworkIds.has(relation.sourceId) && activeNetworkIds.has(relation.targetId)), [activeNetworkIds]);
  const visibleIds = useMemo(() => new Set(activeNetworkEntities.filter((entity) => entity.eraIds.some((id) => selectedEras.has(id))).map((entity) => entity.id)), [activeNetworkEntities, selectedEras]);
  const activeGraphRelations = useMemo(() => activeNetworkRelations.filter((relation) => activeRelations.has(relation.type) && visibleIds.has(relation.sourceId) && visibleIds.has(relation.targetId)), [activeNetworkRelations, activeRelations, visibleIds]);
  const selectedRelations = useMemo(() => activeNetworkRelations.filter((relation) => relation.sourceId === selectedId || relation.targetId === selectedId), [activeNetworkRelations, selectedId]);
  const centeredGraphRelations = useMemo(
    () => createCenteredRelations(activeGraphRelations, activeCoreId, ENTITY_BY_ID),
    [activeCoreId, activeGraphRelations],
  );
  const focusedGraphRelations = useMemo(() => selectedId === activeCoreId
    ? centeredGraphRelations
    : centeredGraphRelations.filter((relation) => relation.sourceId === selectedId),
  [activeCoreId, centeredGraphRelations, selectedId]);
  const focusNodeIds = useMemo(() => {
    const ids = new Set([selectedId, activeCoreId]);
    focusedGraphRelations.forEach((relation) => {
      ids.add(relation.sourceId);
      ids.add(relation.targetId);
    });
    return ids;
  }, [focusedGraphRelations, selectedId]);
  const showChildrenJunction = false;

  useEffect(() => {
    setNodes((current) => current.map((node) => ({
      ...node,
      hidden: node.id === CHILD_JUNCTION_ID ? !showChildrenJunction : !visibleIds.has(node.id),
      selected: node.id === selectedId,
      data: { ...node.data, activeCoreId, dimmed: node.id !== CHILD_JUNCTION_ID && !focusNodeIds.has(node.id) },
    })));
  }, [activeCoreId, focusNodeIds, selectedId, setNodes, showChildrenJunction, visibleIds]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isMobile) setMobilePanel(null);
  }, [isMobile]);

  useEffect(() => {
    if (!storyId) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") setStoryId(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [storyId]);

  const flowEdges = useMemo(() => {
    const makeEdge = (relation, overrides = {}) => {
      const relationStyle = RELATION_TYPES[relation.type];
      const highlighted = relation.sourceId === selectedId || relation.targetId === selectedId;
      const route = EDGE_LABEL_ROUTES[relation.originalId ?? relation.id] ?? {};
      return {
        id: overrides.id ?? relation.id,
        source: overrides.source ?? relation.sourceId,
        target: overrides.target ?? relation.targetId,
        type: "radial",
        label: Object.prototype.hasOwnProperty.call(overrides, "label") ? overrides.label : relation.label,
        markerEnd: Object.prototype.hasOwnProperty.call(overrides, "markerEnd")
          ? overrides.markerEnd
          : { type: MarkerType.ArrowClosed, width: 11, height: 11, color: relationStyle.color },
        style: {
          stroke: relationStyle.color,
          strokeWidth: highlighted ? 2.05 : 1.65,
          strokeDasharray: overrides.strokeDasharray ?? relationStyle.dash,
          opacity: 0.94,
        },
        data: {
          color: relationStyle.color,
          labelPosition: overrides.labelPosition ?? route.labelPosition,
          labelOffset: overrides.labelOffset ?? route.labelOffset,
          opacity: 0.98,
        },
        zIndex: highlighted ? 2 : 1,
      };
    };

    return focusedGraphRelations.map((relation) => makeEdge(relation));
  }, [focusedGraphRelations, selectedId]);

  const fitVisibleNodes = useCallback((id) => {
    const visibleNodes = getNodes().filter((node) => !node.hidden);
    const targetNodes = typeof id === "string"
      ? visibleNodes.filter((node) => node.id === id)
      : visibleNodes;
    if (!targetNodes.length) return;
    fitView({
      nodes: targetNodes,
      duration: 420,
      padding: typeof id === "string" ? 1.4 : isMobile ? 0.18 : 0.12,
      maxZoom: typeof id === "string" ? 1.35 : isMobile ? 0.9 : 1.1,
    });
  }, [fitView, getNodes, isMobile]);

  const fitGraph = useCallback((id) => {
    window.requestAnimationFrame(() => fitVisibleNodes(id));
  }, [fitVisibleNodes]);

  useEffect(() => {
    if (!layoutRevision) return undefined;
    let secondFrame;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => fitVisibleNodes());
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [fitVisibleNodes, layoutRevision]);

  const selectEntity = useCallback((id, focus = false) => {
    const entity = ENTITY_BY_ID[id];
    if (!entity) return;
    const nextCoreId = getCoreIdForEntity(id, activeCoreId);
    const shouldResetNetwork = nextCoreId !== activeCoreId || CORE_PERSON_ID_SET.has(id);
    setSelectedId(id);
    setSelectedEras((current) => entity.eraIds.some((eraId) => current.has(eraId)) ? current : new Set([...current, ...entity.eraIds]));
    setSearch("");
    if (shouldResetNetwork) {
      const nextEntities = CORE_NETWORKS[nextCoreId].entityIds.map((entityId) => ENTITY_BY_ID[entityId]);
      const positions = getCoreLayout(nextEntities, nextCoreId);
      const childrenJunctionPosition = nextCoreId === "david" ? getChildrenJunctionPosition(positions) : null;
      setActiveCoreId(nextCoreId);
      setLayoutMode("auto");
      setNodes((current) => current.map((node) => ({
        ...node,
        position: node.id === CHILD_JUNCTION_ID
          ? childrenJunctionPosition ?? node.position
          : positions[node.id] ?? node.position,
        data: { ...node.data, activeCoreId: nextCoreId },
      })));
      setLayoutRevision((revision) => revision + 1);
    } else if (focus) {
      fitGraph(id);
    }
    if (isMobile && entity.type !== "person") setMobilePanel("detail");
  }, [activeCoreId, fitGraph, isMobile, setNodes]);

  const applyLayout = useCallback((mode) => {
    const positions = mode === "auto"
      ? getCoreLayout(activeNetworkEntities, activeCoreId)
      : mode === "timeline"
        ? getTimelineLayout(activeNetworkEntities)
        : getDagreLayout(activeNetworkEntities, activeNetworkRelations, "TB");
    const childrenJunctionPosition = activeCoreId === "david" ? getChildrenJunctionPosition(positions) : null;
    setLayoutMode(mode);
    setNodes((current) => current.map((node) => ({
      ...node,
      position: node.id === CHILD_JUNCTION_ID
        ? childrenJunctionPosition ?? node.position
        : positions[node.id] ?? node.position,
    })));
    setLayoutRevision((revision) => revision + 1);
  }, [activeCoreId, activeNetworkEntities, activeNetworkRelations, setNodes]);

  const resetTimeline = () => {
    setTimelineZoom(1);
    setSelectedEras(new Set(ERAS.map((era) => era.id)));
    fitGraph();
  };

  const planned = (name) => {
    setToast(`${name}模块正在规划中`);
    if (isMobile) setMobilePanel(null);
  };

  const openStory = (entity) => {
    if (!CHARACTER_STORIES[entity.id]) {
      planned(`${entity.nameZh}人物故事`);
      return;
    }
    setMobilePanel(null);
    setStoryId(entity.id);
  };

  const activeStory = storyId ? CHARACTER_STORIES[storyId] : null;

  return (
    <div className={`character-map-app ${dark ? "theme-dark" : ""}`}>
      <Header search={search} setSearch={setSearch} searchResults={searchResults} onSelect={selectEntity} onPlanned={planned} dark={dark} setDark={setDark} onMobileMenu={() => setMobilePanel("nav")} />

      <main className="workspace-main">
        <div className="desktop-filter"><FilterPanel selectedEras={selectedEras} setSelectedEras={setSelectedEras} activeRelations={activeRelations} setActiveRelations={setActiveRelations} search={search} setSearch={setSearch} onSelect={selectEntity} activeCoreId={activeCoreId} /></div>

        <section className="graph-stage">
          <LayoutToolbar layoutMode={layoutMode} onLayout={applyLayout} onPlanned={planned} />
          <div className="graph-canvas">
            <ReactFlow
              nodes={nodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onNodeClick={(_, node) => selectEntity(node.id)}
              fitView
              fitViewOptions={{ padding: isMobile ? 0.18 : 0.12, maxZoom: isMobile ? 0.9 : 1.1 }}
              minZoom={0.25}
              maxZoom={1.8}
              nodesConnectable={false}
              elementsSelectable
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} color={dark ? "#435167" : "#dce2e9"} />
              <ZoomTools onFit={fitGraph} activeCoreId={activeCoreId} />
            </ReactFlow>
            <div className="relationship-key">
              <b>图例</b>
              {Object.entries(RELATION_TYPES).map(([type, relation]) => <span key={type}><i style={{ borderColor: relation.color, borderTopStyle: relation.dash === "0" ? "solid" : "dashed" }} />{relation.label}</span>)}
            </div>
          </div>
        </section>

        <div className="desktop-detail"><DetailPanel entity={selectedEntity} relations={selectedRelations} onSelect={selectEntity} onPlanned={planned} onOpenStory={openStory} /></div>
      </main>

      <div className="desktop-timeline"><TimelinePanel selectedId={selectedId} selectedEras={selectedEras} setSelectedEras={setSelectedEras} onSelect={selectEntity} zoom={timelineZoom} setZoom={setTimelineZoom} onReset={resetTimeline} /></div>

      {isMobile && (
        <div className="mobile-dock" aria-label="移动端工具">
          <button onClick={() => setMobilePanel("filter")}><IconAdjustmentsHorizontal size={20} /><span>筛选</span></button>
          <button onClick={() => setMobilePanel("timeline")}><IconTimeline size={20} /><span>时间线</span></button>
          <button onClick={() => setMobilePanel("detail")}><IconInfoCircle size={20} /><span>详情</span></button>
        </div>
      )}

      {isMobile && mobilePanel && (
        <div className={`mobile-overlay panel-${mobilePanel}`}>
          <button className="mobile-backdrop" aria-label="关闭面板" onClick={() => setMobilePanel(null)} />
          <div className={`mobile-sheet ${mobilePanel === "timeline" ? "bottom-sheet" : "side-sheet"}`}>
            {mobilePanel !== "nav" && <div className="mobile-sheet-heading"><b>{mobilePanel === "filter" ? "筛选" : mobilePanel === "detail" ? "人物详情" : "时间线"}</b><button title="关闭" onClick={() => setMobilePanel(null)}><IconX size={22} /></button></div>}
            {mobilePanel === "nav" && <MobileNavigation onClose={() => setMobilePanel(null)} onPlanned={planned} dark={dark} setDark={setDark} />}
            {mobilePanel === "filter" && <FilterPanel selectedEras={selectedEras} setSelectedEras={setSelectedEras} activeRelations={activeRelations} setActiveRelations={setActiveRelations} search={search} setSearch={setSearch} onSelect={(id, focus) => { selectEntity(id, focus); setMobilePanel(null); }} activeCoreId={activeCoreId} />}
            {mobilePanel === "detail" && <DetailPanel entity={selectedEntity} relations={selectedRelations} onSelect={selectEntity} onPlanned={planned} onOpenStory={openStory} />}
            {mobilePanel === "timeline" && <TimelinePanel selectedId={selectedId} selectedEras={selectedEras} setSelectedEras={setSelectedEras} onSelect={(id, focus) => { selectEntity(id, focus); setMobilePanel(null); }} zoom={timelineZoom} setZoom={setTimelineZoom} onReset={resetTimeline} />}
          </div>
        </div>
      )}

      {activeStory && <CharacterStoryDialog entity={ENTITY_BY_ID[storyId]} story={activeStory} onClose={() => setStoryId(null)} onScripture={(scripture) => setToast(`经文阅读：${scripture}模块正在规划中`)} />}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export function App() {
  return <ReactFlowProvider><GraphDemo /></ReactFlowProvider>;
}
