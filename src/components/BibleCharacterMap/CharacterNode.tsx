import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { BibleCharacter } from './bibleCharacters';

export type CharacterNodeData = {
  character: BibleCharacter;
  isActive: boolean;
  isRelated: boolean;
  isDimmed: boolean;
  onHover: (id: string) => void;
  onLeave: () => void;
  onSelect: (id: string) => void;
};

export type CharacterFlowNode = Node<CharacterNodeData, 'character'>;

const iconByType: Record<BibleCharacter['type'], string> = {
  ancestor: '✦',
  patriarch: '✧',
  royal: '♛',
  prophet: '✶',
  priest: '✥',
  judge: '◆',
  woman: '❧',
  apostle: '✚',
  witness: '◈',
  missionary: '✣',
  antagonist: '×',
  christ: '✚'
};

export default function CharacterNode({ data }: NodeProps<CharacterFlowNode>) {
  const { character, isActive, isRelated, isDimmed, onHover, onLeave, onSelect } = data;

  return (
    <button
      type="button"
      className={[
        'character-flow-node',
        `type-${character.type}`,
        `importance-${character.importance}`,
        character.type === 'christ' ? 'is-christ-node' : '',
        isActive ? 'is-active' : '',
        isRelated ? 'is-related' : '',
        isDimmed ? 'is-dimmed' : ''
      ].join(' ')}
      data-character-id={character.id}
      aria-label={`查看${character.name}人物卡片`}
      onMouseEnter={() => onHover(character.id)}
      onMouseLeave={onLeave}
      onFocus={() => onHover(character.id)}
      onBlur={onLeave}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(character.id);
      }}
    >
      <Handle id="target-left" className="map-handle" type="target" position={Position.Left} />
      <Handle id="target-right" className="map-handle" type="target" position={Position.Right} />
      <Handle id="source-left" className="map-handle" type="source" position={Position.Left} />
      <Handle id="source-right" className="map-handle" type="source" position={Position.Right} />
      <span className="character-node-symbol" aria-hidden="true">
        {iconByType[character.type]}
      </span>
      <span className="character-node-name">{character.name}</span>
      <span className="character-node-type">{character.typeLabel}</span>
    </button>
  );
}
