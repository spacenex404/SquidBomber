# Squid Bomber V1.2 — SpaceNex

**Capture Knowledge. Ink Your Learning.**

A Flask-based non-AI study workspace with content extraction, notes, projects, quizzes, analytics, PDF export, color-coded ink highlights, an idle squid companion, and the new squid cursor selection effect.

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
