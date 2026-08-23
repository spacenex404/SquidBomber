const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
let isSelectingInReader = false;
const modes = window.INK_MODES || {};

let currentProject = null;
let currentTab = 'content';
let selectedText = '';
let selectedMode = Object.keys(modes)[0] || 'concept';

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

    if (tab === 'highlights') loadHighlights();
    if (tab === 'notes') loadNotes();
    if (tab === 'projects') loadProjects();
    if (tab === 'quiz') loadQuiz();
    if (tab === 'analytics') loadAnalytics();

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

const saveContentButton = $('#saveContent');

if (saveContentButton) {

    saveContentButton.addEventListener('click', async () => {

        const body = $('#contentInput').value.trim();

        if (!body) {
            return toast('Paste or extract some content first');
        }

        try {

            await api('/api/content', {
                method: 'POST',
                body: JSON.stringify({

                    project_id: currentProject,

                    title:
                        $('#contentTitle').value ||
                        'Study Material',

                    body: body

                })
            });

            renderReader(
                $('#contentTitle').value || 'Study Material',
                body
            );

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

            $('#contentTitle').value = d.title;
            $('#contentInput').value = d.body;

            renderReader(
                d.title,
                d.body
            );

            $('#contentStatus').textContent =
                'Extracted successfully';

            toast('Readable content loaded');

        } catch (error) {

            $('#contentStatus').textContent = '';

            toast(error.message);

        }

    });

}


function renderReader(title, body) {

    const reader = $('#reader');

    if (!reader) return;

    reader.classList.remove('hidden');

    reader.innerHTML = `
        <h2>${esc(title)}</h2>

        <div id="readerText">
            ${esc(body)}
        </div>
    `;

    const readerText = $('#readerText');

    if (readerText) {

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

async function exportPDF() {

    if (!currentProject) {
        return toast('Select a project first');
    }

    const button =
        $('#exportPdfBtn') ||
        $('#pdfExportBtn') ||
        $('#exportPDF');

    if (button) {
        button.disabled = true;
        button.textContent = 'Generating PDF...';
    }

    try {

        const response = await fetch('/api/export/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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