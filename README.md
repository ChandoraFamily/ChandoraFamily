# Lineage — Family Tree App

A Next.js (App Router + TypeScript) genealogy app: search for a person, and
explore an interactive pedigree-style family tree graph around them — add
people, connect parents/children/spouses, and edit records — all backed by
a REST API. The same codebase is structured to ship as a **web app**, an
**Android app** (via Capacitor), and a **Windows desktop app** (via Electron).

## Stack

- Next.js 14, React 18, TypeScript
- Tailwind CSS (custom "ledger/pedigree" design tokens — see `tailwind.config.ts`)
- Data: a JSON file (`data/persons.json`) behind a small repository layer
  (`src/lib/db.ts`) — swap this for Postgres/SQLite/etc. later without
  touching any API route or component.
- Custom SVG rendering for the tree graph (no external charting library, so
  there's nothing extra to install or that can silently drift out of sync
  with React's version).

## Getting started

```bash
npm install
npm run dev
# open http://localhost:3000
```

The app seeds itself with a small sample family (`data/persons.json`) so the
tree renders immediately.

## Project structure

```
src/
  app/
    page.tsx                 # main screen: search + tree + detail panel
    layout.tsx                # fonts, metadata
    globals.css               # design tokens as CSS vars, ledger texture
    api/
      persons/route.ts             # GET (list/search), POST (create)
      persons/[id]/route.ts        # GET, PUT, DELETE one person
      persons/[id]/tree/route.ts   # GET positioned graph around a person
      relationships/route.ts       # POST/DELETE parent-child & spouse links
  components/
    FamilyTree.tsx            # SVG pedigree graph, pan/zoom
    PersonSearch.tsx          # live search dropdown
    PersonDetailPanel.tsx     # view/edit/delete/add-relative side panel
    PersonForm.tsx            # create/edit form
  lib/
    db.ts                     # JSON-file data access layer
    tree.ts                   # flat person list -> positioned graph
  types/
    person.ts                 # shared domain types
data/persons.json             # seed data / on-disk store
electron/                     # Windows desktop wrapper
capacitor.config.ts           # Android wrapper config
```

## API reference

All routes return `{ data: ... }` on success or `{ error: string }` on
failure, with a matching HTTP status code.

| Method | Path                        | Description                                    |
|--------|-----------------------------|------------------------------------------------|
| GET    | `/api/persons`              | List all persons                               |
| GET    | `/api/persons?q=smith`      | Search by first/last/maiden name or place       |
| POST   | `/api/persons`               | Create a person                                |
| GET    | `/api/persons/:id`          | Get one person                                 |
| PUT    | `/api/persons/:id`          | Partially update a person                       |
| DELETE | `/api/persons/:id`          | Delete a person (detaches them from relatives)  |
| GET    | `/api/persons/:id/tree?up=3&down=3` | Positioned graph (nodes+edges) centered on this person |
| POST   | `/api/relationships`        | Body: `{ type: "parent-child"\|"spouse", personId, relatedId }`. For `parent-child`, `personId` is the parent. |
| DELETE | `/api/relationships`        | Same body shape — removes the link             |

`Person` shape (`src/types/person.ts`):

```ts
{
  id, firstName, lastName, maidenName?, gender,
  birthDate?, deathDate?, birthPlace?, deathPlace?,
  photoUrl?, bio?,
  parentIds: string[],   // up to 2 in normal use
  spouseIds: string[],
  createdAt, updatedAt
}
```

## Building for Windows (Electron)

Because the app has real API routes, it needs a Node server at runtime — it
can't be exported as static HTML. The approach here bundles Next's
**standalone** server output and runs it as a local child process inside
Electron, then points a `BrowserWindow` at `http://localhost:4173`.

```bash
npm install
BUILD_TARGET=electron npm run build   # produces .next/standalone
npm run electron:dev                  # run it in dev
npm run electron:build                # produces an installer in dist-electron/
```

(On Windows/PowerShell, set the env var with `$env:BUILD_TARGET="electron"`
before `npm run build`, or just always build with that flag.)

## Building for Android (Capacitor)

A phone can't run a background Node server the way a desktop can, so the
standard pattern — and the one this project uses — is:

1. Deploy this Next.js app (API routes included) somewhere with a stable
   URL: Vercel, Render, your own VPS, etc.
2. Point `capacitor.config.ts`'s `server.url` at that deployed domain.
3. Wrap it:

```bash
npm install
npx cap init   # first time only, if you want to change ids/name
npx cap add android
npm run cap:sync
npx cap open android   # opens Android Studio to build/run/sign the APK
```

The Android app is then a thin native shell whose WebView loads your live
Next.js app — so the family-tree UI, search, and API all behave exactly as
they do on the web, with full offline-app packaging (icon, splash screen,
back-button handling, etc.) coming from Capacitor.

**Alternative for genuinely offline-first mobile:** if you'd rather the
Android app work with no network at all, that requires a different
architecture — bundling SQLite on-device (e.g. via `@capacitor-community/sqlite`)
and rewriting `src/lib/db.ts` calls into a native plugin bridge instead of
`fetch`. Say the word and I'll wire that variant up.

## Design notes

The visual language is deliberately built around archival record-keeping —
pedigree charts and ledger books — rather than a generic SaaS dashboard
look: parchment surfaces, hairline borders instead of drop shadows, a serif
display face for names, and generation-coded card borders (ink for
ancestors, brass for the focal person, green for descendants) in the tree
view.

## What to customize next

Tell me what you'd like adjusted — e.g.:
- Swap the JSON store for a real database (Postgres via Prisma, SQLite, etc.)
- Add authentication / multi-tree (multiple family trees per account)
- Add photo upload for person records
- GEDCOM import/export
- Different tree layout (radial/fan chart, or a horizontal timeline)
- Additional relationship types (adoptive, step-parent, guardian)
