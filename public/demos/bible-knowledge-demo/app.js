const data = {
  mountains: [
    {
      id: "moriah",
      number: "01",
      name: "摩利亚山",
      era: "族长时期",
      theme: "献上与预备",
      tags: ["worship", "covenant"],
      reference: "创 22:1–14；代下 3:1",
      people: "亚伯拉罕、以撒、所罗门",
      image: "./assets/images/mount-moriah.png",
      summary: "从亚伯拉罕献以撒，到所罗门建造圣殿，摩利亚把“神必预备”与敬拜中心连在一起。",
      question: "当我无法看清结局时，是否仍愿意信靠神的预备？",
      note: "创世记称摩利亚地的一座山；历代志下 3:1 把耶路撒冷建殿地点称为摩利亚山。"
    },
    {
      id: "sinai",
      number: "02",
      name: "何烈／西奈山",
      era: "出埃及时期",
      theme: "显现与立约",
      tags: ["covenant"],
      reference: "出 3:1–12；出 19–20",
      people: "摩西、亚伦、以色列民",
      image: "./assets/images/mount-sinai.png",
      summary: "摩西在何烈山蒙召，以色列人在西奈山领受律法；旷野的山成为呼召、界限与圣约的场所。",
      question: "神的恩典已经把我带到哪里，而祂的诫命正在塑造我什么？",
      note: "何烈与西奈在经文中的关系有不同解释；Demo 采用并列名称，不武断处理具体地理争议。"
    },
    {
      id: "carmel",
      number: "03",
      name: "迦密山",
      era: "列王时期",
      theme: "争战与见证",
      tags: ["witness", "worship"],
      reference: "王上 18:19–46",
      people: "以利亚、亚哈、以色列民",
      image: "./assets/images/mount-carmel.png",
      summary: "在旱灾与偶像崇拜的背景中，以利亚重修祭坛，呼召百姓重新确认谁是真神。",
      question: "在摇摆不定的地方，我需要重新修复哪一座敬拜的祭坛？",
      note: "插图聚焦重修祭坛与降雨后的回应，避免把故事处理成暴力 spectacle。"
    },
    {
      id: "olives",
      number: "04",
      name: "橄榄山",
      era: "福音时期",
      theme: "教导与差遣",
      tags: ["mission"],
      reference: "太 24；路 22:39–46；徒 1:9–12",
      people: "耶稣、门徒",
      image: "./assets/images/mount-olives.png",
      summary: "从末世教导、客西马尼的祷告到升天，橄榄山把警醒、顺服和使命放在同一条路上。",
      question: "我今天需要在哪件事上保持警醒，并迈出顺服的一步？",
      note: "客西马尼园位于橄榄山一带；看板把教导、祷告与升天作为三段事件分别呈现。"
    },
    {
      id: "zion",
      number: "05",
      name: "锡安山",
      era: "王国与诗篇",
      theme: "同在与盼望",
      tags: ["worship", "mission"],
      reference: "撒下 5:7；诗 48；赛 2:1–4",
      people: "大卫、诗人、先知",
      image: "./assets/images/hero-mountains.png",
      summary: "锡安首先与大卫城相关，随后在诗篇和先知书中承载圣殿、神掌权与万民归向的盼望。",
      question: "我怎样把对神同在的渴望，转化为和平与公义的生活？",
      note: "“锡安”的含义在圣经叙事中逐步扩展，不能在所有经文中机械等同为同一个山头。"
    },
    {
      id: "nebo",
      number: "06",
      name: "尼波／毗斯迦",
      era: "旷野末期",
      theme: "遥望与交托",
      tags: ["covenant", "mission"],
      reference: "申 34:1–8",
      people: "摩西、约书亚",
      image: "./assets/images/hero-mountains.png",
      summary: "摩西在山顶遥望应许之地，却把下一段使命交给约书亚；未完成不等于失信。",
      question: "有哪些结果需要我忠心遥望，却谦卑交托给下一代？",
      note: "申命记把尼波山与毗斯迦山顶连在同一段叙述中；详情页保留这组并列称呼。"
    }
  ],
  offerings: [
    {
      id: "burnt",
      number: "01",
      name: "燔祭",
      era: "利未记 1",
      theme: "全然献上",
      tags: ["dedication"],
      reference: "利 1；利 6:8–13",
      people: "献祭者、祭司",
      image: "./assets/images/offering-burnt.png",
      summary: "祭牲按规定处理并焚烧在坛上，表达全然献上与蒙神悦纳；坛上的火要常常烧着。",
      question: "“全然献上”在我今天的时间、选择和关系中意味着什么？",
      note: "Demo 插图只呈现祭坛和木柴，以教育性方式避免不必要的动物与血腥画面。"
    },
    {
      id: "grain",
      number: "02",
      name: "素祭",
      era: "利未记 2",
      theme: "劳作与感恩",
      tags: ["gratitude", "dedication"],
      reference: "利 2；利 6:14–23",
      people: "献祭者、祭司",
      image: "./assets/images/offering-grain.png",
      summary: "细面、油与乳香成为献礼；素祭让日常土地与劳作的成果进入敬拜。",
      question: "我可以怎样把普通的工作成果，当作感恩而不是自我证明？",
      note: "素祭本身不使用动物，不应被概括为“所有献祭都必须流血”。"
    },
    {
      id: "peace",
      number: "03",
      name: "平安祭",
      era: "利未记 3、7",
      theme: "相交与分享",
      tags: ["gratitude"],
      reference: "利 3；利 7:11–21、28–36",
      people: "献祭者、家人、祭司",
      image: "./assets/images/offering-peace.png",
      summary: "祭物的一部分献在坛上，一部分归祭司，献祭者也参与筵席，呈现与神及群体的相交。",
      question: "我的感恩是否正在变成可以与别人分享的和平与款待？",
      note: "感谢祭、还愿祭和甘心祭可视为平安祭中的不同表达，细节与食用时限并不完全相同。"
    },
    {
      id: "sin",
      number: "04",
      name: "赎罪祭",
      era: "利未记 4–5",
      theme: "洁净与赦免",
      tags: ["atonement"],
      reference: "利 4:1–5:13",
      people: "受膏祭司、会众、官长、个人",
      image: "./assets/images/hero-offerings.png",
      summary: "赎罪祭处理误犯之罪及其造成的污秽；祭物与血的处理会随献祭者身份和情境而变化。",
      question: "我是否只想摆脱内疚，还是愿意让神洁净罪所带来的真实影响？",
      note: "更精确的研究常把它译作“洁净祭”；Demo 沿用中文圣经读者熟悉的“赎罪祭”，并在详情中补充说明。"
    },
    {
      id: "guilt",
      number: "05",
      name: "赎愆祭",
      era: "利未记 5–7",
      theme: "赔偿与修复",
      tags: ["atonement", "repair"],
      reference: "利 5:14–6:7；利 7:1–7",
      people: "亏欠者、受损者、祭司",
      image: "./assets/images/offering-guilt.png",
      summary: "赎愆祭不止处理罪责，还要求归还亏欠并加上五分之一，让悔改进入具体的关系修复。",
      question: "有哪些道歉必须进一步变成归还、赔偿或关系上的修复？",
      note: "插图以归还物品和衡量赔偿表达主题，不把赎罪简化为抽象的宗教仪式。"
    }
  ]
};

const boardTabs = [...document.querySelectorAll(".board-tab")];
const boards = [...document.querySelectorAll(".board")];
const dialog = document.querySelector("#detail-dialog");
const dialogClose = dialog.querySelector(".dialog-close");

function createCard(item, index) {
  const article = document.createElement("article");
  article.className = "story-card";
  article.dataset.tags = item.tags.join(" ");
  article.style.animationDelay = `${index * 55}ms`;
  article.innerHTML = `
    <button type="button" data-item-id="${item.id}" aria-label="查看${item.name}详情">
      <div class="card-visual">
        <img src="${item.image}" alt="${item.name}故事场景插图" width="768" height="512" loading="lazy" />
        <span class="card-number">${item.number}</span>
        <span class="card-era">${item.era}</span>
      </div>
      <div class="card-copy">
        <p class="card-theme">${item.theme}</p>
        <h3>${item.name}</h3>
        <p>${item.summary}</p>
        <div class="card-footer">
          <span>${item.reference}</span>
          <span class="card-link">进入故事 →</span>
        </div>
      </div>
    </button>
  `;
  return article;
}

function renderGrid(type) {
  const grid = document.querySelector(`#${type === "mountains" ? "mountain" : "offering"}-grid`);
  grid.replaceChildren(...data[type].map(createCard));
  grid.dataset.view = "cards";

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-item-id]");
    if (!button) return;
    const item = data[type].find((entry) => entry.id === button.dataset.itemId);
    openDialog(item, type);
  });
}

function openDialog(item, type) {
  const typeName = type === "mountains" ? "圣经名山" : "圣经献祭";
  const dialogImage = document.querySelector("#dialog-image");
  dialogImage.src = item.image;
  dialogImage.alt = `${item.name}主题插图`;
  document.querySelector("#dialog-kicker").textContent = `${typeName} · ${item.era}`;
  document.querySelector("#dialog-title").textContent = item.name;
  document.querySelector("#dialog-summary").textContent = item.summary;
  document.querySelector("#dialog-reference").textContent = item.reference;
  document.querySelector("#dialog-people").textContent = item.people;
  document.querySelector("#dialog-theme").textContent = item.theme;
  document.querySelector("#dialog-question").textContent = item.question;
  document.querySelector("#dialog-note").textContent = `经文与图像说明：${item.note}`;
  dialog.showModal();
}

function activateBoard(target) {
  boardTabs.forEach((tab) => {
    const active = tab.dataset.boardTarget === target;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  boards.forEach((board) => {
    const active = board.dataset.board === target;
    board.hidden = !active;
    board.classList.toggle("is-active", active);
  });

  document.title = target === "mountains" ? "圣经名山 · 知识看板 Demo" : "圣经献祭 · 知识看板 Demo";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

boardTabs.forEach((tab) => {
  tab.addEventListener("click", () => activateBoard(tab.dataset.boardTarget));
});

boards.forEach((board) => {
  const type = board.dataset.board;
  const grid = board.querySelector(".story-grid");
  const filters = [...board.querySelectorAll(".filter-chip")];
  const viewButtons = [...board.querySelectorAll(".view-switch button")];

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      filters.forEach((chip) => chip.classList.toggle("is-active", chip === button));
      const filter = button.dataset.filter;
      [...grid.children].forEach((card) => {
        card.hidden = filter !== "all" && !card.dataset.tags.split(" ").includes(filter);
      });
    });
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      viewButtons.forEach((viewButton) => {
        const active = viewButton === button;
        viewButton.classList.toggle("is-active", active);
        viewButton.setAttribute("aria-pressed", String(active));
      });
      grid.dataset.view = button.dataset.view;
    });
  });

  board.querySelectorAll("[data-scroll-to]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`#${button.dataset.scrollTo}`).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  renderGrid(type);
});

dialogClose.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const box = dialog.getBoundingClientRect();
  const outside =
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom;
  if (outside) dialog.close();
});
