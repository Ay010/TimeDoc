# TimeDoc

A Windows desktop app for tracking work hours and automatically generating invoices and timesheets as Word and Excel documents.

## Features

- **Hour Tracking** — Log daily work hours with start time, end time, break duration, and notes
- **Template-Based Export** — Use your own Word (.docx) and Excel (.xlsx) templates with placeholders that get filled automatically
- **Invoice & Timesheet Generation** — Export professional documents at the end of each month with one click
- **Email Template** — Pre-filled email draft with all relevant data, ready to copy and send
- **Data Import** — Paste time entries from Excel or other sources and let the app parse and merge them
- **Backup System** — Automatic daily backups, manual backup creation, and export/import to USB or any folder
- **Sensitive Data Protection** — IBAN and BIC are encrypted (AES-256-GCM) and optionally password-protected
- **Portable Mode** — Run without installation, carry your data on a USB stick
- **Auto-Update** — The app checks for updates on startup and installs them automatically

## Download

Go to the [Releases](../../releases) page and download:

- **TimeDoc Setup x.x.x.exe** — Installer (recommended)
- **TimeDoc x.x.x.exe** — Portable version (no installation needed)

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm

### Setup

```bash
git clone https://github.com/Ay010/TimeDoc.git
cd TimeDoc
npm install
```

### Run in Development

```bash
npm run electron:dev
```

### Build

```bash
npm run build
```

The output will be in the `release/` folder.

## Tech Stack

- **Electron** — Desktop framework
- **React + TypeScript** — UI
- **Tailwind CSS** — Styling
- **SQLite (sql.js)** — Local database
- **docxtemplater** — Word document generation
- **ExcelJS** — Excel document generation
- **Vite** — Build tool
- **electron-builder** — Packaging

## Release

Pushing a version tag triggers an automatic build and GitHub Release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## License

[MIT](LICENSE)
