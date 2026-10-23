# APAAR Setu

Clickable prototype for **SIH26263: APAAR ID-based Student Data Management and Verification Platform** (AICTE), by team **Code Geass**.

React 19 + Vite + Tailwind CSS v4. No backend: all data is synthetic and all institution names are fictional.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Use Chrome or Safari; the camera scanner needs `localhost` or HTTPS.

To build a static version: `npm run build`, then serve the `dist/` folder.

## The four portals

| Route | Who | What works |
|---|---|---|
| `#/aicte` | AICTE officials | Region and programme filters, intake vs. enrolment bars, anomaly table with search and severity filter, review drawer (issue notice / mark under review / dismiss), CSV export, deduplication run |
| `#/institution` | College admin | CSV upload (drag and drop), 14 configurable validation rules, intake meters, issue table with filters and paging, issue report download, submission with SHA-256 file fingerprint |
| `#/student` | Student | Signed QR credential, copy code, download QR, issue new QR, grant / revoke access per organisation, access log |
| `#/verify` | Employer | Paste code, scan with camera, or upload a QR image. Real signature check, consent check per organisation |

## Demo script (3 minutes)

1. **Institution** → click *batch with errors*. Point out the B.Tech CE intake meter (186 of 180), an invalid APAAR ID, and *Already enrolled at another institution*. Submit is blocked.
2. Click *Start over* → *clean batch* → **Submit to AICTE**. Show the acknowledgement and file fingerprint.
3. **AICTE** → read the headline, click the **Western** row to filter the anomaly register, then **Open file** on the critical duplicate → **Issue notice**.
4. **Student** → show the QR, then click **Preview as employer** → green *Verified*.
5. On the verifier, click **Altered copy** → red *Record has been altered*.
6. Switch *Verifying as* to **Wipro** and click **Genuine credential** → *Genuine, but not shared with you*. Back on the student page, the access log shows every attempt, including the blocked ones.

Use **Reset demo data** on the home page between rehearsals.

## For the backend team: `src/api/index.js`

Every screen gets and changes data only through the async functions in `src/api/index.js`. Each one is documented with the endpoint and response shape it expects. To connect the real backend, replace a function's body with a `fetch()` to that endpoint and keep the return shape; no screen needs to change. Set `VITE_API_BASE` in a `.env` file to point at the server.

| Function | Endpoint |
|---|---|
| `getOverview({ programme })` | `GET /aicte/overview?programme=` |
| `listAnomalies()` | `GET /aicte/anomalies` |
| `updateAnomaly(id, { status, note })` | `PATCH /aicte/anomalies/:id` |
| `runDeduplication()` | `POST /aicte/deduplication` |
| `getInstitutionContext()` | `GET /institutions/me` |
| `validateBatch(rows)` | `POST /institutions/me/batches/validate` |
| `submitBatch(csv, students)` | `POST /institutions/me/batches` |
| `issueCredential(student)` | `POST /students/me/credentials` |
| `verifyCredential(token)` | `POST /credentials/verify` |

Consent grants and the student access log live in `src/state/AppState.jsx` for now; they map to `GET/POST/DELETE /students/me/grants` and `GET /students/me/access-log`.

## Government website conventions

Following india.gov.in, mha.gov.in and uidai.gov.in (GIGW guidelines):

- **Noto Sans** for Latin text and **Noto Sans Devanagari** for Hindi, loaded from Google Fonts.
- Top strip on every page: skip to main content, text size (A− A A+), high-contrast mode, and a हिन्दी / English toggle for navigation and headings.
- Footer with website policies, help, sitemap, and a "Last reviewed and updated on" date, plus a clear note that this is a prototype and not an official Government of India website.
- No national emblem: its use is restricted by law, so the app uses its own APAAR Setu mark.

## How the pieces map to the problem statement

- **Validation rules** (`src/lib/validation.js`): rules are data (severity, message, fix), so AICTE could change them per academic year without code changes.
- **APAAR registry adapter** (`src/data/registry.js`): the app only talks to `apaarRegistry.lookup()` and `activeElsewhere()`. Today that's a mock; in production it becomes an HTTP client to the real APAAR/ABC API, with nothing else changing.
- **Verifiable credentials** (`src/lib/credential.js`): ECDSA P-256 signatures via the browser's Web Crypto API. Token format `AS1.<payload>.<signature>`. The QR carries only the last 4 digits of the APAAR ID.
  - *Demo shortcut:* the signing key is embedded so every laptop produces matching QRs. In production the private key stays in AICTE's HSM and only the public key ships to verifiers.
- **Consent (DPDP Act 2023)** (`src/state/AppState.jsx`): purpose-bound, time-limited grants per organisation; revocation takes effect on the next verification; AICTE's statutory access can't be revoked.

## Project layout

```
src/
  api/          the only data layer: swap the mocks for fetch() calls here
  pages/        AicteDashboard, InstitutionUpload, StudentProfile, Verifier, Home
  components/   Shell (sidebar layout), ui (buttons, badges, panels, modals), Icon, QrScanner
  lib/          validation rules, credential signing, CSV parser, formatting, hash router
  data/         mock national data, mock APAAR registry, sample CSV generator
  state/        shared consent / credential / access-log state (localStorage)
```

Icons are inline SVG and there are no runtime CDN calls apart from Google Fonts, so the demo works on poor venue Wi-Fi (fonts fall back to system fonts offline). Display preferences (language, text size, contrast) are in `src/state/Prefs.jsx`; Hindi labels are in `src/lib/i18n.js`.
