const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
let isSelectingInReader = false;
const modes = window.INK_MODES || {};

let currentProject = null;
let currentTab = 'content';
let selectedText = '';
let selectedMode = Object.keys(modes)[0] || 'concept';

let readerTitle = '';
let readerOriginalBody = '';
let readerDisplayedBody = '';
let readerEditing = false;
let readerContentType = 'text';
let readerImages = [];
let readerSourceUrl = '';

const TYPE_META = {
    text: { label: '📝 Text', color: '#64748b' },
    web:  { label: '🌐 Web',  color: '#38bdf8' },
    pdf:  { label: '📕 PDF',  color: '#fb7185' },
    docx: { label: '📘 DOCX', color: '#4ade80' }
};

const OCEAN_DEFAULT_COLOR = '#1f8cff';
const OCEAN_DEFAULT_COLOR_2 = '#35d8ff';

function setContentOceanTheme(color, color2) {

    const bg = $('#contentOceanBg');

    if (!bg) return;

    bg.style.setProperty(
        '--ink-theme-color',
        color || OCEAN_DEFAULT_COLOR
    );

    bg.style.setProperty(
        '--ink-theme-color-2',
        color2 || color || OCEAN_DEFAULT_COLOR_2
    );

}

const TRANSLATE_LANGUAGES = [
    { code: 'original', label: 'Original' },
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
    { code: 'ar', label: 'Arabic' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'ru', label: 'Russian' },
    { code: 'ja', label: 'Japanese' }
];

/* ==========================================================
   BASIC HELPERS
   ========================================================== */

function toast(msg) {
    const t = $('#toast');
    if (!t) return;

    t.textContent = msg;
    t.classList.add('show');

    setTimeout(() => {
        t.classList.remove('show');
    }, 2200);
}

async function api(url, opts = {}) {

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

    const r = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {})
        },
        ...opts
    });

    let d = {};

    try {
        d = await r.json();
    } catch (e) {}

    if (!r.ok) {
        throw new Error(d.error || 'Request failed');
    }

    return d;
}


function esc(s) {

    return String(s ?? '').replace(
        /[&<>"']/g,
        c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c])
    );
}
async function loadAll() {

    await loadProjects();

    buildPalette();

    await loadContent();

}

/* ==========================================================
   LAUNCH WORKSPACE
   ========================================================== */

function launch() {

    const trans = $('#ink-transition');
    const app = $('#app');

    if (!app) {
        console.error('Workspace element #app was not found.');
        return;
    }

    if (trans) {
        trans.classList.add('active');
    }

    setTimeout(async () => {

        app.classList.remove('hidden');

        document.body.style.overflow = 'hidden';

        window.scrollTo(0, 0);

        try {
            await loadAll();
        } catch (error) {
            console.error(error);
            toast('Workspace loaded, but some data could not be loaded.');
        }

    }, 500);

    setTimeout(() => {

        if (trans) {
            trans.classList.remove('active');
        }

    }, 1100);
}


/* ==========================================================
   HEADER BUTTONS
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const launchBtn = $('#launchBtn');
    const launchTop = $('#launchTop');
    const closeBtn = $('#closeBtn');
    const dashboardBtn = $('#dashboardBtn');

    if (launchBtn) {
        launchBtn.addEventListener('click', launch);
    }

    if (launchTop) {
        launchTop.addEventListener('click', launch);
    }

    if (closeBtn) {

        closeBtn.addEventListener('click', () => {

            $('#app').classList.add('hidden');

            document.body.style.overflow = '';

            window.scrollTo(0, 0);

        });

    }

    /*
       Dashboard now actually opens the workspace
       and switches to Analytics.
    */

    if (dashboardBtn) {

        dashboardBtn.addEventListener('click', async () => {

            const app = $('#app');

            if (app.classList.contains('hidden')) {
                launch();

                setTimeout(() => {
                    switchTab('analytics');
                }, 650);

            } else {
                switchTab('analytics');
            }

        });

    }

});


/* ==========================================================
   SIDEBAR
   ========================================================== */

$$('.side').forEach(button => {

    button.addEventListener('click', () => {

        switchTab(button.dataset.tab);

    });

});


function switchTab(tab) {

    currentTab = tab;

    $$('.side').forEach(button => {

        button.classList.toggle(
            'active',
            button.dataset.tab === tab
        );

    });

    $$('.tab-panel').forEach(panel => {

        panel.classList.add('hidden');

    });

    const target = $('#tab-' + tab);

    if (target) {
        target.classList.remove('hidden');
    }

    const titles = {

        content: 'Study Content',
        highlights: 'Saved Highlights',
        notes: 'Notes',
        projects: 'Study Projects',
        quiz: 'Revision Quiz',
        analytics: 'Analytics',
        export: 'Export Material'

    };

    const title = $('#workspaceTitle');

    if (title) {
        title.textContent = titles[tab] || 'Squid Bomber';
    }

    if (tab === 'content') loadContent();
    if (tab === 'highlights') loadHighlights();
    if (tab === 'notes') loadNotes();
    if (tab === 'projects') loadProjects();
    if (tab === 'quiz') loadQuiz();
    if (tab === 'analytics') loadAnalytics();

}


async function loadAnalytics() {

    const stats = $('#stats');

    if (!stats) return;

    try {

        const d = await api(
            '/api/analytics?project_id=' + currentProject
        );

        const items = [
            { label: 'Projects', value: d.projects },
            { label: 'Notes', value: d.notes },
            { label: 'Highlights', value: d.highlights },
            { label: 'Quiz Attempts', value: d.quiz_attempts },
            { label: 'Avg Quiz Score', value: d.avg_score }
        ];

        stats.innerHTML = items.map(item => `
            <div class="stat">
                <b>${esc(String(item.value ?? 0))}</b>
                ${esc(item.label)}
            </div>
        `).join('');

    } catch (error) {

        console.error(error);
        toast(error.message);

    }

}


/* ==========================================================
   PROJECTS
   ========================================================== */

async function loadProjects() {

    const ps = await api('/api/projects');

    const sel = $('#projectSelect');

    if (!sel) return;

    sel.innerHTML = ps.map(p => `
        <option value="${p.id}">
            ${esc(p.name)}
        </option>
    `).join('');

    if (ps.some(p => p.id === currentProject)) {

        sel.value = currentProject;

    } else if (ps.length) {

        currentProject = ps[0].id;
        sel.value = currentProject;

    }

    const projectsList = $('#projectsList');

    if (projectsList) {

        projectsList.innerHTML = ps.map(p => `
            <div class="card">
                <div>
                    <b>${esc(p.name)}</b>
                    <p>${esc(p.description || '')}</p>
                </div>

                <button
                    class="ghost"
                    onclick="removeProject(${p.id})">
                    Delete
                </button>
            </div>
        `).join('');

    }

}


const projectSelect = $('#projectSelect');

if (projectSelect) {

    projectSelect.addEventListener('change', e => {

        currentProject = Number(e.target.value);

        loadContent();
        loadHighlights();
        loadNotes();

    });

}


const createProjectButton = $('#createProject');

if (createProjectButton) {

    createProjectButton.addEventListener('click', async () => {

        const name = $('#projectName').value.trim();

        if (!name) {
            return toast('Enter a project name');
        }

        try {

            await api('/api/projects', {
                method: 'POST',
                body: JSON.stringify({
                    name: name
                })
            });

            $('#projectName').value = '';

            await loadProjects();

            toast('Project created');

        } catch (error) {

            toast(error.message);

        }

    });

}


async function removeProject(id) {

    if (!confirm('Delete this project?')) {
        return;
    }

    try {

        await api('/api/projects/' + id, {
            method: 'DELETE'
        });

        await loadProjects();

        toast('Project deleted');

    } catch (error) {

        toast(error.message);

    }

}
/* ==========================================================
   NOTES
   ========================================================== */

async function loadNotes() {

    const list = $('#notesList');

    if (!list) return;

    try {

        const notes = await api(
            '/api/notes?project_id=' + currentProject
        );

        list.innerHTML = notes.map(note => `
            <div class="card">

                <div>
                    <h3>${esc(note.title)}</h3>
                    <p>${esc(note.body)}</p>

                    <small class="muted">
                        ${esc(note.updated_at || note.created_at || '')}
                    </small>
                </div>

                <button
                    class="ghost"
                    onclick="deleteNote(${note.id})">
                    Delete
                </button>

            </div>
        `).join('') || `
            <p class="muted">No notes yet.</p>
        `;

    } catch (error) {

        console.error(error);
        toast(error.message);

    }
}


const saveNoteButton = $('#saveNote');

if (saveNoteButton) {

    saveNoteButton.addEventListener('click', async () => {

        const titleInput = $('#noteTitle');
        const bodyInput = $('#noteBody');

        const title = (titleInput?.value || '').trim();
        const body = (bodyInput?.value || '').trim();

        if (!body) {
            return toast('Write a note before saving');
        }

        try {

            await api('/api/notes', {
                method: 'POST',
                body: JSON.stringify({
                    project_id: currentProject,
                    title: title,
                    body: body
                })
            });

            if (titleInput) titleInput.value = '';
            if (bodyInput) bodyInput.value = '';

            await loadNotes();

            toast('Note saved');

        } catch (error) {

            toast(error.message);

        }

    });

}


async function deleteNote(id) {

    if (!confirm('Delete this note?')) {
        return;
    }

    try {

        await api('/api/notes/' + id, {
            method: 'DELETE'
        });

        await loadNotes();

        toast('Note deleted');

    } catch (error) {

        toast(error.message);

    }
}


/* ==========================================================
   CONTENT
   ========================================================== */

const contentInputArea = $('#contentInput');

if (contentInputArea) {

    contentInputArea.addEventListener('input', () => {
        setContentOceanTheme();
    });

    contentInputArea.addEventListener('focus', () => {
        setContentOceanTheme();
    });

}

const saveContentButton = $('#saveContent');

if (saveContentButton) {

    saveContentButton.addEventListener('click', async () => {

        const body = $('#contentInput').value.trim();

        if (!body) {
            return toast('Paste or extract some content first');
        }

        const title = $('#contentTitle').value || 'Study Material';

        try {

            await api('/api/content', {
                method: 'POST',
                body: JSON.stringify({

                    project_id: currentProject,
                    title: title,
                    body: body,
                    content_type: readerContentType,
                    images: readerImages,
                    url: readerSourceUrl

                })
            });

            renderReader(title, body, {
                images: readerImages,
                contentType: readerContentType
            });

            await loadContent();

            toast('Content saved');

        } catch (error) {

            toast(error.message);

        }

    });

}


const extractButton = $('#extractBtn');

if (extractButton) {

    extractButton.addEventListener('click', async () => {

        const url = $('#urlInput').value.trim();

        if (!url) {
            return toast('Enter a webpage URL');
        }

        $('#contentStatus').textContent = 'Extracting...';

        try {

            const d = await api('/api/extract', {

                method: 'POST',

                body: JSON.stringify({
                    url: url
                })

            });

            readerContentType = 'web';
            readerImages = Array.isArray(d.images) ? d.images : [];
            readerSourceUrl = url;

            $('#contentTitle').value = d.title;
            $('#contentInput').value = d.body;

            renderReader(d.title, d.body, {
                images: readerImages,
                contentType: readerContentType
            });

            $('#contentStatus').textContent =
                'Extracted successfully';

            toast(
                readerImages.length
                    ? `Readable content loaded with ${readerImages.length} image(s)`
                    : 'Readable content loaded'
            );

        } catch (error) {

            $('#contentStatus').textContent = '';

            toast(error.message);

        }

    });

}


const extractFileButton = $('#extractFileBtn');

if (extractFileButton) {

    extractFileButton.addEventListener('click', async () => {

        const fileInput = $('#fileInput');
        const file = fileInput?.files?.[0];

        if (!file) {
            return toast('Choose a PDF or DOCX file first');
        }

        const nameLower = file.name.toLowerCase();

        if (!nameLower.endsWith('.pdf') && !nameLower.endsWith('.docx')) {
            return toast('Only .pdf and .docx files are supported');
        }

        $('#contentStatus').textContent = 'Extracting file...';

        try {

            const formData = new FormData();
            formData.append('file', file);

            const csrfToken =
                document.querySelector('meta[name="csrf-token"]')?.content;

            const r = await fetch('/api/extract/file', {
                method: 'POST',
                headers: {
                    ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {})
                },
                body: formData
            });

            let d = {};

            try {
                d = await r.json();
            } catch (e) {}

            if (!r.ok) {
                throw new Error(d.error || 'Could not extract this file');
            }

            readerContentType = d.content_type || 'text';
            readerImages = Array.isArray(d.images) ? d.images : [];
            readerSourceUrl = '';

            $('#contentTitle').value = d.title;
            $('#contentInput').value = d.body;

            renderReader(d.title, d.body, {
                images: readerImages,
                contentType: readerContentType
            });

            $('#contentStatus').textContent = 'Extracted successfully';

            toast(
                (readerContentType === 'pdf' ? 'PDF' : 'DOCX') +
                ' content loaded' +
                (readerImages.length
                    ? ` with ${readerImages.length} image(s)`
                    : '')
            );

            fileInput.value = '';

        } catch (error) {

            $('#contentStatus').textContent = '';
            toast(error.message);

        }

    });

}


async function loadContent() {

    const list = $('#savedContentList');

    if (!list || currentProject == null) return;

    try {

        const items = await api(
            '/api/content?project_id=' + currentProject
        );

        list.innerHTML = items.map(item => {

            const meta = TYPE_META[item.content_type] || TYPE_META.text;
            const images = Array.isArray(item.images) ? item.images : [];
            const snippet = (item.body || '').slice(0, 220);

            return `
                <div class="card">

                    <div>
                        <h3>
                            ${esc(item.title)}
                            <span class="tag" style="background:${meta.color}">
                                ${esc(meta.label)}
                            </span>
                        </h3>

                        ${images.length ? `
                            <div class="reader-images small-gallery">
                                ${images.slice(0, 4).map(src => `
                                    <img
                                        src="${esc(src)}"
                                        alt="Saved image"
                                        loading="lazy"
                                        class="reader-image-thumb small">
                                `).join('')}
                            </div>
                        ` : ''}

                        <p>${esc(snippet)}${(item.body || '').length > 220 ? '…' : ''}</p>

                        ${item.source_url ? `
                            <small class="muted">${esc(item.source_url)}</small>
                        ` : ''}
                    </div>

                    <button
                        class="ghost"
                        onclick="deleteContent(${item.id})">
                        Delete
                    </button>

                </div>
            `;

        }).join('') || `
            <p class="muted">
                No saved materials yet — extract a URL, upload a PDF/DOCX,
                or paste text and save it.
            </p>
        `;

    } catch (error) {

        console.error(error);
        toast(error.message);

    }

}


async function deleteContent(id) {

    if (!confirm('Delete this saved material?')) {
        return;
    }

    try {

        await api('/api/content/' + id, {
            method: 'DELETE'
        });

        await loadContent();

        toast('Saved material deleted');

    } catch (error) {

        toast(error.message);

    }

}


function renderReader(title, body, opts = {}) {

    const reader = $('#reader');

    if (!reader) return;

    const images = Array.isArray(opts.images) ? opts.images : [];
    const contentType = opts.contentType || 'text';
    const meta = TYPE_META[contentType] || TYPE_META.text;

    readerTitle = title;
    readerOriginalBody = body;
    readerDisplayedBody = body;
    readerEditing = false;

    reader.classList.remove('hidden');

    reader.innerHTML = `
        <div class="reader-head">
            <h2>${esc(title)}</h2>
            <span class="tag" style="background:${meta.color}">
                ${esc(meta.label)}
            </span>
        </div>

        ${images.length ? `
            <div class="reader-images" id="readerImages">
                ${images.map(src => `
                    <img
                        src="${esc(src)}"
                        alt="Extracted image"
                        loading="lazy"
                        class="reader-image-thumb">
                `).join('')}
            </div>
        ` : ''}

        <div class="reader-toolbar" id="readerToolbar">

            <div class="field">
                <label>Translate to</label>
                <select id="readerLangSelect">
                    ${TRANSLATE_LANGUAGES.map(l => `
                        <option value="${l.code}">${esc(l.label)}</option>
                    `).join('')}
                </select>
            </div>

            <button
                type="button"
                class="primary small"
                id="translateReaderBtn">
                🌐 Translate
            </button>

            <button
                type="button"
                class="ghost small"
                id="editReaderBtn">
                ✏️ Edit
            </button>

            <span class="status" id="readerToolbarStatus"></span>

        </div>

        <div id="readerText">
            ${esc(body)}
        </div>
    `;

    attachReaderSelectionListener();

    const langSelect = $('#readerLangSelect');

    if (langSelect) {

        langSelect.addEventListener('change', () => {

            if (langSelect.value === 'original') {
                setReaderDisplayedText(readerOriginalBody);
            }

        });

    }

    const translateBtn = $('#translateReaderBtn');

    if (translateBtn) {
        translateBtn.addEventListener('click', translateReaderContent);
    }

    const editBtn = $('#editReaderBtn');

    if (editBtn) {
        editBtn.addEventListener('click', toggleEditReader);
    }

}


function attachReaderSelectionListener() {

    const readerText = $('#readerText');

    if (!readerText) return;

    readerText.addEventListener('mouseup', () => {

        const s =
            window.getSelection()?.toString().trim();

        if (s) {

            selectedText = s;

            $('#selectionHint').textContent =
                `Selected: “${s.slice(0, 100)}${s.length > 100 ? '…' : ''}”`;

        }

    });

}


function setReaderDisplayedText(text) {

    readerDisplayedBody = text;

    const readerText = $('#readerText');

    if (readerText) {
        readerText.innerHTML = esc(text);
        attachReaderSelectionListener();
    }

}


async function translateReaderContent() {

    const langSelect = $('#readerLangSelect');
    const status = $('#readerToolbarStatus');
    const translateBtn = $('#translateReaderBtn');

    if (!langSelect) return;

    const target = langSelect.value;

    if (target === 'original') {
        setReaderDisplayedText(readerOriginalBody);
        return;
    }

    if (!readerOriginalBody) {
        return toast('Nothing to translate yet');
    }

    if (translateBtn) {
        translateBtn.disabled = true;
    }

    if (status) {
        status.textContent = 'Translating...';
    }

    try {

        const d = await api('/api/translate', {
            method: 'POST',
            body: JSON.stringify({
                text: readerOriginalBody,
                target_lang: target
            })
        });

        setReaderDisplayedText(d.translated);

        if (status) {
            status.textContent = 'Translated';
        }

        toast('Content translated');

    } catch (error) {

        if (status) {
            status.textContent = '';
        }

        toast(error.message);

    } finally {

        if (translateBtn) {
            translateBtn.disabled = false;
        }

    }

}


function toggleEditReader() {

    const readerText = $('#readerText');
    const editBtn = $('#editReaderBtn');

    if (!readerText || !editBtn) return;

    if (!readerEditing) {

        readerEditing = true;

        const currentText = readerDisplayedBody;

        readerText.outerHTML = `
            <textarea
                id="readerText"
                class="content-input reader-editarea"
            >${esc(currentText)}</textarea>
        `;

        setContentOceanTheme();

        $('#readerText').addEventListener('input', () => {
            setContentOceanTheme();
        });

        editBtn.textContent = '💾 Save Edit';

        if (!$('#cancelReaderEditBtn')) {

            editBtn.insertAdjacentHTML(
                'afterend',
                `<button
                    type="button"
                    class="ghost small"
                    id="cancelReaderEditBtn">
                    Cancel
                </button>`
            );

            $('#cancelReaderEditBtn').addEventListener(
                'click',
                cancelEditReader
            );

        }

        return;

    }

    // Saving the edit
    const editedText = $('#readerText').value;

    readerEditing = false;

    const langSelect = $('#readerLangSelect');

    if (langSelect && langSelect.value === 'original') {
        readerOriginalBody = editedText;
    }

    readerDisplayedBody = editedText;

    const contentInput = $('#contentInput');

    if (contentInput) {
        contentInput.value = editedText;
    }

    $('#readerText').outerHTML = `
        <div id="readerText">${esc(editedText)}</div>
    `;

    attachReaderSelectionListener();

    editBtn.textContent = '✏️ Edit';

    const cancelBtn = $('#cancelReaderEditBtn');

    if (cancelBtn) {
        cancelBtn.remove();
    }

    toast('Extracted content updated — click Save Content to persist');

}


function cancelEditReader() {

    readerEditing = false;

    $('#readerText').outerHTML = `
        <div id="readerText">${esc(readerDisplayedBody)}</div>
    `;

    attachReaderSelectionListener();

    const editBtn = $('#editReaderBtn');

    if (editBtn) {
        editBtn.textContent = '✏️ Edit';
    }

    const cancelBtn = $('#cancelReaderEditBtn');

    if (cancelBtn) {
        cancelBtn.remove();
    }

}


/* ==========================================================
   SQUID CURSOR
   ========================================================== */

const inkCursorSquid = $('#ink-cursor-squid');
const inkBubbleContainer = $('#ink-bubble-container');

let cursorTargetX = window.innerWidth / 2;
let cursorTargetY = window.innerHeight / 2;

let cursorCurrentX = cursorTargetX;
let cursorCurrentY = cursorTargetY;

let cursorVisible = false;
let lastBubbleAt = 0;


function setInkCursorVisible(visible) {

    if (!inkCursorSquid) return;

    cursorVisible = visible;

    inkCursorSquid.classList.toggle(
        'visible',
        visible
    );

}


function animateSquidCursor() {

    const smoothing = 0.16;

    cursorCurrentX +=
        (cursorTargetX - cursorCurrentX) * smoothing;

    cursorCurrentY +=
        (cursorTargetY - cursorCurrentY) * smoothing;

    if (inkCursorSquid) {

        inkCursorSquid.style.left =
            `${cursorCurrentX}px`;

        inkCursorSquid.style.top =
            `${cursorCurrentY}px`;

    }

    requestAnimationFrame(
        animateSquidCursor
    );

}

animateSquidCursor();


document.addEventListener('mousemove', event => {

    cursorTargetX = event.clientX;
    cursorTargetY = event.clientY;

    if (!cursorVisible) {
        setInkCursorVisible(true);
    }

    if (isSelectingInReader) {

        selectionBubbleTrail(
            event.clientX,
            event.clientY
        );

    }

});


document.addEventListener('mouseleave', () => {

    setInkCursorVisible(false);

});


document.addEventListener('mouseenter', event => {

    cursorTargetX = event.clientX;
    cursorTargetY = event.clientY;

    cursorCurrentX = event.clientX;
    cursorCurrentY = event.clientY;

    setInkCursorVisible(true);

});


/* ==========================================================
   INK BUBBLES
   ========================================================== */

function spawnInkBubble(x, y, burst = false) {

    if (!inkBubbleContainer) return;

    const bubble = document.createElement('span');

    bubble.className =
        'selection-ink-bubble';

    const color =
        modes[selectedMode]?.color ||
        '#58a6ff';

    const size = burst
        ? 5 + Math.random() * 8
        : 4 + Math.random() * 6;

    const angle =
        Math.random() * Math.PI * 2;

    const distance = burst
        ? 18 + Math.random() * 34
        : 12 + Math.random() * 24;

    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;

    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;

    bubble.style.background = color;
    bubble.style.color = color;

    bubble.style.setProperty(
        '--bubble-x',
        `${Math.cos(angle) * distance}px`
    );

    bubble.style.setProperty(
        '--bubble-y',
        `${Math.sin(angle) * distance - 10}px`
    );

    inkBubbleContainer.appendChild(bubble);

    setTimeout(() => {
        bubble.remove();
    }, 760);

}


function selectionBubbleTrail(x, y) {

    const now = performance.now();

    if (now - lastBubbleAt < 90) {
        return;
    }

    lastBubbleAt = now;

    spawnInkBubble(x, y, false);

}


function selectionInkBurst(x, y) {

    for (let i = 0; i < 8; i++) {

        setTimeout(() => {

            spawnInkBubble(
                x,
                y,
                true
            );

        }, i * 25);

    }

}


document.addEventListener('mousedown', event => {

    const readerText =
        event.target.closest('#readerText');

    if (!readerText) return;

    isSelectingInReader = true;

    selectionBubbleTrail(
        event.clientX,
        event.clientY
    );

});


document.addEventListener('mouseup', event => {

    if (!isSelectingInReader) {
        return;
    }

    isSelectingInReader = false;

    const text =
        window.getSelection()?.toString().trim();

    if (text) {

        selectedText = text;

        $('#selectionHint').textContent =
            `Selected: “${text.slice(0, 100)}${text.length > 100 ? '…' : ''}”`;

        selectionInkBurst(
            event.clientX,
            event.clientY
        );

    }

});


/* ==========================================================
   QUIZ
   ========================================================== */

async function loadQuiz() {

    const form = $('#quizForm');

    if (!form) return;

    const resultBox = $('#quizResult');

    if (resultBox) {
        resultBox.textContent = '';
        resultBox.classList.remove('show');
    }

    try {

        const questions = await api('/api/quiz');

        form.innerHTML = questions.map((q, qi) => `
            <div class="question">

                <h4>${qi + 1}. ${esc(q.question)}</h4>

                ${q.options.map((opt, oi) => `
                    <label class="option">
                        <input
                            type="radio"
                            name="q${qi}"
                            value="${oi}">
                        ${esc(opt)}
                    </label>
                `).join('')}

            </div>
        `).join('') || `
            <p class="muted">No quiz questions available.</p>
        `;

    } catch (error) {

        console.error(error);
        toast(error.message);

    }

}


const submitQuizButton = $('#submitQuiz');

if (submitQuizButton) {

    submitQuizButton.addEventListener('click', async () => {

        const form = $('#quizForm');
        const resultBox = $('#quizResult');

        if (!form) return;

        const questionBlocks =
            form.querySelectorAll('.question');

        if (!questionBlocks.length) {
            return toast('No quiz loaded yet');
        }

        const answers = [];

        for (let qi = 0; qi < questionBlocks.length; qi++) {

            const checked = form.querySelector(
                `input[name="q${qi}"]:checked`
            );

            if (!checked) {
                return toast('Answer every question before submitting');
            }

            answers.push(
                parseInt(checked.value, 10)
            );

        }

        if (!currentProject) {
            return toast('Select a project first');
        }

        try {

            const result = await api(
                `/api/quiz/${currentProject}/submit`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        answers: answers
                    })
                }
            );

            if (resultBox) {

                resultBox.textContent =
                    `Score: ${result.score} / ${result.total}`;

                resultBox.classList.add('show');

            }

            toast('Quiz submitted');

        } catch (error) {

            toast(error.message);

        }

    });

}


/* ==========================================================
   MASCOT
   ========================================================== */

function mascotMode(mode) {

    const m = $('#workspaceMascot');

    if (!m) return;

    Object.keys(modes).forEach(k => {

        m.classList.remove(
            'mode-' + k
        );

    });

    m.classList.add(
        'mode-' + mode
    );

    const label =
        modes[mode]?.label ||
        'IDLE • INK CORE';

    $('#mascotStatus').textContent =
        label.toUpperCase();

}


function mascotInkBurst() {

    const m = $('#workspaceMascot');

    if (!m) return;

    m.classList.remove('ink-active');

    void m.offsetWidth;

    m.classList.add('ink-active');

    setTimeout(() => {

        m.classList.remove(
            'ink-active'
        );

    }, 800);

}


/* ==========================================================
   INK PALETTE
   ========================================================== */

function buildPalette() {

    const p = $('#inkPalette');

    if (!p) return;

    p.innerHTML =
        Object.entries(modes).map(([k, v]) => `

        <button
            class="ink-choice ${k === selectedMode ? 'selected' : ''}"
            data-mode="${k}">

            <i style="background:${v.color}"></i>

            <span>${esc(v.label)}</span>

        </button>

    `).join('');

    $$('.ink-choice').forEach(button => {

        button.addEventListener('click', () => {

            selectedMode =
                button.dataset.mode;

            mascotMode(
                selectedMode
            );

            mascotInkBurst();

            buildPalette();

        });

    });

    setContentOceanTheme(
        modes[selectedMode]?.color
    );

}


const applyInkButton = $('#applyInk');

if (applyInkButton) {

    applyInkButton.addEventListener('click', async () => {

        if (!selectedText) {

            return toast(
                'Select text in the reader first'
            );

        }

        try {

            await api('/api/highlights', {

                method: 'POST',

                body: JSON.stringify({

                    project_id:
                        currentProject,

                    text:
                        selectedText,

                    mode:
                        selectedMode

                })

            });

            applyVisualInk(
                selectedMode
            );

            mascotInkBurst();

            const r =
                $('#reader').getBoundingClientRect();

            selectionInkBurst(

                Math.min(
                    window.innerWidth - 30,
                    Math.max(30, r.right - 55)
                ),

                Math.min(
                    window.innerHeight - 30,
                    Math.max(30, r.bottom - 45)
                )

            );

            toast(
                `${modes[selectedMode].label} saved`
            );

            selectedText = '';

            $('#selectionHint').textContent =
                'Highlight saved. Select more text to continue.';

            loadHighlights();

        } catch (error) {

            toast(error.message);

        }

    });

}


function applyVisualInk(mode) {

    const sel =
        window.getSelection();

    if (!sel || sel.rangeCount === 0) {
        return;
    }

    const range =
        sel.getRangeAt(0);

    if (range.collapsed) {
        return;
    }

    try {

        const mark =
            document.createElement('mark');

        mark.className =
            'saved-ink';

        mark.style.background =
            modes[mode].color;

        const frag =
            range.extractContents();

        mark.appendChild(frag);

        range.insertNode(mark);

        sel.removeAllRanges();

    } catch (e) {

        console.warn(
            'Visual highlight could not be applied.',
            e
        );

    }

}


/* ==========================================================
   HIGHLIGHTS
   ========================================================== */

async function loadHighlights() {

    const hs =
        await api(
            '/api/highlights?project_id=' +
            currentProject
        );

    const filters =
        $('#highlightFilters');

    if (!filters) return;

    filters.innerHTML =
        `<button class="filter active" data-filter="all">ALL</button>` +

        Object.entries(modes).map(([k, v]) => `
            <button
                class="filter"
                data-filter="${k}">
                ${esc(v.label)}
            </button>
        `).join('');

    let active = 'all';

    const draw = () => {

        $('#highlightsList').innerHTML =

            hs.filter(x =>
                active === 'all' ||
                x.mode === active
            ).map(x => `

                <div class="card">

                    <div>

                        <span
                            class="tag"
                            style="background:${x.color}">

                            ${esc(
                                modes[x.mode]?.label ||
                                x.mode
                            )}

                        </span>

                        <p>${esc(x.text)}</p>

                    </div>

                    <button
                        class="ghost"
                        onclick="deleteHighlight(${x.id})">

                        ×

                    </button>

                </div>

            `).join('') ||

            '<p class="muted">No highlights yet.</p>';

    };

    $$('#highlightFilters .filter')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    active =
                        button.dataset.filter;

                    $$('#highlightFilters .filter')
                        .forEach(x =>
                            x.classList.toggle(
                                'active',
                                x === button
                            )
                        );

                    draw();

                }
            );

        });
      }
      /* ==========================================================
   PDF EXPORT
   ========================================================== */

const exportPdfButton = $('#exportPdf');

if (exportPdfButton) {
    exportPdfButton.addEventListener('click', exportPDF);
}


async function exportPDF() {

    if (!currentProject) {
        return toast('Select a project first');
    }

    const button =
        $('#exportPdfBtn') ||
        $('#pdfExportBtn') ||
        $('#exportPDF') ||
        $('#exportPdf');

    if (button) {
        button.disabled = true;
        button.textContent = 'Generating PDF...';
    }

    try {

        const csrfToken =
            document.querySelector('meta[name="csrf-token"]')?.content;

        const response = await fetch('/api/export/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {})
            },
            body: JSON.stringify({
                project_id: currentProject
            })
        });

        if (!response.ok) {

            let message = 'PDF export failed';

            try {
                const error = await response.json();
                message = error.error || message;
            } catch (e) {}

            throw new Error(message);
        }

        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');

        a.href = url;
        a.download = 'SquidBomber_Study_Material.pdf';

        document.body.appendChild(a);
        a.click();

        a.remove();

        window.URL.revokeObjectURL(url);

        toast('PDF exported successfully');

    } catch (error) {

        console.error('PDF export error:', error);

        toast(error.message);

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = 'Export PDF';
        }

    }
}