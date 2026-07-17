import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { BibleCharacter } from './bibleCharacters';

type CharacterDetailCardProps = {
  character: BibleCharacter | null;
  onClose: () => void;
};

export default function CharacterDetailCard({ character, onClose }: CharacterDetailCardProps) {
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!character || !cardRef.current) {
      return;
    }

    gsap.fromTo(
      cardRef.current,
      { autoAlpha: 0, y: 20, scale: 0.96, filter: 'blur(8px)' },
      { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.38, ease: 'power3.out' }
    );
  }, [character]);

  if (!character) {
    return null;
  }

  return (
    <aside className="character-detail-card" ref={cardRef} aria-live="polite">
      <button type="button" onClick={onClose} aria-label="关闭人物卡片">
        ×
      </button>
      <p>人物信息卡片</p>
      <h2>{character.name}</h2>
      <dl>
        <div>
          <dt>所属时代</dt>
          <dd>{character.era}</dd>
        </div>
        <div>
          <dt>身份标签</dt>
          <dd>{character.typeLabel}</dd>
        </div>
        <div>
          <dt>相关经文</dt>
          <dd>{character.scriptures.join('；')}</dd>
        </div>
        <div>
          <dt>关键关系</dt>
          <dd>{character.keyRelations}</dd>
        </div>
        <div>
          <dt>一句话总结</dt>
          <dd>{character.summary}</dd>
        </div>
        <div>
          <dt>属灵主题</dt>
          <dd>{character.themes.join('、')}</dd>
        </div>
        <div>
          <dt>关联人物</dt>
          <dd>{character.relatedPeople.join('、')}</dd>
        </div>
      </dl>
    </aside>
  );
}
