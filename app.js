"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const content = $("#content");
const modal = $("#modal");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const icon = file => '<img class="icon" src="assets/' + file + '" alt="">';
const opts = (options, value) => options.map(option => {
  const [key, label] = Array.isArray(option) ? option : [option, option];
  return '<option value="' + escapeHtml(key) + '"' + (key === value ? " selected" : "") + '>' + escapeHtml(label) + '</option>';
}).join("");
const branches = ["Арбат", "Тверская", "Хамовники", "Патриаршие", "Садовая", "Маяковская", "Бауманская", "Чистые пруды"];
const statusNames = {active:"Активен", planned:"Запланирован", ended:"Завершен"};
const layout = [
  ["Аналитика","055dc.svg"], ["Клиенты","c1f0e.svg"], ["Обзор","97ba3.svg"],
  ["Сотрудники","5909c.svg"], ["Услуги","578b9.svg"], ["Склад","15ca8.svg"]
];
const loyalty = ["Тип карт","Карты лояльности","Промокоды","Акции","Автоприменение акций","Транзакции",
  "Реферальная программа","Типы сертификатов","Сертификаты","Типы абонементов","Абонементы"];
const navItem = ([label, file], arrow = true) =>
  '<div class="nav-item">' + icon(file) + '<span>' + label + '</span>' + (arrow ? icon("694d5.svg") : "") + '</div>';
$("#sidebar").innerHTML = '<div class="brand">' + icon("559dd.svg") +
  '<span>Сеть Enjoy Luxury Spa &amp; Beauty Studio</span>' + icon("00278.svg") + '</div>' +
  layout.map((item, index) => navItem(item, index !== 1)).join("") +
  '<details open><summary class="nav-item">' + icon("ab31a.svg") +
  '<span>Лояльность</span>' + icon("694d5.svg") + '</summary><div class="subnav">' +
  loyalty.map(name => name === "Промокоды" ?
    '<a class="nav-item" href="#list">Промокоды <small class="badge-new">Новое</small></a>' :
    '<div class="nav-item">' + name + '</div>').join("") + '</div></details>' +
  [["Счета клиентов","46100.svg"],["Онлайн-продажи","5a4fc.svg"],["Телефония","8de85.svg"]].map(item => navItem(item)).join("") +
  '<hr class="nav-divider">' + navItem(["Настройки","192cc.svg"]) + navItem(["Личный кабинет","c9e15.svg"], false) +
  '<hr class="nav-divider">' + navItem(["Центр помощи","3886d.svg"]) +
  [["App Store","e2c39.svg","2b67f.svg"],["Google Play","92c88.svg","bdf56.svg"],["AppGallery","a9425.svg","b59bf.svg"]]
    .map(([name, logo, label]) => '<div class="store" aria-label="' + name + '">' + icon(logo) +
      '<span><small>Загрузите в</small>' + icon(label) + '</span></div>').join("");
$("#rail").innerHTML = '<img class="avatar" src="assets/45707.png" alt="">' +
  icon("cbdf2.svg") + icon("0da83.svg") + '<div class="rail-spacer"></div>' +
  icon("cb24a.svg") + icon("5ae13.svg") + '<div class="rail-chat">' + icon("310b8.svg") + '</div>';

const base = {
  name:"", code:"", amount:"", unit:"%", capOn:false, cap:"", combine:false, start:"", end:"",
  clientMode:"limited", clientLimit:"1", totalMode:"all", totalLimit:"",
  everyBranch:true, branches:[], minimumOn:false, minimum:"", scope:"both",
  servicesMode:"all", goodsMode:"all", staffMode:"all", services:[], goods:[], staff:[], used:0
};
const sample = [
  ["Скидка новым клиентам","WELCOME20",1000,"₽","active",126,500],
  ["Осенняя акция","AUTUMN500",500,"₽","planned",0,500],
  ["Black Friday","BLACK30",30,"%","planned",0,0],
  ["Возвращаем клиентов","COMEBACK",15,"%","ended",500,500],
  ["Летняя акция","BLACK30",30,"%","active",126,500],
  ["День рождения сети","COMEBACK",15,"%","ended",126,0],
  ["Летняя акция","BLACK30",30,"%","active",126,500],
  ["День рождения сети","COMEBACK",15,"%","active",126,500],
  ["Летняя акция","BLACK30",30,"%","ended",126,500],
  ["День рождения сети","COMEBACK",15,"%","active",126,500],
  ["Возвращаем клиентов","COMEBACK",15,"%","ended",500,500],
  ["День рождения салона","BIRTHDAY15",15,"%","ended",240,500]
].map(([name,code,amount,unit,status,used,limit], index) => ({
  ...base, id:"demo-" + index, name, code, amount, unit, exampleStatus:status, used,
  start:status === "planned" ? "2026-11-01" : "2026-10-01", end:"2026-12-31",
  totalMode:limit ? "limited" : "all", totalLimit:String(limit || ""), archived:index >= 10,
  everyBranch:index % 3 === 0, branches:[branches[index % branches.length]]
}));
const storageKey = "promo-prototype-v1";
function readRecords() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(stored) ? stored : structuredClone(sample);
  } catch {
    return structuredClone(sample);
  }
}
let records = readRecords();
let route = "", draft, editId, detailTab, validation = {}, historyPage = 1, historySize = 10;
let listTab = "current";
const filters = {query:"", status:"", branch:"", start:"", end:"", page:1, size:10};
let popup = null;
let toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").hidden = true, 3000);
}
function persist(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    records = next;
    return true;
  } catch {
    toast("Не удалось сохранить данные в браузере");
    return false;
  }
}
function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
}
const formatDate = date => date ? date.split("-").reverse().join(".") : "";
const rangeText = (start, end) => [formatDate(start), formatDate(end)].filter(Boolean).join(" – ");
const amountText = value => Number(value).toLocaleString("ru-RU");
function statusOf(record) {
  if (record.archived) return "ended";
  if (record.exampleStatus) return record.exampleStatus;
  const today = localDate();
  if (record.end < today || (record.totalMode === "limited" && record.used >= Number(record.totalLimit))) return "ended";
  return record.start > today ? "planned" : "active";
}
function go(target) {
  if (location.hash === "#" + target) renderRoute(true);
  else location.hash = target;
}
function renderRoute(force = false) {
  const next = location.hash.slice(1) || "list";
  if (next === route && !force) return;
  closePopup();
  if (modal.open) modal.close();
  route = next;
  editId = route.startsWith("promo/") ? route.slice(6) : null;
  const record = records.find(item => item.id === editId);
  if (editId && !record) return go("list");
  draft = record ? structuredClone({...base, ...record}) : structuredClone(base);
  detailTab = "settings";
  historyPage = 1;
  validation = {};
  const editing = route === "new" || !!editId;
  $("#breadcrumbs").innerHTML = '<a href="#list">Лояльность</a>' + (editing ? " / <a href='#list'>Промокоды</a>" : "");
  if (editing) renderEditor();
  else renderList();
  window.scrollTo(0,0);
}
window.addEventListener("hashchange", () => renderRoute());

function tabs(values, selected, event) {
  return '<div class="tabs" role="tablist">' + values.map(([value, label]) =>
    '<button type="button" role="tab" aria-selected="' + (value === selected) + '" data-action="' + event +
    '" data-value="' + value + '">' + label + '</button>').join("") + '</div>';
}
function dateControl(start, end, placeholder, target) {
  return '<div class="control"><button type="button" class="field-button" data-action="calendar" data-value="' + target +
    '" aria-expanded="false" aria-label="' + placeholder + '"><span class="' + (start ? "" : "placeholder") + '">' +
    (rangeText(start,end) || placeholder) + '</span>' + icon("4d7bf.svg") + '</button></div>';
}
function renderList() {
  const current = listTab === "current";
  content.innerHTML = '<div class="list"><div class="title-row"><h1>Промокоды</h1>' +
    '<button class="primary" data-action="new">＋ Создать промокод</button></div>' +
    tabs([["current","Текущие"],["archive","Архив"]],listTab,"list-tab") +
    '<div class="filters"><div class="search">' + icon("e80ac.svg") +
    '<input type="search" id="search" aria-label="Поиск по названию или коду" placeholder="Поиск по названию или коду" value="' +
    escapeHtml(filters.query) + '"></div><div class="filter-row">' +
    (current ? '<select id="filter-status" aria-label="Статус">' +
      opts([["","Все статусы"],["active","Активные"],["planned","Запланированные"],["ended","Завершенные"]],filters.status) + '</select>' : '') +
    '<select id="filter-branch" aria-label="Филиал">' + opts([["","Все филиалы"],...branches],filters.branch) +
    '</select>' + dateControl(filters.start,filters.end,"Любой период","filter") + '</div></div><div id="list-results"></div></div>';
  renderListResults();
}
function pager(page, size, count, noun, target) {
  const total = Math.max(1, Math.ceil(count / size));
  const shown = Math.min(5,total);
  const first = Math.max(1,Math.min(page - 2, total - shown + 1));
  return '<div class="pager"><label><select data-size="' + target + '" aria-label="Количество на странице">' +
    opts(["10","20","50"],String(size)) + '</select>' + noun + ' на странице</label><span>' +
    ((page-1)*size+1) + '–' + Math.min(page*size,count) + ' из ' + count + '</span><div>' +
    '<button class="plain" data-action="page" data-target="' + target + '" data-value="' + (page-1) +
    '" aria-label="Предыдущая страница"' + (page === 1 ? " disabled" : "") + '>‹</button>' +
    Array.from({length:shown},(_,i) => first+i).map(number =>
      '<button class="plain" data-action="page" data-target="' + target + '" data-value="' + number + '"' +
      (number === page ? ' aria-current="page"' : '') + '>' + number + '</button>').join("") +
    '<button class="plain" data-action="page" data-target="' + target + '" data-value="' + (page+1) +
    '" aria-label="Следующая страница"' + (page === total ? " disabled" : "") + '>›</button></div></div>';
}
function renderListResults() {
  const query = filters.query.trim().toLocaleLowerCase("ru");
  const archived = listTab === "archive";
  const matching = records.filter(record => !!record.archived === archived &&
    (!query || [record.name,record.code].some(value => value.toLocaleLowerCase("ru").includes(query))) &&
    (archived || !filters.status || statusOf(record) === filters.status) &&
    (!filters.branch || record.everyBranch || record.branches.includes(filters.branch)) &&
    (!filters.start || record.end >= filters.start) && (!filters.end || record.start <= filters.end));
  filters.page = Math.min(filters.page,Math.max(1,Math.ceil(matching.length/filters.size)));
  const rows = matching.slice((filters.page-1)*filters.size,filters.page*filters.size).map(record => {
    const status = statusOf(record);
    const used = record.used + " / " + (record.totalMode === "all" ? "Без ограничений" : record.totalLimit);
    return '<tr data-id="' + record.id + '"><td><a href="#promo/' + record.id + '">' + escapeHtml(record.name) +
      '</a></td><td>' + escapeHtml(record.code) + '</td><td>' + amountText(record.amount) +
      (record.unit === "%" ? "%" : " ₽") + '</td><td>' + rangeText(record.start,record.end) +
      '</td><td title="' + used + '">' + used + '</td>' +
      (archived ? "" : '<td><span class="status ' + status + '">' + statusNames[status] + '</span></td>') +
      '<td class="actions"><button class="plain" aria-label="Действия с промокодом" data-action="menu" data-value="' +
      record.id + '">⋯</button></td></tr>';
  }).join("");
  const columns = [[archived ? "39%" : "27%","Название"],["13%","Промокод"],["9%","Скидка"],["19%","Период действия"],["15%","Использования"],
    ...(archived ? [] : [["12%","Статус"]]),["5%",""]];
  $("#list-results").innerHTML = '<div class="table-wrap"><table><thead><tr>' + columns.map(([width,label]) =>
    '<th style="width:' + width + '">' + label + '</th>').join("") + '</tr></thead><tbody>' +
    (rows || '<tr><td class="empty" colspan="' + columns.length + '">Промокоды не найдены</td></tr>') +
    '</tbody></table></div>' + (matching.length ? pager(filters.page,filters.size,matching.length,"промокодов","list") : "");
}

const catalogs = {
  services:{title:"Услуги", noun:"услуг", singular:"услугу", category:"Категории услуг", every:"Все услуги категории", groups:{
    "Маникюр":["Дизайн ногтя (рисунок сложный)","Дизайн ногтя (стразы 7 шт)","Гель-лак","Шеллак",
      "Коррекция нарощенных ногтей","Удаление кутикулы","Уход для ногтей","Маникюр обыкновенный"],
    "Педикюр":["Дизайн ногтя","Гель-лак","Кутикула","Педикюр классический"],
    "Стрижки":["Женская стрижка","Мужская стрижка"], "Массаж":["Классический массаж","Массаж лица"],
    "Косметология":["Чистка лица","Уход за кожей"], "Брови":["Коррекция бровей","Окрашивание бровей"]
  }},
  goods:{title:"Товары", noun:"товаров", singular:"товар", category:"Категории товаров", every:"Все товары категории", groups:{
    "Шампуни":["Шампунь NOUNOU 500 мл","Шампунь NOUNOU 1000 мл","Шампунь L’Oreal 250 мл",
      "Шампунь L’Oreal 500 мл","Шампунь L’Oreal 1 000 мл","Шампунь Kydra 250 мл","Шампунь Kydra 500 мл","Шампунь Kydra 100 мл"],
    "Гель-лаки":["Гель-лак Luxio Blush оттенок 200","Гель-лак Luxio Capuchino оттенок 400"],
    "Маски для волос":["Маска NOUNOU","Маска Kydra"]
  }},
  staff:{title:"Сотрудники", noun:"сотрудников", singular:"сотрудника", category:"Должности", every:"Все сотрудники должности", groups:{
    "Мастера маникюра":["Анна Петрова","Никита Иванов","Елена Рыбкина","Игорь Семенов","Софья Никитина","Арина Соколова"],
    "Мастера педикюра":["Екатерина Смирнова","Александра Ивановна Мамаева","Мария Волкова","Ольга Козлова"],
    "Парикмахеры":["Виктория Орлова","Дмитрий Павлов"], "Массажисты":["Елена Морозова","Алексей Соколов"]
  }}
};
function catalogGroups(key) {
  const groups = catalogs[key].groups;
  if (key !== "staff" || draft.everyBranch) return groups;
  return Object.fromEntries(Object.entries(groups).map(([category, people], group) => [
    category, people.filter((person,index) => draft.branches.includes(branches[(group+index)%branches.length]))
  ]).filter(([,people]) => people.length));
}
const error = name => validation[name] ? '<div class="error" role="alert">' + validation[name] + '</div>' : "";
const invalid = name => validation[name] ? ' class="invalid" aria-invalid="true"' : "";
const field = (label, body, hint = "", classes = "") => '<div class="field ' + classes + '"><span>' +
  label + '</span>' + body + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
function input(name, placeholder = "0", type = "number", label = "") {
  return '<input data-field="' + name + '" aria-label="' + escapeHtml(label || ({cap:"Максимальная сумма скидки",
    minimum:"Минимальная сумма заказа",clientLimit:"Лимит на одного клиента",totalLimit:"Общий лимит"}[name] ?? name)) +
    '" type="' + type + '" value="' + escapeHtml(draft[name]) + '" placeholder="' + escapeHtml(placeholder) + '"' +
    (type === "number" ? ' min="0" step="any"' : ' maxlength="100"') + invalid(name) + '>';
}
function check(name, label) {
  return '<label class="check"><input type="checkbox" data-field="' + name + '"' +
    (draft[name] ? " checked" : "") + '>' + label + '</label>';
}
function radio(name, value, label) {
  return '<label class="radio"><input type="radio" name="' + name + '" data-field="' + name + '" value="' + value +
    '"' + (draft[name] === value ? " checked" : "") + '>' + label + '</label>';
}
function segments(name, values) {
  return '<div class="segment">' + values.map(([value,label]) =>
    '<button type="button" data-action="segment" data-target="' + name + '" data-value="' + value +
    '" aria-pressed="' + (value === draft[name]) + '">' + label + '</button>').join("") + '</div>';
}
function callout(message) {
  return '<div class="callout">' + icon("79986.svg") + '<span>' + message + '</span></div>';
}
function limitBlock(key, label) {
  const name = key + "Mode";
  return '<h3>' + label + '</h3>' + radio(name,"all","Без ограничений") +
    radio(name,"limited","Ограничить количество применений") + (draft[name] === "limited" ?
    '<div class="indent number">' + input(key + "Limit") + error(key + "Limit") + '</div>' : "");
}
function scopeBlock(key) {
  const config = catalogs[key];
  if (draft[key + "Mode"] === "all") return '<div class="scope"><h3>' + config.title + '</h3>' +
    radio(key + "Mode","all","Все") + radio(key + "Mode","selected","Только выбранные") + '</div>';
  const groups = catalogGroups(key);
  const rows = draft[key].map(({category,item},index) => '<div class="scope-row">' +
    '<select aria-label="' + config.category + '" data-category="' + key + '" data-index="' + index + '">' +
    opts([["","Не выбрано"],...Object.keys(groups)],category) + '</select>' +
    '<select aria-label="' + config.title + '" data-item="' + key + '" data-index="' + index + '"' +
    (category ? "" : " disabled") + '>' +
    opts(category ? [["",config.every],...(groups[category] || [])] : [["","Не выбрано"]],item) + '</select>' +
    '<button type="button" class="plain" data-action="remove-scope" data-value="' + key + '" data-index="' + index +
    '" aria-label="Удалить строку">×</button></div>').join("");
  return '<div class="scope"><h3>' + config.title + '</h3>' + radio(key + "Mode","all","Все") +
    radio(key + "Mode","selected","Только выбранные") +
    '<div class="scope-row scope-labels"><span>' + config.category + '</span><span>' + config.title + '</span></div>' +
    rows + error(key) + '<div class="inline"><button type="button" data-action="add-scope" data-value="' + key +
    '">＋ Добавить ' + config.singular + '</button><button type="button" data-action="catalog" data-value="' + key +
    '">☷ Выбрать из списка</button></div></div>';
}
function renderEditor(preserve = false) {
  const top = scrollY;
  closePopup();
  const original = records.find(record => record.id === editId);
  const editing = !!original;
  const fixedFields = '<fieldset class="promo-fields"' + (original?.used > 0 ? " disabled" : "") + '>';
  const footer = '<div class="footer"><button type="' + (detailTab === "history" ? "button" : "submit") +
    '" class="primary" data-action="' + (detailTab === "history" ? "save-history" : "") + '">' +
    (editing ? "Сохранить" : "Создать промокод") + '</button>' + (editing ?
    '<button type="button" data-action="archive" data-value="' + editId + '">' +
    (draft.archived ? "Восстановить" : "Архивировать") + '</button>' : "") + '</div>';
  content.innerHTML = '<div class="editor"><a class="back" href="#list">' + icon("4aa87.svg") +
    'Назад</a><div class="title-row"><h1>' + (editing ? escapeHtml(records.find(record => record.id === editId).name) : "Новый промокод") +
    '</h1>' + (editing ? '<button type="button" data-action="menu" data-value="' + editId +
    '" aria-label="Действия с промокодом">⋯</button>' : "") + '</div>' +
    (editing ? tabs([["settings","Настройки"],["history","История применений"]],detailTab,"detail-tab") : "") +
    (detailTab === "history" ? '<div id="history-results"></div>' + footer : '<form id="promo-form" novalidate>' +
      fixedFields + '<section><h2>Основные настройки</h2>' +
      field("Название",input("name","Например, Скидка на первое посещение","text","Название") + error("name"),"Видно только внутри сервиса") +
      field("Промокод",'<div class="inline">' + input("code","Например, WELCOME20","text","Промокод") +
        '<button type="button" data-action="generate">Сгенерировать</button></div>' + error("code"),"Его клиенты вводят при записи") +
      '</section><section><h2>Скидка</h2>' + field("Размер скидки",'<div class="inline"><div class="number">' +
        input("amount","0","number","Размер скидки") + '</div>' + segments("unit",[["%","%"],["₽","₽"]]) + '</div>' + error("amount")) +
      (draft.unit === "%" ? check("capOn","Ограничить максимальную сумму скидки") + (draft.capOn ?
        '<div class="indent number">' + input("cap") + error("cap") + '</div>' : "") : "") +
      check("combine","Суммировать с другими скидками и акциями") +
      '</section></fieldset><section><h2>Период действия</h2>' +
      field("Период",dateControl(draft.start,draft.end,"ДД.ММ.ГГГГ – ДД.ММ.ГГГГ","draft") + error("period"),"","period") +
      '</section><section><h2>Лимиты применений</h2>' +
      callout("Промокод считается применённым, если статус записи «Пришёл»") +
      limitBlock("client","Лимит на одного клиента") + '<div style="margin-top:16px">' + limitBlock("total","Общий лимит") + '</div>' +
      '</section>' + fixedFields + '<section><h2>Где действует</h2><p class="description">Настройки и лимит промокода будут общими для выбранных филиалов</p>' +
      check("everyBranch","Все филиалы сети") + '<div class="field-label">Филиалы сети</div>' +
      '<div class="multi control"><button type="button" class="field-button" data-action="branches" aria-label="Филиалы сети" aria-expanded="false"' +
      (draft.everyBranch ? " disabled" : "") + '><span class="tags">' +
      (draft.branches.length && !draft.everyBranch ? draft.branches.map(branch => '<span class="tag">' + branch + '</span>').join("") : '<span class="placeholder">Не выбрано</span>') +
      '</span>' + icon("694d5.svg") + '</button>' + error("branches") + '</div></section>' +
      '<section><h2>Условия применения</h2><div class="rule"><div class="title-row"><strong>Минимальная сумма заказа</strong>' +
      '<input class="switch" type="checkbox" role="switch" aria-label="Минимальная сумма заказа" data-field="minimumOn"' +
      (draft.minimumOn ? " checked" : "") + '></div><p>Промокод можно применить, если стоимость заказа не меньше указанной суммы</p>' +
      (draft.minimumOn ? '<div class="number">' + input("minimum") + error("minimum") + '</div>' : "") + '</div></section>' +
      '<section><h2>Услуги и товары</h2>' +
      segments("scope",[["both","Услуги и товары"],["services","Только услуги"],["goods","Только товары"]]) +
      (draft.scope !== "goods" ? scopeBlock("services") : "") + (draft.scope !== "services" ? scopeBlock("goods") : "") +
      '</section>' + (draft.scope === "goods" ? "" : '<section id="staff-section"><h2>Сотрудники</h2>' +
        callout("Список сотрудников зависит от выбранных филиалов действия промокода") +
        scopeBlock("staff").replace("<h3>Сотрудники</h3>","") + '</section>') + '</fieldset>' + footer + '</form>') + '</div>';
  if (detailTab === "history") renderHistory();
  if (preserve) window.scrollTo(0,top);
}
const examples = [
  ["20.10.26 10:15","Тверская","Онлайн-запись","2344398",320,"Применен"],
  ["15.09.26 22:00","Арбат","Журнал записи","2344399",500,"Оплачено"],
  ["15.09.26 18:20","Тверская","Приложение администратора","Екатерина",1020,"Оплачено"],
  ["13.08.26 15:34","Чистые пруды","YPLACES","2344400",630,"Применен"],
  ["07.08.26 21:20","Тверская","PWA","Александра Ивановна Мамаева",320,"Оплачено"]
];
function renderHistory() {
  const count = records.find(record => record.id === editId).used;
  const length = Math.min(historySize, Math.max(0,count - (historyPage-1)*historySize));
  const rows = Array.from({length},(_,index) => examples[((historyPage-1)*historySize+index)%examples.length])
    .map(([date,branch,channel,client,discount,status]) => '<tr><td>' + date + '</td><td>' + branch +
      '</td><td>' + channel + '</td><td title="' + client + '">' + client + '</td><td>' + amountText(discount) +
      ' ₽</td><td><span class="status ' + (status === "Оплачено" ? "active" : "") + '">' + status + '</span></td></tr>').join("");
  $("#history-results").innerHTML = '<div class="table-wrap"><table><thead><tr>' +
    [["17%","Дата и время"],["14%","Филиал"],["25%","Канал"],["20%","Запись"],["12%","Скидка"],["12%","Статус"]]
      .map(([width,label]) => '<th style="width:' + width + '">' + label + '</th>').join("") + '</tr></thead><tbody>' +
    (rows || '<tr><td class="empty" colspan="6">У промокода пока нет применений</td></tr>') + '</tbody></table></div>' +
    (count ? pager(historyPage,historySize,count,"применений","history") : "");
}
function validatePromoSettings(code, name, original) {
  if (!name) validation.name = "Введите название";
  if (!/^[A-Z0-9]{2,32}$/.test(code)) validation.code = "Введите от 2 до 32 заглавных латинских букв или цифр";
  else if (code !== original?.code && records.some(record => record.code === code)) {
    validation.code = "Промокод с таким кодом уже существует";
  }
  if (!(Number(draft.amount) > 0) || (draft.unit === "%" && Number(draft.amount) > 100)) {
    validation.amount = draft.unit === "%" ? "Введите размер скидки больше 0 и не больше 100%" : "Введите размер скидки больше 0";
  }
  if (draft.unit === "%" && draft.capOn && !(Number(draft.cap) > 0)) validation.cap = "Введите максимальную сумму скидки";
  if (draft.minimumOn && !(Number(draft.minimum) > 0)) validation.minimum = "Введите минимальную сумму заказа";
  if (!draft.everyBranch && !draft.branches.length) validation.branches = "Выберите хотя бы один филиал";
  const applicableCatalogs = {
    both: ["services","goods","staff"],
    services: ["services","staff"],
    goods: ["goods"]
  };
  for (const key of applicableCatalogs[draft.scope]) {
    if (draft[key + "Mode"] === "selected" && !draft[key].some(row => catalogGroups(key)[row.category])) {
      validation[key] = "Выберите хотя бы одну позицию";
    }
  }
}
function save() {
  const original = records.find(item => item.id === editId);
  const used = original?.used > 0;
  const code = draft.code;
  const name = draft.name.trim();
  validation = {};
  if (!used) validatePromoSettings(code, name, original);
  if (!draft.start || !draft.end) validation.period = "Выберите начало и конец периода";
  for (const key of ["client","total"]) {
    const number = Number(draft[key + "Limit"]);
    if (draft[key + "Mode"] === "limited" && (!Number.isInteger(number) || number < 1)) {
      validation[key + "Limit"] = "Введите целое число больше 0";
    }
  }
  if (Object.keys(validation).length) {
    detailTab = "settings";
    renderEditor(true);
    $(".error")?.scrollIntoView({block:"center"});
    $(".invalid")?.focus({preventScroll:true});
    toast("Проверьте заполнение полей");
    return;
  }
  const record = used ? {
    ...original, start:draft.start, end:draft.end,
    clientMode:draft.clientMode, clientLimit:draft.clientLimit,
    totalMode:draft.totalMode, totalLimit:draft.totalLimit
  } : {...draft, id:editId || (crypto.randomUUID?.() ?? Date.now().toString(36)), name, code};
  if (original && ["start","end","totalMode","totalLimit"].some(key => record[key] !== original[key])) delete record.exampleStatus;
  if (!used) {
    if (record.unit === "₽") record.capOn = false;
    for (const key of Object.keys(catalogs)) record[key] = record[key].filter(row => catalogGroups(key)[row.category]);
  }
  if (!persist(editId ? records.map(item => item.id === editId ? record : item) : [record,...records])) return;
  toast(editId ? "Изменения сохранены" : "Промокод создан");
  if (editId) renderEditor(true);
  else {
    listTab = "current";
    Object.assign(filters,{query:"",status:"",branch:"",start:"",end:"",page:1});
    go("promo/" + record.id);
  }
}

function closePopup() {
  if (!popup) return;
  const {button, element} = popup;
  button.setAttribute("aria-expanded","false");
  element.remove();
  popup = null;
}
function showPopup(button, kind, extra = {}) {
  const element = document.createElement("div");
  element.className = "popover " + kind;
  button.setAttribute("aria-expanded","true");
  button.parentElement.append(element);
  popup = {button,element,kind,...extra};
  return element;
}
function openCalendar(button, target) {
  const source = target === "draft" ? draft : filters;
  const initial = source.start ? new Date(source.start + "T12:00:00") : new Date();
  showPopup(button,"calendar",{source,target,month:initial.getMonth(),year:initial.getFullYear(),pending:""});
  paintCalendar();
}
const months = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
function paintCalendar() {
  const {element,month,year,source,pending} = popup;
  const first = new Date(year,month,1);
  const offset = (first.getDay()+6)%7;
  const start = pending || source.start;
  const end = pending ? "" : source.end;
  element.innerHTML = '<div class="calendar-head"><select aria-label="Месяц" data-calendar="month">' +
    opts(months.map((name,index) => [String(index),name]),String(month)) +
    '</select><select aria-label="Год" data-calendar="year">' +
    opts(Array.from({length:31},(_,i) => String(year-15+i)),String(year)) +
    '</select><button class="plain" type="button" data-action="month" data-value="-1" aria-label="Предыдущий месяц">‹</button>' +
    '<button class="plain" type="button" data-action="month" data-value="1" aria-label="Следующий месяц">›</button></div>' +
    '<div class="calendar-grid">' + ["пн","вт","ср","чт","пт","сб","вс"].map(day => '<span>' + day + '</span>').join("") +
    Array.from({length:42},(_,index) => {
      const day = new Date(year,month,index-offset+1);
      const value = localDate(day);
      const style = value === start || value === end ? "chosen" : value > start && value < end ? "in-range" :
        day.getMonth() !== month ? "placeholder" : "";
      return '<button type="button" class="' + style + '" data-action="day" data-value="' + value +
        '" aria-label="' + formatDate(value) + '">' + day.getDate() + '</button>';
    }).join("") + '</div><div class="calendar-foot"><span>' + (pending ? "Выберите дату окончания" : "Выберите диапазон") +
    '</span><button type="button" class="plain" data-action="clear-date">Сбросить</button></div>';
}
function setRange(start,end) {
  const {source,target} = popup;
  Object.assign(source,{start,end});
  closePopup();
  if (target === "draft") {
    delete validation.period;
    renderEditor(true);
    $('[data-value="draft"]').focus({preventScroll:true});
  } else {
    filters.page = 1;
    renderList();
    $('[data-value="filter"]').focus({preventScroll:true});
  }
}
function paintBranches() {
  const button = popup.button;
  button.querySelector(".tags").innerHTML = draft.branches.length ? draft.branches.map(branch =>
    '<span class="tag">' + branch + '</span>').join("") : '<span class="placeholder">Не выбрано</span>';
  popup.element.innerHTML = branches.map(branch =>
    '<label class="check"><input type="checkbox" data-branch="' + branch + '"' +
    (draft.branches.includes(branch) ? " checked" : "") + '>' + branch + '</label>').join("") +
    '<button type="button" class="primary" data-action="apply-branches">Готово</button>';
}
function showRowMenu(button,id) {
  const record = records.find(item => item.id === id);
  if (!record) return;
  const menu = showPopup(button,"menu");
  const rectangle = button.getBoundingClientRect();
  menu.style.left = Math.max(0,rectangle.right-180) + "px";
  menu.style.top = Math.min(rectangle.bottom + 4,innerHeight-90) + "px";
  menu.innerHTML = '<button type="button" class="plain" data-action="open" data-value="' + id +
    '">Редактировать</button><button type="button" class="plain" data-action="archive" data-value="' +
    id + '">' + (record.archived ? "Восстановить" : "Архивировать") + '</button>';
}
function showDialog(title,description,inner,footer) {
  modal.setAttribute("aria-labelledby","modal-title");
  modal.innerHTML = '<div class="modal-head"><h2 id="modal-title">' + title +
    '</h2><button type="button" class="plain" data-action="close-dialog" aria-label="Закрыть">×</button></div>' +
    '<div class="modal-body">' + (description ? '<p>' + description + '</p>' : '') + inner +
    '</div><div class="modal-actions">' + footer + '</div>';
  modal.showModal();
}
function confirmArchive(id) {
  const record = records.find(item => item.id === id);
  const action = record.archived ? "Восстановить" : "Архивировать";
  showDialog(action + " промокод?",escapeHtml(record.name),"",
    '<button data-action="close-dialog">Отмена</button><button class="primary" data-action="confirm-archive" data-value="' +
    id + '">' + action + '</button>');
}
let catalog;
function openCatalog(key) {
  const config = catalogs[key];
  catalog = {key, chosen:new Set(draft[key].filter(row => row.category).map(row => JSON.stringify([row.category,row.item])))};
  showDialog("Добавление " + config.noun,"Выберите " + config.title.toLowerCase() + ", на которые будет действовать скидка",
    '<div class="search">' + icon("e80ac.svg") +
    '<input id="catalog-search" type="search" aria-label="Поиск по списку" placeholder="Поиск по ' +
    ({services:"услугам",goods:"товарам",staff:"сотрудникам"}[key]) + ' и категориям"></div><div id="catalog-results"></div>',
    '<span class="catalog-count hint" id="catalog-count"></span><button data-action="close-dialog">Отменить</button>' +
    '<button class="primary" data-action="apply-catalog">Добавить</button>');
  paintCatalog();
  $("#catalog-search").focus();
}
function paintCatalog() {
  const {key,chosen} = catalog;
  const config = catalogs[key];
  const query = $("#catalog-search").value.trim().toLowerCase();
  const openGroups = new Set([...modal.querySelectorAll("details[open]")].map(node => node.dataset.group));
  const first = !$("#catalog-results").children.length || !!query;
  const result = Object.entries(catalogGroups(key)).map(([category,items]) => {
    const all = JSON.stringify([category,""]);
    const visible = category.toLowerCase().includes(query) ? ["",...items] : items.filter(item => item.toLowerCase().includes(query));
    if (!visible.length) return "";
    return '<details data-group="' + escapeHtml(category) + '"' + (first || openGroups.has(category) ? " open" : "") +
      '><summary>' + category + '<small>Содержит ' + config.noun + ': ' + items.length + '</small></summary>' +
      visible.map(item => {
        const value = JSON.stringify([category,item]);
        const checked = chosen.has(value) || chosen.has(all);
        return '<label class="check"><input type="checkbox" data-choice="' + escapeHtml(value) + '"' +
          (checked ? " checked" : "") + '>' + (item || config.every) + '</label>';
      }).join("") + '</details>';
  }).join("");
  $("#catalog-results").innerHTML = result || '<p class="hint">Ничего не найдено</p>';
  $("#catalog-count").textContent = "Выбрано " + config.noun + ": " + [...chosen].reduce((count,value) => {
    const [category,item] = JSON.parse(value);
    return count + (item ? 1 : catalogGroups(key)[category]?.length || 0);
  },0);
  $('[data-action="apply-catalog"]',modal).disabled = !chosen.size;
}
function refreshStaffFields() {
  const scope = $("#staff-section .scope");
  if (scope) scope.outerHTML = scopeBlock("staff").replace("<h3>Сотрудники</h3>","");
}
function syncStaff() {
  const groups = catalogGroups("staff");
  draft.staff = draft.staff.filter(row => !row.category || (groups[row.category] && (!row.item || groups[row.category].includes(row.item))));
  if (draft.staffMode === "selected" && !draft.staff.length) draft.staff.push({category:"",item:""});
}
function normalizeCode(value) {
  return value.replace(/[^A-Za-z0-9]/g,"").toUpperCase().slice(0,32);
}
function updateCodeInput(element) {
  const value = normalizeCode(element.value);
  if (value !== element.value) {
    const start = normalizeCode(element.value.slice(0,element.selectionStart)).length;
    element.value = value;
    element.setSelectionRange(start,start);
  }
  draft.code = value;
}
document.addEventListener("compositionend",event => {
  if (event.target.dataset.field === "code") updateCodeInput(event.target);
});
document.addEventListener("input",event => {
  const element = event.target;
  if (element.id === "search") {
    filters.query = element.value;
    filters.page = 1;
    renderListResults();
  } else if (element.id === "catalog-search") {
    paintCatalog();
  } else if (element.dataset.field === "code") {
    if (!event.isComposing) updateCodeInput(element);
  } else if (element.dataset.field && !["checkbox","radio"].includes(element.type)) {
    draft[element.dataset.field] = element.value;
  }
});
document.addEventListener("change",event => {
  const element = event.target;
  const {field,branch,category,item,index,size,choice} = element.dataset;
  if (element.id === "filter-status" || element.id === "filter-branch") {
    filters[element.id.slice(7)] = element.value;
    filters.page = 1;
    renderListResults();
  } else if (size === "list") {
    filters.size = Number(element.value);
    filters.page = 1;
    renderListResults();
  } else if (size === "history") {
    historySize = Number(element.value);
    historyPage = 1;
    renderHistory();
  } else if (element.dataset.calendar && popup) {
    popup[element.dataset.calendar] = Number(element.value);
    paintCalendar();
  } else if (field && ["checkbox","radio"].includes(element.type)) {
    draft[field] = element.type === "checkbox" ? element.checked : element.value;
    if (field === "everyBranch") syncStaff();
    const scope = field.replace(/Mode$/,"");
    if (catalogs[scope] && element.value === "selected" && !draft[scope].length) draft[scope].push({category:"",item:""});
    renderEditor(true);
    const equivalent = [...content.querySelectorAll("[data-field]")].find(input =>
      input.dataset.field === field && (input.type !== "radio" || input.value === element.value));
    equivalent?.focus({preventScroll:true});
  } else if (branch && popup) {
    draft.branches = element.checked ? [...draft.branches,branch] : draft.branches.filter(value => value !== branch);
    delete validation.branches;
    syncStaff();
    refreshStaffFields();
    paintBranches();
    [...popup.element.querySelectorAll("[data-branch]")].find(input => input.dataset.branch === branch)?.focus();
  } else if (category) {
    draft[category][index] = {category:element.value,item:""};
    delete validation[category];
    renderEditor(true);
  } else if (item) {
    draft[item][index].item = element.value;
  } else if (choice) {
    const [group,value] = JSON.parse(choice);
    const all = JSON.stringify([group,""]);
    if (!value || catalog.chosen.has(all)) {
      const hadAll = catalog.chosen.has(all);
      for (const selected of catalog.chosen) if (JSON.parse(selected)[0] === group) catalog.chosen.delete(selected);
      if (!value && element.checked) catalog.chosen.add(all);
      if (value && hadAll) {
        for (const other of catalogGroups(catalog.key)[group]) if (other !== value) catalog.chosen.add(JSON.stringify([group,other]));
      }
    } else if (element.checked) catalog.chosen.add(choice);
    else catalog.chosen.delete(choice);
    paintCatalog();
    [...modal.querySelectorAll("[data-choice]")].find(input => input.dataset.choice === choice)?.focus({preventScroll:true});
  }
});
document.addEventListener("submit",event => {
  if (event.target.id !== "promo-form") return;
  event.preventDefault();
  save();
});
document.addEventListener("keydown",event => {
  if (event.key === "Escape" && popup) {
    const {button,target} = popup;
    closePopup();
    if (target === "branches") renderEditor(true);
    else button.focus();
  }
});
document.addEventListener("click",event => {
  const button = event.target.closest("[data-action]");
  const same = popup?.button === button;
  if (popup && !popup.element.contains(event.target) && !popup.button.contains(event.target)) {
    closePopup();
  }
  if (!button) {
    const row = event.target.closest("tr[data-id]");
    if (row && !event.target.closest("a")) go("promo/" + row.dataset.id);
    return;
  }
  const {action,value,target,index} = button.dataset;
  switch (action) {
    case "new": go("new"); break;
    case "open": go("promo/" + value); break;
    case "list-tab": listTab = value; filters.page = 1; renderList(); break;
    case "detail-tab": detailTab = value; renderEditor(true); break;
    case "page":
      if (target === "history") {historyPage = Number(value); renderHistory();}
      else {filters.page = Number(value); renderListResults();}
      break;
    case "calendar":
      closePopup();
      if (!same) openCalendar(button,value);
      break;
    case "month": {
      const date = new Date(popup.year,popup.month + Number(value),1);
      popup.year = date.getFullYear();
      popup.month = date.getMonth();
      paintCalendar();
      break;
    }
    case "day":
      if (popup.pending) setRange(...[popup.pending,value].sort());
      else {popup.pending = value; paintCalendar();}
      break;
    case "clear-date": setRange("",""); break;
    case "branches":
      if (same) {closePopup(); renderEditor(true);}
      else {showPopup(button,"branch-picker",{target:"branches"}); paintBranches();}
      break;
    case "apply-branches": closePopup(); renderEditor(true); $('[data-action="branches"]').focus({preventScroll:true}); break;
    case "menu":
      closePopup();
      if (!same) showRowMenu(button,value);
      break;
    case "archive": closePopup(); confirmArchive(value); break;
    case "confirm-archive": {
      const record = records.find(item => item.id === value);
      if (!persist(records.map(item => item.id === value ? {...record,archived:!record.archived} : item))) break;
      modal.close();
      listTab = record.archived ? "current" : "archive";
      Object.assign(filters,{query:"",status:"",branch:"",start:"",end:"",page:1});
      go("list");
      toast(record.archived ? "Промокод восстановлен" : "Промокод архивирован");
      break;
    }
    case "generate": {
      let code;
      do {
        code = Array.from(crypto.getRandomValues(new Uint8Array(8)), number => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[number%32]).join("");
      } while (records.some(record => record.code === code));
      draft.code = code;
      delete validation.code;
      renderEditor(true);
      $('[data-field="code"]').focus({preventScroll:true});
      break;
    }
    case "segment": draft[target] = value; renderEditor(true); break;
    case "add-scope": draft[value].push({category:"",item:""}); renderEditor(true); break;
    case "remove-scope":
      draft[value].splice(Number(index),1);
      if (!draft[value].length) draft[value].push({category:"",item:""});
      renderEditor(true);
      break;
    case "catalog": openCatalog(value); break;
    case "close-dialog": modal.close(); break;
    case "apply-catalog": {
      const {key,chosen} = catalog;
      draft[key] = [...chosen].map(value => {
        const [category,item] = JSON.parse(value);
        return {category,item};
      });
      delete validation[key];
      modal.close();
      renderEditor(true);
      break;
    }
    case "save-history": save(); break;
  }
});
renderRoute();
