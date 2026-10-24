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

## Pages

| Route | Who | What works |
|---|---|---|
| `#/login` | Everyone | Demo sign-in: AICTE, 4 colleges, 1 student. Pages check the role and redirect here |
| `#/aicte/institutions` | AICTE officials | All institutions with intake, submission status and anomalies; detail drawer per institution |
| `#/aicte` | AICTE officials | Region and programme filters, intake vs. enrolment bars, anomaly table with search and severity filter, review drawer (issue notice / mark under review / dismiss), CSV export, deduplication run |
| `#/institution` | College admin (4 demo colleges) | Sees only its own data. CSV upload (drag and drop), 14 configurable validation rules, intake meters, issue table with filters and paging, issue report download, submission with SHA-256 file fingerprint |
| `#/student` | Student | Signed QR credential, copy code, download QR, issue new QR, grant / revoke access per organisation, access log |
| `#/verify` | Employer | Paste code, scan with camera, or upload a QR image. Real signature check, consent check per organisation |

## Demo script (4 minutes)

Click **Reset demo data** on the home page before each run.

1. **Sign in** as *Dr. Rajeshwar Patil* (Konkan Institute, KIET). Load the *batch with errors* demo file: intake over the limit, invalid APAAR IDs, students enrolled elsewhere. Submit is blocked.
2. **Start over** → *clean batch* → **Submit to AICTE**. Show the acknowledgement and file fingerprint.
3. **Sign out**, sign in as *Prof. Meera Kulkarni* (Sahyadri College). Load the *clean batch*: 3 students are flagged *Already enrolled at another institution*. Point out that Sahyadri is **not told which college**, only that the student is enrolled elsewhere.
4. **Sign out**, sign in as *Dr. Alok Singh* (AICTE). The anomaly register has a **New** critical entry naming both colleges. Open **Institutions & intake**: KIET now shows as submitted, Sahyadri as pending with 1 open anomaly.
5. **Sign out**, sign in as *Priya Deshmukh*. Show the QR, then **Preview as employer** → *Verified*. Click **Altered copy** → *Record has been altered*.
6. Switch *Verifying as* to **Wipro** and click **Genuine credential** → *Genuine, but not shared with you*.

The same flow works the other way round, and for Godavari College of Management Studies, which shares 2 MCA applicants with KIET.

### Accounts and data

- Sign-in is per browser tab, so you can keep two colleges open side by side in two tabs.
- Submissions are shared between all accounts through the browser's localStorage, standing in for AICTE's central database.

## For the backend team: `src/api/index.js`

Every screen gets and changes data only through the async functions in `src/api/index.js`. Each one is documented with the endpoint and response shape it expects. To connect the real backend, replace a function's body with a `fetch()` to that endpoint and keep the return shape; no screen needs to change. Set `VITE_API_BASE` in a `.env` file to point at the server.

| Function | Endpoint |
|---|---|
| `getOverview({ programme })` | `GET /aicte/overview?programme=` |
| `listAnomalies()` | `GET /aicte/anomalies` |
| `updateAnomaly(id, { status, note })` | `PATCH /aicte/anomalies/:id` |
| `runDeduplication()` | `POST /aicte/deduplication` |
| `listDemoAccounts()`, `signIn(id)` | `POST /auth/session` (replace with real sign-in) |
| `listInstitutions()` | `GET /aicte/institutions` |
| `getInstitution(code)` | `GET /aicte/institutions/:code` |
| `getInstitutionContext(code)` | `GET /institutions/me` |
| `validateBatch(code, rows)` | `POST /institutions/me/batches/validate` |
| `submitBatch(code, csv, rows)` | `POST /institutions/me/batches` |
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
