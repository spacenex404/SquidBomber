# Squid Bomber V1.3 — SpaceNex

**Capture Knowledge. Ink Your Learning.**

A Flask-based non-AI study workspace with content extraction (web pages, PDFs, DOCX files, and images), notes, projects, quizzes, analytics, PDF export, color-coded ink highlights, an idle squid companion, and the squid cursor selection effect.

## V1.3 update — multi-format content extraction
- **Web image extraction:** pulling in a URL now also grabs the page's images (og:image / twitter:image and in-article `<img>` tags) and shows them inline in the reader, not just the text.
- **PDF upload:** upload a `.pdf` in the Content tab and its text (and any embedded images) is extracted straight into the workspace.
- **DOCX upload:** same for `.docx` — paragraph text and embedded images are pulled out automatically.
- **Saved Materials list:** every saved item in the Content tab now shows a type badge (Text / Web / PDF / DOCX) and thumbnails for any extracted images, so what you extracted is visibly there in the workspace, with a Delete option.
- Extracted/uploaded images are re-encoded through Pillow before being stored (strips anything unsafe riding along in the file) and served from `static/uploads/`.
- Existing project databases upgrade automatically the first time you run this version — no manual migration needed.

## V1.2 update
- **Squid cursor selection:** a small squid follows the mouse while the user selects text in the study reader.
- **Ink bubbles:** the squid releases small colored bubbles during selection and on selection completion.
- **Color follows ink mode:** Concept, Definition, Example/Application, Revision, Doubt, and Task each use their selected color.
- Existing idle squid companion and ink-mode system remain enabled.
- Project remains completely **non-AI**.

## Run on Windows / VS Code

Open the project folder in VS Code, then in PowerShell:

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

If PowerShell blocks activation, you can run the server without activation after installing packages into your Python environment:

```powershell
python -m pip install -r requirements.txt
python app.py
```

Open:

`http://127.0.0.1:5000`

## Main files

```text
SQUID BOMBER V1.0/
├── app.py
├── requirements.txt
├── VERSION.txt
├── templates/
│   └── index.html
└── static/
    ├── script.js
    ├── style.css
    └── assets/
        ├── squid.png
        └── squid-original.png
```

## Important

The squid image used by the cursor is loaded from:

`static/assets/squid.png`

Do not rename or remove it unless you also update `templates/index.html`.
