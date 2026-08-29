const state = {
  activeTab: 'now',
  selectedMode: 'reflect',
  records: JSON.parse(localStorage.getItem('echo_records') || '[]'),
  theme: localStorage.getItem('echo_theme') || 'mist',
  hand: localStorage.getItem('echo_hand') || 'right',
  reminders: localStorage.getItem('echo_reminders') === 'true',
  history: localStorage.getItem('echo_history') === 'true',
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function persist() {
  localStorage.setItem('echo_records', JSON.stringify(state.records));
  localStorage.setItem('echo_theme', state.theme);
  localStorage.setItem('echo_hand', state.hand);
  localStorage.setItem('echo_reminders', String(state.reminders));
  localStorage.setItem('echo_history', String(state.history));
}

function setTab(tab) {
  state.activeTab = tab;
  $$('.tab').forEach((button) => button.classList.toggle('is-active', button.dataset.tab === tab));
  $('#nowView').classList.toggle('is-hidden', tab !== 'now');
  $('#storyView').classList.toggle('is-hidden', tab !== 'story');
  if (tab === 'story') renderStories();
}

function setTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
  $$('.theme-swatch').forEach((button) => button.classList.toggle('is-active', button.dataset.themeChoice === theme));
  persist();
}

function setHand(hand) {
  state.hand = hand;
  document.body.dataset.hand = hand;
  $$('[data-hand-choice]').forEach((button) => button.classList.toggle('is-active', button.dataset.handChoice === hand));
  persist();
}

function openSettings() {
  $('#settingsModal').classList.remove('is-hidden');
  $('#reminderToggle').checked = state.reminders;
  $('#historyToggle').checked = state.history;
}
function closeSettings() { $('#settingsModal').classList.add('is-hidden'); }

function responseFor(text, mode) {
  const trimmed = text.trim();
  if (!trimmed) return '你还没有准备好说很多，也没关系。可以先留下一个词，或者只是停在这里。';
  if (mode === 'break_down') return `我听见你被“${trimmed.slice(0, 28)}${trimmed.length > 28 ? '…' : ''}”卡住了。今天只做一个 3 分钟动作：把相关页面打开，不要求完成。做完或没做，都算你给自己的回声。`;
  if (mode === 'recall') return state.history && state.records.length ? `这件事曾在 ${new Date(state.records[0].createdAt).toLocaleDateString('zh-CN')} 回到你面前。那时的你留下了自己的声音；现在的你不必复制当时的答案，只要听听它。` : '你还没有允许我调用过去的回声。可以在设置里打开，也可以只陪你停在此刻。';
  return `我听见了：${trimmed.slice(0, 52)}${trimmed.length > 52 ? '…' : ''}。你不需要现在解决它。可以先把这句话留在这里，等未来的你有力气时再回来。`;
}

function respond() {
  const input = $('#thoughtInput');
  const text = input.value.trim();
  $('#responseText').textContent = responseFor(text, state.selectedMode);
  $('#responseCard').classList.remove('is-hidden');
  $('#saveButton').dataset.text = text;
}

function saveRecord() {
  const text = $('#saveButton').dataset.text || $('#thoughtInput').value.trim();
  if (!text) return;
  state.records.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), text, mode: state.selectedMode, createdAt: new Date().toISOString(), tag: '此刻' });
  persist();
  $('#thoughtInput').value = '';
  $('#responseCard').classList.add('is-hidden');
  $('#composerHint').textContent = '已留下。你可以继续说，也可以先离开。';
}

function renderStories() {
  const list = $('#storyList');
  $('#emptyState').classList.toggle('is-hidden', state.records.length > 0);
  list.innerHTML = state.records.map((record) => `
    <article class="story-item">
      <div class="story-meta"><span>${new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span><span>${record.mode === 'break_down' ? '拆一步' : record.mode === 'recall' ? '回看过去' : '只听我说'}</span></div>
      <h3>${escapeHtml(record.text.slice(0, 32))}${record.text.length > 32 ? '…' : ''}</h3>
      <p>这是你在那一刻留下的一声回声。它不需要被评判。</p>
      <span class="story-tag">${record.tag}</span>
    </article>`).join('');
}

function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }

$$('.tab').forEach((button) => button.addEventListener('click', () => setTab(button.dataset.tab)));
$$('.mode-chip').forEach((button) => button.addEventListener('click', () => { state.selectedMode = button.dataset.mode; $$('.mode-chip').forEach((b) => b.classList.toggle('is-selected', b === button)); }));
$$('.tool-button').forEach((button) => button.addEventListener('click', () => { if (button.id === 'tagButton') { $('#composerHint').textContent = '标签功能已预留：它会帮助你在故事里找到相似的回声。'; return; } button.classList.toggle('is-selected'); $('#composerHint').textContent = `${button.getAttribute('aria-label')}已选择；v1 先保留交互位置。`; }));
$('#respondButton').addEventListener('click', respond);
$('#saveButton').addEventListener('click', saveRecord);
$('#quietResponseButton').addEventListener('click', () => { $('#responseCard').classList.add('is-hidden'); $('#composerHint').textContent = '已安静下来。今天不需要继续。'; });
$('#quietButton').addEventListener('click', () => { $('#composerHint').textContent = '今天先不提醒。你随时可以回来。'; });
$('#backToNow').addEventListener('click', () => setTab('now'));
$('#settingsButton').addEventListener('click', openSettings);
$('#closeSettings').addEventListener('click', closeSettings);
$('#doneSettings').addEventListener('click', closeSettings);
$('#settingsModal').addEventListener('click', (event) => { if (event.target.id === 'settingsModal') closeSettings(); });
$$('[data-theme-choice]').forEach((button) => button.addEventListener('click', () => setTheme(button.dataset.themeChoice)));
$$('[data-hand-choice]').forEach((button) => button.addEventListener('click', () => setHand(button.dataset.handChoice)));
$('#reminderToggle').addEventListener('change', (event) => { state.reminders = event.target.checked; persist(); });
$('#historyToggle').addEventListener('change', (event) => { state.history = event.target.checked; persist(); });
$('#dateFilter').addEventListener('click', () => { $('#dateFilter').textContent = $('#dateFilter').textContent.includes('30') ? '全部时间⌄' : '最近 30 天⌄'; });
$('#tagFilter').addEventListener('click', () => { $('#tagFilter').textContent = $('#tagFilter').textContent.includes('所有') ? '此刻⌄' : '所有标签⌄'; });
$('#reportButton').addEventListener('click', () => { alert('月度回望将在有更多回声后生成。v1 先保留入口。'); });

document.body.dataset.theme = state.theme;
document.body.dataset.hand = state.hand;
$('#reminderToggle').checked = state.reminders;
$('#historyToggle').checked = state.history;
$$('[data-theme-choice]').forEach((button) => button.classList.toggle('is-active', button.dataset.themeChoice === state.theme));
$$('[data-hand-choice]').forEach((button) => button.classList.toggle('is-active', button.dataset.handChoice === state.hand));
