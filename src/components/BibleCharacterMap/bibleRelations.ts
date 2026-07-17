export type RelationType = 'promise' | 'discipleship' | 'coworker' | 'conflict' | 'family' | 'theme';

export type BibleRelation = {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  label: string;
  strength: 1 | 2 | 3;
};

export const relationLegend: Array<{
  type: RelationType;
  title: string;
  detail: string;
}> = [
  {
    type: 'promise',
    title: '家谱 / 应许线',
    detail: '亚伯拉罕 → 以撒 → 雅各 → 犹大 → 大卫 → 耶稣基督'
  },
  {
    type: 'discipleship',
    title: '门徒 / 传承线',
    detail: '耶稣 → 彼得 / 约翰，保罗 → 提摩太 / 提多'
  },
  {
    type: 'coworker',
    title: '同工 / 关联线',
    detail: '保罗 → 巴拿巴 / 路加 / 马可，亚居拉 → 百基拉'
  },
  {
    type: 'conflict',
    title: '冲突 / 对立线',
    detail: '摩西 → 法老，以利亚 → 耶洗别，耶稣 → 法利赛人'
  }
];

export const bibleRelations: BibleRelation[] = [
  { id: 'promise-abraham-isaac', from: 'abraham', to: 'isaac', type: 'promise', label: '应许', strength: 3 },
  { id: 'promise-isaac-jacob', from: 'isaac', to: 'jacob', type: 'promise', label: '应许', strength: 3 },
  { id: 'promise-jacob-judah', from: 'jacob', to: 'judah', type: 'promise', label: '支派', strength: 3 },
  { id: 'promise-judah-david', from: 'judah', to: 'david', type: 'promise', label: '王权', strength: 3 },
  { id: 'promise-david-jesus', from: 'david', to: 'jesus', type: 'promise', label: '弥赛亚', strength: 3 },
  { id: 'theme-ruth-david', from: 'ruth', to: 'david', type: 'theme', label: '家谱伏笔', strength: 2 },
  { id: 'theme-isaiah-jesus', from: 'isaiah', to: 'jesus', type: 'theme', label: '预言', strength: 2 },
  { id: 'theme-john-baptist-jesus', from: 'john-baptist', to: 'jesus', type: 'theme', label: '预备道路', strength: 2 },
  { id: 'family-adam-eve', from: 'adam', to: 'eve', type: 'family', label: '夫妻', strength: 1 },
  { id: 'family-cain-abel', from: 'cain', to: 'abel', type: 'family', label: '兄弟', strength: 1 },
  { id: 'family-abraham-sarah', from: 'abraham', to: 'sarah', type: 'family', label: '夫妻', strength: 1 },
  { id: 'family-sarah-isaac', from: 'sarah', to: 'isaac', type: 'family', label: '母子', strength: 1 },
  { id: 'family-jacob-joseph', from: 'jacob', to: 'joseph-ot', type: 'family', label: '父子', strength: 1 },
  { id: 'family-jacob-judah', from: 'jacob', to: 'judah', type: 'family', label: '父子', strength: 1 },
  { id: 'family-mary-joseph', from: 'mary', to: 'joseph-nt', type: 'family', label: '家庭', strength: 1 },
  { id: 'discipleship-jesus-peter', from: 'jesus', to: 'peter', type: 'discipleship', label: '呼召', strength: 3 },
  { id: 'discipleship-jesus-john', from: 'jesus', to: 'john', type: 'discipleship', label: '呼召', strength: 3 },
  { id: 'discipleship-jesus-twelve', from: 'jesus', to: 'twelve-disciples', type: 'discipleship', label: '十二门徒', strength: 3 },
  { id: 'discipleship-jesus-james', from: 'jesus', to: 'james-apostle', type: 'discipleship', label: '门徒', strength: 1 },
  { id: 'discipleship-jesus-andrew', from: 'jesus', to: 'andrew', type: 'discipleship', label: '门徒', strength: 1 },
  { id: 'discipleship-jesus-matthew', from: 'jesus', to: 'matthew', type: 'discipleship', label: '门徒', strength: 1 },
  { id: 'discipleship-jesus-thomas', from: 'jesus', to: 'thomas', type: 'discipleship', label: '门徒', strength: 1 },
  { id: 'discipleship-jesus-mary-magdalene', from: 'jesus', to: 'mary-magdalene', type: 'discipleship', label: '复活见证', strength: 2 },
  { id: 'discipleship-paul-timothy', from: 'paul', to: 'timothy', type: 'discipleship', label: '传承', strength: 2 },
  { id: 'discipleship-paul-titus', from: 'paul', to: 'titus', type: 'discipleship', label: '传承', strength: 2 },
  { id: 'discipleship-moses-joshua', from: 'moses', to: 'joshua', type: 'discipleship', label: '承接', strength: 2 },
  { id: 'discipleship-samuel-david', from: 'samuel', to: 'david', type: 'discipleship', label: '膏立', strength: 2 },
  { id: 'coworker-moses-aaron', from: 'moses', to: 'aaron', type: 'coworker', label: '同工', strength: 2 },
  { id: 'coworker-paul-barnabas', from: 'paul', to: 'barnabas', type: 'coworker', label: '宣教同工', strength: 2 },
  { id: 'coworker-paul-luke', from: 'paul', to: 'luke', type: 'coworker', label: '同行记录', strength: 2 },
  { id: 'coworker-paul-mark', from: 'paul', to: 'mark', type: 'coworker', label: '恢复同工', strength: 2 },
  { id: 'coworker-aquila-priscilla', from: 'aquila', to: 'priscilla', type: 'coworker', label: '夫妻同工', strength: 2 },
  { id: 'coworker-peter-john', from: 'peter', to: 'john', type: 'coworker', label: '使徒同行', strength: 1 },
  { id: 'conflict-moses-pharaoh', from: 'moses', to: 'pharaoh', type: 'conflict', label: '对立', strength: 2 },
  { id: 'conflict-elijah-jezebel', from: 'elijah', to: 'jezebel', type: 'conflict', label: '属灵冲突', strength: 2 },
  { id: 'conflict-jesus-pharisees', from: 'jesus', to: 'pharisees', type: 'conflict', label: '权柄冲突', strength: 2 },
  { id: 'conflict-saul-david', from: 'saul', to: 'david', type: 'conflict', label: '追逼', strength: 1 },
  { id: 'conflict-jesus-judas', from: 'jesus', to: 'judas-iscariot', type: 'conflict', label: '背叛', strength: 1 }
];
