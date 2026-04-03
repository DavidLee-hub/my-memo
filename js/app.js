/* =============================================
   My Memo - 메인 앱 스크립트
   ============================================= */

// =============================================
// 상수 & 상태
// =============================================

const STORAGE_KEY = 'myMemo_notes';
const FONT_SIZE_KEY = 'myMemo_fontSize';
const DARK_MODE_KEY = 'myMemo_darkMode';

// 앱 상태
const state = {
  notes: [],           // 전체 메모 배열
  currentId: null,     // 수정 중인 메모 ID
  isStarred: false,    // 새 메모 중요 여부
  filterStarred: false,// 중요 메모 필터 활성 여부
  searchQuery: '',     // 검색어
  attachedImages: [],  // 첨부 이미지 (Base64 배열)
  detailId: null,      // 상세보기 중인 메모 ID
};

// =============================================
// DOM 요소
// =============================================

const memoInput     = document.getElementById('memoInput');
const btnSave       = document.getElementById('btnSave');
const btnStar       = document.getElementById('btnStar');
const btnAttach     = document.getElementById('btnAttach');
const btnRecord     = document.getElementById('btnRecord');
const btnFab        = document.getElementById('btnFab');
const inputImage    = document.getElementById('inputImage');
const imagePreview  = document.getElementById('imagePreview');
const searchInput   = document.getElementById('searchInput');
const btnFilter     = document.getElementById('btnFilter');
const memoList      = document.getElementById('memoList');
const btnMore       = document.getElementById('btnMore');
const moreMenu      = document.getElementById('moreMenu');
const btnExport     = document.getElementById('btnExport');
const inputImport   = document.getElementById('inputImport');
const btnDarkMode   = document.getElementById('btnDarkMode');
const btnInstall    = document.getElementById('btnInstall');
const toast         = document.getElementById('toast');

// 상세보기
const detailPanel   = document.getElementById('detailPanel');
const detailContent = document.getElementById('detailContent');
const detailImages  = document.getElementById('detailImages');
const btnBack       = document.getElementById('btnBack');
const btnShare      = document.getElementById('btnShare');
const btnCopy       = document.getElementById('btnCopy');
const btnEdit       = document.getElementById('btnEdit');
const btnDelete     = document.getElementById('btnDelete');

// =============================================
// 유틸 함수
// =============================================

/** 고유 ID 생성 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** 날짜 포맷 (YYYY.MM.DD HH:MM) */
function formatDate(isoString) {
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 토스트 메시지 표시 */
let toastTimer = null;
function showToast(message, duration = 2000) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/** 햅틱 피드백 */
function vibrate(pattern) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

// =============================================
// LocalStorage
// =============================================

/** 메모 저장 */
function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
}

/** 메모 불러오기 */
function loadNotes() {
  const raw = localStorage.getItem(STORAGE_KEY);
  state.notes = raw ? JSON.parse(raw) : [];
}

// =============================================
// 메모 CRUD
// =============================================

/** 메모 추가 */
function createNote(text, starred, images) {
  const note = {
    id: generateId(),
    text: text.trim(),
    starred,
    images: images || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.notes.unshift(note);
  saveNotes();
  return note;
}

/** 메모 수정 */
function updateNote(id, text, starred, images) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  note.text = text.trim();
  note.starred = starred;
  note.images = images || note.images;
  note.updatedAt = new Date().toISOString();
  saveNotes();
}

/** 메모 삭제 */
function deleteNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  saveNotes();
}

// =============================================
// 필터링
// =============================================

/** 검색 + 중요 필터 적용된 메모 목록 반환 */
function getFilteredNotes() {
  return state.notes.filter(note => {
    const matchSearch = note.text.toLowerCase().includes(state.searchQuery.toLowerCase());
    const matchStar   = state.filterStarred ? note.starred : true;
    return matchSearch && matchStar;
  });
}

// =============================================
// 렌더링
// =============================================

/** 메모 목록 렌더링 */
function renderNotes() {
  const filtered = getFilteredNotes();
  memoList.innerHTML = '';

  if (filtered.length === 0) {
    memoList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📝</div>
        <div class="empty-state__text">${state.searchQuery || state.filterStarred ? '검색 결과가 없습니다.' : '메모를 작성해 보세요!'}</div>
      </div>`;
    return;
  }

  filtered.forEach(note => {
    const card = document.createElement('div');
    card.className = `memo-card${note.starred ? ' starred' : ''}`;
    card.dataset.id = note.id;

    // 첫 줄을 제목으로 추출
    const lines = note.text.split('\n');
    const title = escapeHtml(lines[0]) || '(제목 없음)';

    card.innerHTML = `
      <div class="memo-card__header">
        <span class="memo-card__title">${title}</span>
        <button class="memo-card__star-btn${note.starred ? ' active' : ''}" data-id="${note.id}" aria-label="중요 토글">
          ${note.starred ? '★' : '☆'}
        </button>
      </div>
      <div class="memo-card__meta">${formatDate(note.updatedAt)}</div>`;

    // 카드 클릭 → 상세보기
    card.addEventListener('click', e => {
      if (e.target.closest('.memo-card__star-btn')) return;
      openDetail(note.id);
    });

    // ☆ 버튼 클릭 → 중요 토글
    card.querySelector('.memo-card__star-btn').addEventListener('click', e => {
      e.stopPropagation();
      const note = state.notes.find(n => n.id === e.currentTarget.dataset.id);
      if (!note) return;
      note.starred = !note.starred;
      saveNotes();
      renderNotes();
    });

    memoList.appendChild(card);
  });
}

/** HTML 이스케이프 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================
// 에디터
// =============================================

/** 에디터 초기화 */
function resetEditor() {
  memoInput.value = '';
  state.currentId = null;
  state.isStarred = false;
  state.attachedImages = [];
  btnStar.classList.remove('active');
  imagePreview.hidden = true;
  imagePreview.innerHTML = '';
}

/** 이미지 미리보기 렌더링 */
function renderImagePreview() {
  imagePreview.innerHTML = '';
  if (state.attachedImages.length === 0) {
    imagePreview.hidden = true;
    return;
  }
  imagePreview.hidden = false;
  state.attachedImages.forEach((src, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `
      <img src="${src}" alt="첨부 이미지 ${idx + 1}">
      <button class="preview-item__remove" data-idx="${idx}" aria-label="이미지 삭제">×</button>`;
    item.querySelector('.preview-item__remove').addEventListener('click', e => {
      e.stopPropagation();
      state.attachedImages.splice(idx, 1);
      renderImagePreview();
    });
    imagePreview.appendChild(item);
  });
}

// =============================================
// 상세보기
// =============================================

/** 상세보기 열기 */
function openDetail(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  state.detailId = id;

  detailContent.textContent = note.text;

  // 첨부 이미지
  detailImages.innerHTML = '';
  if (note.images && note.images.length > 0) {
    note.images.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '첨부 이미지';
      detailImages.appendChild(img);
    });
  }

  detailPanel.hidden = false;
  document.body.style.overflow = 'hidden';
}

/** 상세보기 닫기 */
function closeDetail() {
  detailPanel.hidden = true;
  state.detailId = null;
  document.body.style.overflow = '';
}

// =============================================
// Wake Lock
// =============================================

let wakeLock = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) { /* 지원 안 될 경우 무시 */ }
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    await wakeLock.release();
    wakeLock = null;
  }
}

// 앱 포그라운드 복귀 시 Wake Lock 재요청
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && document.activeElement === memoInput) {
    requestWakeLock();
  }
});

// =============================================
// 설정 (다크모드 / 글자크기)
// =============================================

/** 다크모드 적용 */
function applyDarkMode(enabled) {
  document.body.classList.toggle('dark-mode', enabled);
  btnDarkMode.textContent = enabled ? '다크모드 끄기' : '다크모드 켜기';
  localStorage.setItem(DARK_MODE_KEY, enabled);
}

/** 글자 크기 적용 */
function applyFontSize(size) {
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.add(`font-${size}`);
  localStorage.setItem(FONT_SIZE_KEY, size);

  // 버튼 active 상태
  document.querySelectorAll('.btn-font-size').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === size);
  });
}

/** 저장된 설정 불러오기 */
function loadSettings() {
  const dark = localStorage.getItem(DARK_MODE_KEY) === 'true';
  applyDarkMode(dark);

  const fontSize = localStorage.getItem(FONT_SIZE_KEY) || 'medium';
  applyFontSize(fontSize);
}

// =============================================
// 백업 / 복원
// =============================================

/** 메모 내보내기 (JSON 다운로드) */
function exportNotes() {
  const data = JSON.stringify(state.notes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `my-memo-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('메모를 내보냈습니다.');
}

/** 메모 가져오기 (JSON 파일 읽기) */
function importNotes(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('형식 오류');

      // ID 중복 제거 후 병합
      const existingIds = new Set(state.notes.map(n => n.id));
      const newNotes = imported.filter(n => n.id && n.text !== undefined && !existingIds.has(n.id));
      state.notes = [...newNotes, ...state.notes];
      saveNotes();
      renderNotes();
      showToast(`${newNotes.length}개의 메모를 가져왔습니다.`);
    } catch {
      showToast('올바른 백업 파일이 아닙니다.', 3000);
    }
  };
  reader.readAsText(file);
}

// =============================================
// 이벤트 바인딩
// =============================================

/** 저장 버튼 */
btnSave.addEventListener('click', () => {
  const text = memoInput.value.trim();
  if (!text) { showToast('내용을 입력해 주세요.'); return; }

  if (state.currentId) {
    // 수정
    updateNote(state.currentId, text, state.isStarred, state.attachedImages);
    showToast('메모를 수정했습니다.');
  } else {
    // 새 메모
    createNote(text, state.isStarred, [...state.attachedImages]);
    showToast('메모를 저장했습니다.');
    vibrate(100);
  }

  releaseWakeLock();
  resetEditor();
  renderNotes();
});

/** 녹음 버튼 — 미지원 안내 */
btnRecord.addEventListener('click', () => {
  showToast('녹음 기능은 준비 중입니다.', 2000);
});

/** FAB 버튼 — 에디터로 포커스 */
btnFab.addEventListener('click', () => {
  memoInput.focus();
  memoInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

/** 중요(별) 토글 */
btnStar.addEventListener('click', () => {
  state.isStarred = !state.isStarred;
  btnStar.classList.toggle('active', state.isStarred);
});

/** 이미지 첨부 버튼 */
btnAttach.addEventListener('click', () => inputImage.click());

inputImage.addEventListener('change', e => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      state.attachedImages.push(ev.target.result);
      renderImagePreview();
    };
    reader.readAsDataURL(file);
  });
  inputImage.value = '';
});

/** 검색 */
searchInput.addEventListener('input', e => {
  state.searchQuery = e.target.value;
  renderNotes();
});

/** 검색창 엔터 — 페이지 새로고침 방지 */
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchInput.blur();
  }
});

/** 중요 메모 필터 */
btnFilter.addEventListener('click', () => {
  state.filterStarred = !state.filterStarred;
  btnFilter.classList.toggle('active', state.filterStarred);
  renderNotes();
});

/** 더보기 메뉴 열기/닫기 */
btnMore.addEventListener('click', e => {
  e.stopPropagation();
  moreMenu.hidden = !moreMenu.hidden;
});

document.addEventListener('click', e => {
  if (!moreMenu.hidden && !moreMenu.contains(e.target) && e.target !== btnMore) {
    moreMenu.hidden = true;
  }
});

/** 내보내기 */
btnExport.addEventListener('click', () => {
  moreMenu.hidden = true;
  exportNotes();
});

/** 가져오기 */
const labelImport = document.querySelector('label[for="inputImport"]');
if (labelImport) {
  labelImport.addEventListener('click', () => {
    moreMenu.hidden = true;
  });
}

inputImport.addEventListener('change', e => {
  if (e.target.files[0]) importNotes(e.target.files[0]);
  inputImport.value = '';
});

/** 다크모드 */
btnDarkMode.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  applyDarkMode(!isDark);
});

/** 글자 크기 */
document.querySelectorAll('.btn-font-size').forEach(btn => {
  btn.addEventListener('click', () => applyFontSize(btn.dataset.size));
});

/** Wake Lock — 입력창 포커스/블러 */
memoInput.addEventListener('focus', requestWakeLock);
memoInput.addEventListener('blur', releaseWakeLock);

// =============================================
// 상세보기 이벤트
// =============================================

/** 뒤로가기 */
btnBack.addEventListener('click', closeDetail);

/** 공유 */
btnShare.addEventListener('click', async () => {
  const note = state.notes.find(n => n.id === state.detailId);
  if (!note) return;
  if (navigator.share) {
    try {
      await navigator.share({ text: note.text });
    } catch { /* 취소 시 무시 */ }
  } else {
    showToast('공유 기능이 지원되지 않는 브라우저입니다.');
  }
});

/** 복사 */
btnCopy.addEventListener('click', async () => {
  const note = state.notes.find(n => n.id === state.detailId);
  if (!note) return;
  try {
    await navigator.clipboard.writeText(note.text);
    showToast('클립보드에 복사했습니다.');
  } catch {
    showToast('복사에 실패했습니다.');
  }
});

/** 수정 */
btnEdit.addEventListener('click', () => {
  const note = state.notes.find(n => n.id === state.detailId);
  if (!note) return;
  memoInput.value = note.text;
  state.currentId   = note.id;
  state.isStarred   = note.starred;
  state.attachedImages = [...(note.images || [])];
  btnStar.classList.toggle('active', note.starred);
  renderImagePreview();
  closeDetail();
  memoInput.focus();
});

/** 삭제 */
btnDelete.addEventListener('click', () => {
  if (!confirm('메모를 삭제할까요?')) return;
  deleteNote(state.detailId);
  vibrate([100, 50, 100]);
  closeDetail();
  renderNotes();
  showToast('메모를 삭제했습니다.');
});

// =============================================
// PWA 설치 배너
// =============================================

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.hidden = false;
});

btnInstall.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') btnInstall.hidden = true;
  deferredPrompt = null;
});

window.addEventListener('appinstalled', () => {
  btnInstall.hidden = true;
  deferredPrompt = null;
});

// =============================================
// 초기화
// =============================================

function init() {
  loadSettings();
  loadNotes();
  renderNotes();
}

init();
