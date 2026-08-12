const FEMALE_PERSON_IDS = new Set([
  "eve",
  "sarah",
  "rebekah",
  "deborah",
  "ruth",
  "michal",
  "bathsheba",
  "esther",
  "mary",
  "mary-magdalene",
]);

const REVERSED_PERSON_LABELS = {
  父亲: "儿子",
  母亲: "儿子",
  曾祖母: "曾孙",
  家谱先祖: "后裔",
  支派先祖: "后裔",
  呼召门徒: "门徒",
  呼召继承: "继承者",
  按立继承: "继承者",
  属灵父子: "属灵儿子",
  显现与呼召: "蒙召者",
  拣选教导: "门徒群体",
  建立牧养: "所牧养教会",
  膏立: "受膏者",
  膏立为王: "受膏者",
  大卫后裔: "后裔",
  为耶稣施洗: "受洗者",
  养育照料: "儿子",
  医治与跟随: "跟随者",
  殉道现场: "现场见证者",
  属灵关怀: "受关怀者",
  击败: "对手",
  敌对: "对手",
};

const FORWARD_PERSON_LABELS = {
  大卫后裔: "先祖",
  呼召继承: "导师",
  呼召门徒: "老师",
  按立继承: "导师",
  膏立: "膏立者",
  膏立为王: "膏立者",
  劝诫: "劝诫者",
  医治与跟随: "医治者",
  属灵关怀: "属灵导师",
  属灵父子: "属灵父亲",
  显现与呼召: "呼召者",
  遗骨嘱托: "嘱托者",
  敌对: "对手",
};

const RELATED_ENTITY_LABELS = {
  event: "相关事件",
  place: "相关地点",
  book: "经文记载",
  group: "相关群体",
};

function partnerLabel(entityId) {
  return FEMALE_PERSON_IDS.has(entityId) ? "妻子" : "丈夫";
}

function childLabel(entityId) {
  return FEMALE_PERSON_IDS.has(entityId) ? "女儿" : "儿子";
}

export function centeredRelationLabel(relation, sourceId, centerId, entityById) {
  const sourceEntity = entityById[sourceId];
  const centerWasSource = relation.sourceId === centerId;

  if (relation.type === "record") return "记载";
  if (relation.label === "夫妻") return partnerLabel(sourceId);
  if (!centerWasSource) return FORWARD_PERSON_LABELS[relation.label] ?? relation.label;
  if (relation.label === "父亲" || relation.label === "母亲") return childLabel(sourceId);
  if (REVERSED_PERSON_LABELS[relation.label]) return REVERSED_PERSON_LABELS[relation.label];
  if (sourceEntity?.type !== "person") return RELATED_ENTITY_LABELS[sourceEntity?.type] ?? "相关";
  if (relation.type === "conflict") return "对手";
  if (relation.type === "mentor") return "受教者";
  if (relation.type === "kingship") return "继承者";
  return relation.label;
}

export function createCenteredRelations(relations, centerId, entityById) {
  const directRelations = relations
    .filter((relation) => relation.sourceId === centerId || relation.targetId === centerId)
    .map((relation) => {
      const sourceId = relation.sourceId === centerId ? relation.targetId : relation.sourceId;
      return {
        ...relation,
        id: `centered-${centerId}-${sourceId}-${relation.id}`,
        originalId: relation.id,
        sourceId,
        targetId: centerId,
        label: centeredRelationLabel(relation, sourceId, centerId, entityById),
        direction: "directed",
      };
    });

  const directSourceIds = new Set(directRelations.map((relation) => relation.sourceId));
  const recordedContexts = new Map();

  relations
    .filter((relation) => relation.type === "record" && relation.sourceId !== centerId && relation.targetId !== centerId)
    .forEach((relation) => {
      const sourceId = entityById[relation.sourceId]?.type === "book" ? relation.sourceId : relation.targetId;
      if (sourceId === centerId || directSourceIds.has(sourceId) || recordedContexts.has(sourceId)) return;
      recordedContexts.set(sourceId, {
        ...relation,
        id: `centered-${centerId}-${sourceId}-${relation.id}`,
        originalId: relation.id,
        sourceId,
        targetId: centerId,
        label: "记载",
        direction: "directed",
      });
    });

  return [...directRelations, ...recordedContexts.values()];
}
