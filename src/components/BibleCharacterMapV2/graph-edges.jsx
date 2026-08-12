import { BaseEdge, EdgeLabelRenderer, useInternalNode } from "@xyflow/react";

function getNodeShape(node) {
  const position = node.internals.positionAbsolute;
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;
  const entityType = node.data?.entity?.type;

  if (node.type === "junction") {
    return { kind: "circle", center: { x: position.x + width / 2, y: position.y + height / 2 }, radius: 2 };
  }

  if (entityType === "person") {
    const radius = node.selected ? 47 : 31;
    return { kind: "circle", center: { x: position.x + width / 2, y: position.y + radius }, radius };
  }

  if (entityType === "event") {
    return { kind: "diamond", center: { x: position.x + width / 2, y: position.y + height / 2 }, halfWidth: 35, halfHeight: 35 };
  }

  if (entityType === "book") {
    return { kind: "rect", center: { x: position.x + 21.5, y: position.y + height / 2 }, halfWidth: 21.5, halfHeight: 25 };
  }

  return { kind: "rect", center: { x: position.x + width / 2, y: position.y + height / 2 }, halfWidth: width / 2, halfHeight: height / 2 };
}

function getBoundaryPoint(shape, toward) {
  const dx = toward.x - shape.center.x;
  const dy = toward.y - shape.center.y;
  const length = Math.hypot(dx, dy) || 1;

  if (shape.kind === "circle") {
    return {
      x: shape.center.x + (dx / length) * shape.radius,
      y: shape.center.y + (dy / length) * shape.radius,
    };
  }

  if (shape.kind === "diamond") {
    const factor = 1 / ((Math.abs(dx) / shape.halfWidth) + (Math.abs(dy) / shape.halfHeight) || 1);
    return { x: shape.center.x + dx * factor, y: shape.center.y + dy * factor };
  }

  const factor = 1 / Math.max(Math.abs(dx) / shape.halfWidth, Math.abs(dy) / shape.halfHeight, 1);
  return { x: shape.center.x + dx * factor, y: shape.center.y + dy * factor };
}

export function RadialEdge({
  id,
  source,
  target,
  markerStart,
  markerEnd,
  style,
  label,
  data,
}) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const sourceShape = getNodeShape(sourceNode);
  const targetShape = getNodeShape(targetNode);
  const sourcePoint = getBoundaryPoint(sourceShape, targetShape.center);
  const targetPoint = getBoundaryPoint(targetShape, sourceShape.center);
  const path = `M ${sourcePoint.x},${sourcePoint.y} L ${targetPoint.x},${targetPoint.y}`;
  const dx = targetPoint.x - sourcePoint.x;
  const dy = targetPoint.y - sourcePoint.y;
  const length = Math.hypot(dx, dy) || 1;
  const labelPosition = data?.labelPosition ?? 0.5;
  const labelOffset = data?.labelOffset ?? 0;
  const labelX = sourcePoint.x + dx * labelPosition + (-dy / length) * labelOffset;
  const labelY = sourcePoint.y + dy * labelPosition + (dx / length) * labelOffset;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={18}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="radial-edge-label nodrag nopan"
            style={{
              "--edge-color": data?.color ?? style?.stroke ?? "#64748b",
              opacity: data?.opacity ?? 1,
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
