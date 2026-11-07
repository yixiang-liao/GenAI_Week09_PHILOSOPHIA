/* ==========================================================================
   PHILOSOPHIA — 全站共用程式
   每個頁面在 <body data-page="..."> 指定頁面類型，本檔依此載入資料並渲染。
   新增條目只需修改 data/*.json，不需要修改本檔。
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- 路徑 ---------- */

  // 以本檔位置（js/app.js）推算網站根目錄，讓根目錄與 pages/ 內的頁面都能使用相同路徑
  const ROOT = new URL("../", document.currentScript.src).href;

  function siteURL(path) {
    return ROOT + path;
  }

  /* ---------- 分類設定 ---------- */

  const TYPES = {
    philosophers: {
      label: "哲學家",
      page: siteURL("pages/philosophers.html"),
      file: siteURL("data/philosophers.json"),
      intro: "認識東西方重要哲學家的生平、時代背景、核心思想與代表著作。"
    },
    schools: {
      label: "哲學學派",
      page: siteURL("pages/schools.html"),
      file: siteURL("data/schools.json"),
      intro: "了解各個哲學學派的起源、主要觀點與代表人物。"
    },
    concepts: {
      label: "哲學概念",
      page: siteURL("pages/concepts.html"),
      file: siteURL("data/concepts.json"),
      intro: "整理哲學中的核心概念，說明其起源、主要觀點與相關思想家。"
    },
    works: {
      label: "經典著作",
      page: siteURL("pages/works.html"),
      file: siteURL("data/works.json"),
      intro: "介紹哲學經典的成書背景與主要思想，作為閱讀原典的入門。"
    },
    comparisons: {
      label: "中西比較",
      page: siteURL("pages/comparisons.html"),
      file: siteURL("data/comparisons.json"),
      intro: "以共同的哲學問題為主題，分別整理中西方的觀點，再說明其相似與相異之處。"
    }
  };

  const TYPE_ORDER = ["philosophers", "schools", "concepts", "works", "comparisons"];

  const TRADITIONS = { east: "東方", west: "西方", both: "中西比較" };

  // 詳細頁的基本資料欄位
  const FACTS = {
    philosophers: [["years", "生卒"], ["era", "時代"], ["region", "地區"]],
    schools: [["era", "時期"]],
    concepts: [["era", "時期"]],
    works: [["era", "成書"]],
    comparisons: []
  };

  // 詳細頁的主要段落：paragraphs（段落陣列）、ideas（標題＋說明）、quotes（引文）、links（相關條目）
  const SECTIONS = {
    philosophers: [
      { key: "life", title: "生平", kind: "paragraphs" },
      { key: "background", title: "歷史背景", kind: "paragraphs" },
      { key: "ideas", title: "核心思想", kind: "ideas" },
      { key: "quotes", title: "名句選錄", kind: "quotes" },
      { key: "works", title: "代表著作", kind: "links" },
      { key: "schools", title: "相關學派", kind: "links" }
    ],
    schools: [
      { key: "origin", title: "起源與發展", kind: "paragraphs" },
      { key: "views", title: "主要觀點", kind: "ideas" },
      { key: "philosophers", title: "代表人物", kind: "links" }
    ],
    concepts: [
      { key: "origin", title: "起源", kind: "paragraphs" },
      { key: "views", title: "主要觀點", kind: "ideas" },
      { key: "philosophers", title: "代表人物", kind: "links" }
    ],
    works: [
      { key: "philosophers", title: "作者", kind: "links" },
      { key: "background", title: "作品背景", kind: "paragraphs" },
      { key: "ideas", title: "主要思想", kind: "ideas" }
    ]
  };

  // 側欄「延伸閱讀」顯示順序
  const RELATION_KEYS = ["philosophers", "schools", "concepts", "works"];

  /* ---------- 工具函式 ---------- */

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function detailURL(type, id) {
    return siteURL("pages/detail.html?type=") + encodeURIComponent(type) + "&id=" + encodeURIComponent(id);
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* 無法儲存時忽略 */
    }
  }

  /* ---------- 資料載入 ---------- */

  const cache = {};

  function loadType(type) {
    if (!cache[type]) {
      cache[type] = fetch(TYPES[type].file).then(function (response) {
        if (!response.ok) throw new Error(TYPES[type].file + " 載入失敗（" + response.status + "）");
        return response.json();
      });
    }
    return cache[type];
  }

  function loadAll() {
    return Promise.all(TYPE_ORDER.map(loadType)).then(function (lists) {
      const data = {};
      TYPE_ORDER.forEach(function (type, index) {
        data[type] = lists[index];
      });
      return data;
    });
  }

  function findEntry(data, type, id) {
    return (data[type] || []).find(function (entry) {
      return entry.id === id;
    });
  }

  function showLoadError(target, error) {
    const isFile = window.location.protocol === "file:";
    target.innerHTML =
      '<div class="notice"><p><strong>資料無法載入。</strong></p>' +
      (isFile
        ? "<p>瀏覽器不允許直接開啟的 HTML 讀取 JSON 檔。請在專案資料夾執行 <code>python3 -m http.server</code>，再開啟 <code>http://localhost:8000</code>；部署到 GitHub Pages 後即可正常瀏覽。</p>"
        : "<p>" + escapeHTML(error.message) + "</p>") +
      "</div>";
    console.error(error);
  }

  /* ---------- 共用版面 ---------- */

  function renderHeader(activeType) {
    const header = document.getElementById("site-header");
    if (!header) return;

    const links = TYPE_ORDER.map(function (type) {
      const current = type === activeType ? ' aria-current="page"' : "";
      return '<li><a href="' + TYPES[type].page + '"' + current + ">" + TYPES[type].label + "</a></li>";
    }).join("");

    header.className = "site-header";
    header.innerHTML =
      '<div class="container">' +
      '<a class="brand" href="' + siteURL("index.html") + '"><span class="brand-name">PHILOSOPHIA</span><span class="brand-sub">中西方哲學百科</span></a>' +
      '<nav class="site-nav" id="site-nav" aria-label="主要導覽"><ul>' + links + "</ul></nav>" +
      '<div class="header-tools">' +
      '<button class="icon-button" type="button" id="theme-toggle" aria-label="切換深淺色">明暗</button>' +
      '<button class="icon-button nav-toggle" type="button" aria-controls="site-nav" aria-expanded="false">選單</button>' +
      "</div></div>";

    const toggle = header.querySelector(".nav-toggle");
    const nav = header.querySelector(".site-nav");
    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    header.querySelector("#theme-toggle").addEventListener("click", function () {
      const root = document.documentElement;
      const current = root.dataset.theme ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      storageSet("philosophia-theme", next);
    });
  }

  function renderFooter() {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="container">' +
      "<p>PHILOSOPHIA — 中西方哲學百科全書</p>" +
      "<p>內容整理自原典與學術參考資料，各條目附有參考來源。</p>" +
      "</div>";
  }

  function applySavedTheme() {
    const saved = storageGet("philosophia-theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.dataset.theme = saved;
    }
  }

  /* ---------- 卡片與列表 ---------- */

  function badge(tradition) {
    return '<span class="badge" data-tradition="' + escapeHTML(tradition) + '">' +
      escapeHTML(TRADITIONS[tradition] || "") + "</span>";
  }

  function cardMeta(type, entry) {
    if (type === "philosophers") return entry.years + "｜" + entry.era;
    return entry.era || "";
  }

  function renderCard(type, entry) {
    return (
      '<a class="entry-card" data-tradition="' + escapeHTML(entry.tradition) + '" href="' + detailURL(type, entry.id) + '">' +
      "<div>" + badge(entry.tradition) + "</div>" +
      "<h2>" + escapeHTML(entry.name) + "</h2>" +
      '<span class="entry-original">' + escapeHTML(entry.nameOriginal) + "</span>" +
      "<p>" + escapeHTML(entry.summary) + "</p>" +
      '<span class="entry-meta">' + escapeHTML(cardMeta(type, entry)) + "</span>" +
      "</a>"
    );
  }

  function matchesQuery(entry, query) {
    if (!query) return true;
    const haystack = [entry.name, entry.nameOriginal, entry.summary, (entry.tags || []).join(" ")]
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(query.toLowerCase()) !== -1;
  }

  /* ---------- 首頁 ---------- */

  function initHome() {
    const main = document.getElementById("main");
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");
    const categories = document.getElementById("category-grid");
    const featured = document.getElementById("featured-comparisons");

    loadAll().then(function (data) {
      categories.innerHTML = TYPE_ORDER.map(function (type) {
        return (
          '<a class="category-card" href="' + TYPES[type].page + '">' +
          "<h3>" + TYPES[type].label + "</h3>" +
          "<p>" + TYPES[type].intro + "</p>" +
          '<span class="category-count">收錄 ' + data[type].length + " 條</span>" +
          "</a>"
        );
      }).join("");

      featured.innerHTML = data.comparisons.map(function (entry) {
        return renderCard("comparisons", entry);
      }).join("");

      function runSearch() {
        const query = input.value.trim();
        if (!query) {
          results.innerHTML = "";
          return;
        }
        const hits = [];
        TYPE_ORDER.forEach(function (type) {
          data[type].forEach(function (entry) {
            if (matchesQuery(entry, query)) hits.push({ type: type, entry: entry });
          });
        });
        // 名稱直接符合者排在前面
        hits.sort(function (a, b) {
          const aName = a.entry.name.indexOf(query) !== -1 ? 0 : 1;
          const bName = b.entry.name.indexOf(query) !== -1 ? 0 : 1;
          return aName - bName;
        });

        results.innerHTML =
          '<p class="search-summary">「' + escapeHTML(query) + "」共找到 " + hits.length + " 筆結果</p>" +
          (hits.length
            ? '<ul class="result-list">' + hits.map(function (hit) {
                return (
                  '<li><a href="' + detailURL(hit.type, hit.entry.id) + '">' +
                  '<span class="result-title">' + escapeHTML(hit.entry.name) + "</span>" +
                  '<span class="result-meta">' + TYPES[hit.type].label + "・" + escapeHTML(TRADITIONS[hit.entry.tradition]) + "</span>" +
                  '<span class="result-summary">' + escapeHTML(hit.entry.summary) + "</span>" +
                  "</a></li>"
                );
              }).join("") + "</ul>"
            : '<p class="empty-state">沒有找到相關條目，試試其他關鍵字，例如「倫理學」、「道」或「康德」。</p>');
      }

      input.addEventListener("input", runSearch);
      const initial = getParam("q");
      if (initial) {
        input.value = initial;
        runSearch();
      }
    }).catch(function (error) {
      showLoadError(main, error);
    });
  }

  /* ---------- 列表頁 ---------- */

  function initList(type) {
    const config = TYPES[type];
    const header = document.getElementById("page-header");
    const list = document.getElementById("entry-list");
    const filterBar = document.getElementById("filter-bar");

    document.title = config.label + "｜PHILOSOPHIA";
    header.innerHTML = "<h1>" + config.label + "</h1><p>" + config.intro + "</p>";

    const showTabs = type !== "comparisons";
    let tradition = getParam("tradition");
    if (["east", "west"].indexOf(tradition) === -1) tradition = "all";

    filterBar.innerHTML =
      (showTabs
        ? '<div class="tab-group" role="group" aria-label="依文化傳統篩選">' +
          [["all", "全部"], ["east", "東方"], ["west", "西方"]].map(function (tab) {
            return '<button type="button" data-tradition="' + tab[0] + '" aria-pressed="' + (tab[0] === tradition) + '">' + tab[1] + "</button>";
          }).join("") +
          "</div>"
        : "") +
      '<label class="visually-hidden" for="list-filter">篩選' + config.label + "</label>" +
      '<input id="list-filter" type="search" placeholder="在' + config.label + '中搜尋…" autocomplete="off">';

    const input = filterBar.querySelector("input");

    loadType(type).then(function (entries) {
      function render() {
        const query = input.value.trim();
        const shown = entries.filter(function (entry) {
          return (tradition === "all" || entry.tradition === tradition) && matchesQuery(entry, query);
        });
        list.innerHTML = shown.length
          ? shown.map(function (entry) { return renderCard(type, entry); }).join("")
          : '<p class="empty-state">沒有符合條件的條目。</p>';
      }

      filterBar.querySelectorAll(".tab-group button").forEach(function (button) {
        button.addEventListener("click", function () {
          tradition = button.dataset.tradition;
          filterBar.querySelectorAll(".tab-group button").forEach(function (other) {
            other.setAttribute("aria-pressed", String(other === button));
          });
          render();
        });
      });
      input.addEventListener("input", render);
      render();
    }).catch(function (error) {
      showLoadError(list, error);
    });
  }

  /* ---------- 詳細頁 ---------- */

  function renderParagraphs(paragraphs) {
    return (paragraphs || []).map(function (text) {
      return "<p>" + escapeHTML(text) + "</p>";
    }).join("");
  }

  function renderIdeas(ideas) {
    return '<dl class="idea-list">' + (ideas || []).map(function (idea) {
      return "<dt>" + escapeHTML(idea.title) + "</dt><dd>" + escapeHTML(idea.text) + "</dd>";
    }).join("") + "</dl>";
  }

  function renderQuotes(quotes) {
    return (quotes || []).map(function (quote) {
      return '<blockquote class="quote"><p>' + escapeHTML(quote.text) + "</p><footer>— " + escapeHTML(quote.source) + "</footer></blockquote>";
    }).join("");
  }

  function relatedEntries(data, type, ids) {
    return (ids || []).map(function (id) {
      return findEntry(data, type, id);
    }).filter(Boolean);
  }

  function renderLinkList(data, type, ids) {
    const entries = relatedEntries(data, type, ids);
    return '<dl class="idea-list">' + entries.map(function (entry) {
      return '<dt><a href="' + detailURL(type, entry.id) + '">' + escapeHTML(entry.name) + "</a></dt><dd>" + escapeHTML(entry.summary) + "</dd>";
    }).join("") + "</dl>";
  }

  function renderSection(data, section, entry) {
    const value = entry[section.key];
    if (!value || !value.length) return "";
    let body = "";
    if (section.kind === "paragraphs") body = renderParagraphs(value);
    if (section.kind === "ideas") body = renderIdeas(value);
    if (section.kind === "quotes") body = renderQuotes(value);
    if (section.kind === "links") {
      if (!relatedEntries(data, section.key, value).length) return "";
      body = renderLinkList(data, section.key, value);
    }
    return '<section class="article-section"><h2>' + section.title + "</h2>" + body + "</section>";
  }

  function renderSources(sources) {
    if (!sources || !sources.length) return "";
    return (
      '<section class="article-section"><h2>參考資料</h2><ul class="source-list">' +
      sources.map(function (source) {
        return source.url
          ? '<li><a href="' + escapeHTML(source.url) + '" target="_blank" rel="noopener">' + escapeHTML(source.title) + "</a></li>"
          : "<li>" + escapeHTML(source.title) + "</li>";
      }).join("") +
      "</ul></section>"
    );
  }

  function renderAside(data, type, entry, excludeKeys) {
    const groups = [];

    RELATION_KEYS.forEach(function (key) {
      if (excludeKeys.indexOf(key) !== -1) return;
      const entries = relatedEntries(data, key, entry[key]).filter(function (item) {
        return !(key === type && item.id === entry.id);
      });
      if (entries.length) groups.push({ title: TYPES[key].label, type: key, entries: entries });
    });

    // 自動列出引用本條目的中西比較
    if (type !== "comparisons") {
      const comparisons = data.comparisons.filter(function (item) {
        return (item[type] || []).indexOf(entry.id) !== -1;
      });
      if (comparisons.length) groups.push({ title: "中西比較", type: "comparisons", entries: comparisons });
    }

    if (!groups.length) return "";
    return (
      '<aside class="article-aside" aria-label="延伸閱讀"><div class="aside-inner">' +
      groups.map(function (group) {
        return (
          '<div class="aside-group"><h3>' + group.title + "</h3><ul>" +
          group.entries.map(function (item) {
            return '<li><a href="' + detailURL(group.type, item.id) + '">' + escapeHTML(item.name) + "</a></li>";
          }).join("") +
          "</ul></div>"
        );
      }).join("") +
      "</div></aside>"
    );
  }

  function renderBreadcrumb(type, entry) {
    return (
      '<nav class="breadcrumb" aria-label="麵包屑"><a href="' + siteURL("index.html") + '">首頁</a><span aria-hidden="true">/</span>' +
      '<a href="' + TYPES[type].page + '">' + TYPES[type].label + '</a><span aria-hidden="true">/</span>' +
      "<span>" + escapeHTML(entry.name) + "</span></nav>"
    );
  }

  function renderArticleHeader(type, entry) {
    const facts = FACTS[type].filter(function (fact) {
      return entry[fact[0]];
    });
    return (
      '<header class="article-header">' + badge(entry.tradition) +
      "<h1>" + escapeHTML(entry.name) + "</h1>" +
      '<span class="entry-original">' + escapeHTML(entry.nameOriginal) + "</span>" +
      (facts.length
        ? '<dl class="fact-list">' + facts.map(function (fact) {
            return "<div><dt>" + fact[1] + "</dt><dd>" + escapeHTML(entry[fact[0]]) + "</dd></div>";
          }).join("") + "</dl>"
        : "") +
      "</header>"
    );
  }

  function renderEntryDetail(data, type, entry) {
    const sections = SECTIONS[type];
    const mainLinkKeys = sections.filter(function (section) {
      return section.kind === "links";
    }).map(function (section) {
      return section.key;
    });

    return (
      renderBreadcrumb(type, entry) +
      '<div class="article-layout"><article>' +
      renderArticleHeader(type, entry) +
      '<p class="lead">' + escapeHTML(entry.summary) + "</p>" +
      sections.map(function (section) { return renderSection(data, section, entry); }).join("") +
      renderSources(entry.sources) +
      "</article>" +
      renderAside(data, type, entry, mainLinkKeys) +
      "</div>"
    );
  }

  function renderCompareColumn(data, tradition, side) {
    return (
      '<div class="compare-column" data-tradition="' + tradition + '">' + badge(tradition) +
      "<h2>" + escapeHTML(side.title) + "</h2>" +
      renderParagraphs(side.points) +
      "</div>"
    );
  }

  function renderComparisonDetail(data, entry) {
    return (
      renderBreadcrumb("comparisons", entry) +
      '<article class="compare-layout">' +
      '<header class="article-header">' + badge("both") +
      "<h1>" + escapeHTML(entry.name) + "</h1>" +
      '<span class="entry-original">' + escapeHTML(entry.nameOriginal) + "</span>" +
      "</header>" +
      '<p class="lead">' + escapeHTML(entry.summary) + "</p>" +
      '<section class="article-section prose"><h2>共同的問題</h2>' + renderParagraphs(entry.question) + "</section>" +
      '<div class="compare-grid">' +
      renderCompareColumn(data, "east", entry.east) +
      renderCompareColumn(data, "west", entry.west) +
      "</div>" +
      '<section class="article-section prose"><h2>相似之處</h2><ul class="plain-list">' +
      entry.similarities.map(function (text) { return "<li>" + escapeHTML(text) + "</li>"; }).join("") +
      "</ul></section>" +
      '<section class="article-section prose"><h2>相異之處</h2><ul class="plain-list">' +
      entry.differences.map(function (text) { return "<li>" + escapeHTML(text) + "</li>"; }).join("") +
      "</ul></section>" +
      '<section class="article-section prose"><h2>延伸閱讀</h2>' +
      RELATION_KEYS.map(function (key) {
        const entries = relatedEntries(data, key, entry[key]);
        if (!entries.length) return "";
        return (
          "<p><strong>" + TYPES[key].label + "：</strong>" +
          entries.map(function (item) {
            return '<a href="' + detailURL(key, item.id) + '">' + escapeHTML(item.name) + "</a>";
          }).join("、") +
          "</p>"
        );
      }).join("") +
      "</section>" +
      '<div class="prose">' + renderSources(entry.sources) + "</div>" +
      "</article>"
    );
  }

  function initDetail() {
    const main = document.getElementById("detail");
    const type = getParam("type");
    const id = getParam("id");

    if (!TYPES[type] || !id) {
      main.innerHTML = '<div class="notice"><p>找不到這個條目。請回到<a href="' + siteURL("index.html") + '">首頁</a>重新選擇。</p></div>';
      return;
    }

    renderHeader(type);

    loadAll().then(function (data) {
      const entry = findEntry(data, type, id);
      if (!entry) {
        main.innerHTML = '<div class="notice"><p>找不到這個條目。請回到<a href="' + TYPES[type].page + '">' + TYPES[type].label + "</a>重新選擇。</p></div>";
        return;
      }
      document.title = entry.name + "｜" + TYPES[type].label + "｜PHILOSOPHIA";
      const description = document.querySelector('meta[name="description"]');
      if (description) description.setAttribute("content", entry.summary);
      main.innerHTML = type === "comparisons"
        ? renderComparisonDetail(data, entry)
        : renderEntryDetail(data, type, entry);
    }).catch(function (error) {
      showLoadError(main, error);
    });
  }

  /* ---------- 啟動 ---------- */

  applySavedTheme();

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.dataset.page;
    const type = document.body.dataset.type;

    if (page !== "detail") renderHeader(type);
    renderFooter();

    if (page === "home") initHome();
    if (page === "list" && TYPES[type]) initList(type);
    if (page === "detail") initDetail();
  });
})();
