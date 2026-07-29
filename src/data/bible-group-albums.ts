export const createBibleGroupAlbums = (basePath: string) => {
  const photo = (folder: string, filename: string) =>
    `${basePath}images/bible-theology/albums/${encodeURIComponent(folder)}/${filename}`;

  return [
    {
      id: 'sandy-20260623',
      folder: '20260623 Sandy家',
      date: '2026.06.23',
      photos: [
        {
          src: photo('20260623 Sandy家', '01-group-wide.webp'),
          alt: '小组成员在客厅合影',
          caption: '聚会大合影'
        },
        {
          src: photo('20260623 Sandy家', '02-group-photo.webp'),
          alt: '小组成员围坐合影',
          caption: '一起留下聚会时光'
        }
      ]
    },
    {
      id: 'gloria-welles-20260728',
      folder: '20260728 Gloria-Welles家',
      date: '2026.07.28',
      photos: [
        {
          src: photo('20260728 Gloria-Welles家', '01-group-wide.webp'),
          alt: '小组成员围在餐桌旁合影',
          caption: '聚会大合影'
        },
        {
          src: photo('20260728 Gloria-Welles家', '02-group-photo.webp'),
          alt: '小组成员在家中合影',
          caption: '一起留下聚会时光'
        },
        {
          src: photo('20260728 Gloria-Welles家', '03-two-members.webp'),
          alt: '两位成员在家中合影',
          caption: '温暖合影'
        },
        {
          src: photo('20260728 Gloria-Welles家', '04-table-group.webp'),
          alt: '聚会成员围桌合影',
          caption: '围桌相聚'
        },
        {
          src: photo('20260728 Gloria-Welles家', '05-meal.webp'),
          alt: '聚会餐桌上的餐点',
          caption: '一起分享的晚餐'
        },
        {
          src: photo('20260728 Gloria-Welles家', '06-reading.webp'),
          alt: '成员在窗边阅读',
          caption: '安静的阅读时光'
        },
        {
          src: photo('20260728 Gloria-Welles家', '07-game.webp'),
          alt: '成员一起玩桌游',
          caption: '桌游时间'
        },
        {
          src: photo('20260728 Gloria-Welles家', '08-selfie.webp'),
          alt: '聚会成员自拍合影',
          caption: '聚会自拍'
        }
      ]
    }
  ];
};
