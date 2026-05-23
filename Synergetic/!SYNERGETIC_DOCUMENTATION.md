# Synergetic — Projekt dokumentáció

> Személyes tudás- és produktivitás-menedzser gráf-alapú felülettel
> *Verzió: 1.0 (final) — 2026. május*

---

## Tartalomjegyzék

1. [Rövid leírás](#1-rövid-leírás)
2. [Használati útmutató](#2-használati-útmutató)
3. [Funkciók](#3-funkciók)
4. [Tech stack](#4-tech-stack)
5. [Architektúra](#5-architektúra)
6. [Adatbázis modell](#6-adatbázis-modell)
7. [Mappa- és fájlstruktúra](#7-mappa--és-fájlstruktúra)

---

## 1. Rövid leírás

A **Synergetic** egy Obsidian-ihletésű, böngészőben futó személyes tudás- és produktivitás-menedzser, amely **jegyzeteket (note), feladatokat (todo)** és **eseményeket (event)** kezel egységes rendszerben. A legfontosabb újdonsága, hogy az adatokat **gráf-alapú vizualizációként** jeleníti meg: a bejegyzések csomópontok, amelyek között szabadon hozzák létre kapcsolatok (linkek), így a felhasználó saját tudásháló-rendszert építhet.

A projekt egy önállóan hostolható, **Docker-konténerizált webalkalmazás** — saját szerveren, helyi gépen vagy belső hálózaton fut. Több felhasználós, regisztráció + session-alapú belépéssel.

**Fő használati területek:**

- Jegyzetek + feladatok + naptári események összekötése egy felületen
- Vizuális tudásháló építés (linkek, csoportok, kategóriák, tagek)
- Heti és napi rutintervezés ismétlődő tevékenységekkel és kivételekkel
- Naptári áttekintés havi / heti / napi nézetben
- Csatolmányok és helyszínek kezelése bejegyzésenként
- Markdown export a bejegyzésekből

**Stílus és nyelv:** a teljes felhasználói felület magyar nyelvű, sötét témájú (glassmorphism akcentusokkal).

---

## 2. Használati útmutató

### 2.1. Telepítés és indítás

**Előfeltételek:** XAMPP --> htdocs mappába helyezve a program gyökerét. VAGY Docker és Docker Compose telepítve.

```bash
# 1) Projekt klónozása
git clone https://github.com/tokesroland/Synergetic.git
cd Synergetic

# 2) Konténerek indítása
docker compose up -d

# 3) (Opcionális) phpMyAdmin elérése fejlesztéshez
docker compose --profile dev up -d

# 4) XAMPP esetén SQL beimportálása
```


Az indulás után az alábbi végpontok érhetők el:

| Szolgáltatás | URL | Megjegyzés |
|---|---|---|
| Webalkalmazás | `http://localhost:8080` | Fő felület |
| phpMyAdmin | `http://localhost:8090` | Csak `--profile dev` esetén |
| MariaDB | `localhost:3306` | Külső kliens számára |

Az adatbázis sémát a `todo.sql` automatikusan importálja az első indításkor. A bejegyzések képei és csatolmányai a `uploads_data` named-volume-ban tárolódnak.

### 2.2. Regisztráció és bejelentkezés

A felület betöltésekor a jobb felső sarokban található **„Bejelentkezés / Regisztráció”** gomb. Új felhasználó email + felhasználónév + jelszó megadásával regisztrál. A bejelentkezés PHP session cookie-val történik, ezért minden további kérés automatikusan azonosítja a felhasználót.

### 2.3. Alapvető munkafolyamatok

**Új bejegyzés létrehozása** — Bal oldali sidebar alján a **„+ Új Elem Létrehozása”** gomb nyitja a modal-t. Választható: **note**, **todo** vagy **event**, hozzá cím, opcionális tartalom, csoport, kategória és (típus-függő) határidő / kezdés-vég / helyszín.

**Bejegyzések összekapcsolása (linkelés)** — A gráf nézetben fölé húzott egér + jobb klikk hozza elő a gyorsművelet menüt → **„Új kapcsolat”** → célcsomópont kiválasztása. Bontáshoz: **„Kapcsolat bontása”** → a törlendő él kiválasztása.

**Csoportba mozgatás** — A gráf csomópontját drag-and-drop-pal a bal oldali sidebar nyíló csoport-paneljébe húzva. A csomópont gráf-koordinátái megmaradnak.

**Keresés** — A képernyő tetején lévő **OmniBar**-t az egér felfele tolásával vagy a pull-tab-re kattintva nyitható ki. Háromféle keresési mód:

- `cím` (üres prefix) — címben keres
- `#tag` (`#` prefix) — tag alapján
- `@tartalom` (`@` prefix) — bejegyzéstörzsben keres

A bal oldali menüből további szűrők kapcsolhatók: típus, tag, kategória, dátum, helyszín, todo státusz, csatolmány. A szűrőhalmazok **preset-ként** elmenthetők és újra betölthetők.

**Nézet váltás** — A bal felső sarokban lévő mode selector-ral:

- **Kapcsolatok (Gráf)** — alap nézet
- **Naptár nézet** — havi / heti / napi
- **Rutin tervező** — heti / napi
- **Csoportok** — táblázatos csoport-kezelés
- **Archívum** — archivált todo-k

**Bejegyzés részletek** — A gráfban dupla kattintás vagy a sidebar listából egy elem nyitja a **Details View**-t. Itt szerkeszthető a cím, tartalom (rich-text WYSIWYG), kategória, tagek, csatolmányok, valamint a típus-specifikus mezők (todo: státusz / tervezett kezdés / határidő; event: kezdés-vég / egész napos / helyszín). A jobb felső sarokban lévő **„Exportálás .md”** gombbal a bejegyzés Markdown fájlba menthető.

### 2.4. Companion eszköz: `Synergetic.Tools`

A főprojekt mellett van egy különálló **C# .NET 8** konzol/háttér-alkalmazás, amely az alábbiakat végzi (a fő adatbázishoz csatlakozva):

- **Notification engine** — Windows toast értesítések közelgő todo-k és event-ek esetére
- **Database cleaner** — régi / árva rekordok takarítása
- **Markdown importer** — egy figyelt mappába másolt `.md` fájlok automatikus beolvasása új jegyzetekként

---

## 3. Funkciók

### 3.1. Bejegyzéskezelés

Három bejegyzés-típus létezik, közös sémával + típus-specifikus részletekkel:

| Típus | Specifikus mezők |
|---|---|
| **note** (jegyzet) | csak közös mezők |
| **todo** (feladat) | státusz (active / completed / archived), tervezett kezdés, határidő |
| **event** (esemény) | kezdés, vége, egész napos flag, helyszín |

Minden bejegyzéshez tartozhat: cím, gazdag szöveges (HTML) tartalom, csoport, kategória, tetszőleges számú tag, csatolmány, és gráf-pozíció (x, y koordináták).

**Műveletek:** létrehozás, szerkesztés, törlés, áthelyezés másik csoportba (egyenkénti és tömeges), kategória/tag/helyszín hozzárendelés és levétel, csatolmány feltöltése és törlése, gráfpozíció elmentése (drag után), Markdown exportálás.

### 3.2. Gráf nézet (kapcsolatok)

A bejegyzések kör-csomópontokként jelennek meg HTML canvas-en, típus szerint színezve. Funkciók:

- Pan (bal egérgomb húzás üres területen) és zoom (egérgörgő, min 0.15× — max 5×)
- Csomópont mozgatása (drag), pozíció auto-mentés a háttérben
- **Quick menu** csomópontra hover/klikkre: új kapcsolat, kapcsolat bontása, szerkesztés, törlés, kategória / tag módosítása
- **Linking és unlinking mode** — vizuális kapcsolat-rajzolás és törlés
- Drag-and-drop a sidebar csoport-paneljébe (group_id változtatás)
- **Keresés-highlight** — aktív keresésnél a nem találat csomópontok dimm-elődnek, a kapcsolataik kiemelve maradnak
- Zoom-badge megjeleníti a jelenlegi zoom százalékát rövid időre

### 3.3. Naptár nézet

Három alnézet:

- **Havi nézet** — Samsung Calendar stílusú, többnapos event-ek folyamatos span-bárként végighúzva több cellán (CSS grid + subgrid overlay technikával). Cella-kattintásra a jobb agendában megjelenik az adott napi lista. A havi quick-add inline form-ot nyit az agendában.
- **Heti nézet** — 7 oszlopos, minden nap saját mini-listája, jobb alsó sarokban `+` gomb az adott nap gyors hozzáadásához.
- **Napi nézet** — Google Calendar stílusú időblokkos felület: felső "all-day" sáv (egész napos event-ek) + todo szekció + óra-rácsos timeline a időponttal rendelkező event-eknek, "most" piros vonallal.

Közös: dátumnavigáció (előző/következő, ma), "vissza a gráfhoz" gomb, multi-day event-ek típus-szín szerinti megjelenítése.

### 3.4. Rutin tervező

Ismétlődő, hét napjához kötött tevékenységek tervezése (rutin = "minden hétfőn 8:00–9:00 között futás").

- **Heti nézet** — 7 nap (Hé–Va) oszlopkártyákban, alatta összesített idővonal (3:00–23:00) színes sávokkal, tooltip-pel
- **Napi nézet** — Google Calendar-szerű egyetlen nap, részletes időbeosztás
- **Egyszerre több napra létrehozás** — egy rutint több napra is felvehet ugyanazokkal a paraméterekkel
- **Completion tracking** — naponta egyenként pipálható, hogy "ma elvégezve"
- **Kivételkezelés** (routine_exceptions) — átmeneti módosítás N alkalmazásra:
  - `time` mód: új időpont a következő N alkalomra
  - `day` mód: áthúzás másik napra
  - `skip` mód: lemondás N alkalmazásra
  - A kivételek számlálója minden teljesítésnél csökken; lejárt kivételek auto-deaktiválhatóak
- **Alsó sáv** — összesített nézet az összes rutinról + a kitöltetlen ("szabad") idő mennyiség

### 3.5. Csoportok nézet

Kétoszlopos elrendezés: balra a csoportlista (kártyák szín-pötty + elem-számláló), jobbra a kiválasztott csoport bejegyzései.

- Új csoport létrehozása (név, leírás, szín)
- Csoport szerkesztése (modal)
- Csoport törlése — az elemei automatikusan a "Csoportosítatlan" csoportba kerülnek
- **Tömeges áthelyezés** — entry-kártyán hover-rel megjelenő checkbox-okkal több bejegyzés kijelölhető, majd egy gombnyomással másik csoportba mozgatható

### 3.6. Archívum nézet

Az `archived` státuszú todo-k listája egy helyen. Funkció:

- Az összes archivált todo listája cím, tartalom-előnézet, kategória, tagek, csatolmány-számlálóval
- **Visszaállítás** gomb — egy archivált todo újra aktív állapotba kerül, és visszajelenik a gráfban / főnézetekben

### 3.7. OmniBar (keresés + szűrők)

A képernyő tetején lebegő üveg-hatású keresőpanel, ami a top-zónába tolt egérnél magától megjelenik (auto-show; kivételzónák: hamburger menü és mode selector).

Funkciói:

- 3 keresési mód (cím, tag `#`, tartalom `@`) — inline token-megjelenítéssel
- Bal oldali ikon-menü: típus / tag / kategória / dátum / helyszín / todo státusz / csatolmány szűrők
- Aktív szűrők chip-listájaként megjelennek, egyenként eltávolíthatók
- **Preset rendszer** — szűrőhalmaz név alapján menthető localStorage-be, később egy kattintással visszatölthető
- Keresési eredmény → a gráf nézetben a megfelelő csomópontok és kapcsolatok kiemelése, a többi dimm-elése

### 3.8. Authentication

- Email + felhasználónév + jelszó alapú regisztráció (PHP `password_hash` BCRYPT)
- Session-alapú belépés (PHP `$_SESSION`, cookie a kliensen)
- `auth_me` végpont megadja az aktuális usert
- Logout: a session törlése
- Az ApiService minden hívásnál a `credentials: 'include'` opciót használja, hogy a cookie utazzon

### 3.9. Markdown exportálás

A Details View-ban a jobb felső **„Exportálás .md”** gomb a bejegyzést Markdown formátumba alakítja:

- A cím `# H1` lesz
- Metaadatok (kategória, tagek, típus, helyszín, állapot, határidő) felsorolásként
- A HTML tartalom plain szöveggé konvertálódik, `<br>` → newline, `<li>` → `- `, `<b>` → `**...**`, `<i>` → `_..._`
- Letöltés `[cím].md` néven (a fájlnévben tiltott karakterek `_`-ra cserélve)

---

## 4. Tech stack

### 4.1. Frontend

| Réteg | Eszköz | Megjegyzés |
|---|---|---|
| Framework | **Vue 3** (Options API) | CDN-ről `vue.global.prod.js` |
| Routing | **Vue Router 4** (hash mode) | CDN-ről, `createWebHashHistory` |
| State | Saját reaktív Store (`Vue.reactive`) | Központi `Store` objektum |
| Stílus | Vanilla CSS (custom property design tokens) | `styles/vue-app.css` |
| Build | **Nincs build lépés** | Vanilla `<script>` tagek `index.html`-ben |
| Renderelés | HTML5 Canvas (gráf), CSS grid/subgrid (naptár) |  |

### 4.2. Backend

| Réteg | Eszköz |
|---|---|
| Nyelv / runtime | **PHP 8.2** |
| Web szerver | **Apache 2.4** (`mod_rewrite` engedélyezve) |
| DB-réteg | PDO (MySQL driver) |
| Session | Beépített PHP `session_*` |
| Hash | `password_hash` / `password_verify` (BCRYPT) |

### 4.3. Adatbázis

| | |
|---|---|
| Motor | **MariaDB 10.11** |
| Charset / collation | utf8mb4 / utf8mb4_general_ci |
| Engine | InnoDB (FK-támogatás miatt) |
| Init | `todo.sql` automatikus betöltés első konténerinduláskor |

### 4.4. Infrastruktúra

| | |
|---|---|
| Konténerezés | **Docker + Docker Compose** |
| 3 service | `app` (PHP+Apache), `db` (MariaDB), `phpmyadmin` (opcionális, `dev` profil) |
| Volume | `db_data` (DB perzisztencia), `uploads_data` (csatolmányok), bind mount a forráshoz fejlesztéshez |
| Hálózat | `synergetic_net` bridge |
| Healthcheck | `db` szervizen `mariadb` CLI-vel (nem `healthcheck.sh`!) |

### 4.5. Companion: Synergetic.Tools

| | |
|---|---|
| Nyelv | **C# .NET 8** |
| Modulok | Notification engine (Windows Toast), Database cleaner, Markdown file watcher/importer |
| Adatbázis hozzáférés | Közös MariaDB-hez kapcsolódik |

### 4.6. Verziókövetés

GitHub: **tokesroland/Synergetic**

---

## 5. Architektúra

### 5.1. Magas szintű áttekintés

```
┌─────────────────────────────────────────────────────────────┐
│                       BÖNGÉSZŐ                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Vue 3 SPA (index.html + js/components/*)             │  │
│  │  ├─ Store (Vue.reactive)                              │  │
│  │  ├─ Router (hash mode)                                │  │
│  │  └─ ApiService (fetch wrapper, credentials:'include') │  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP (JSON / multipart)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  APACHE + PHP 8.2 (Docker)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  api.php  ── központi router (action/method alapján)  │  │
│  │     │                                                 │  │
│  │     ├─ AuthController     (regiszt / login / me)      │  │
│  │     ├─ EntryController    (CRUD, csoportok, tagek)    │  │
│  │     ├─ RoutineController  (rutin + kivételek)         │  │
│  │     └─ SearchController   (multikritériumos keresés)  │  │
│  │                                                       │  │
│  │  config.php  ──  DB credentials környezeti változókból│  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ PDO
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  MariaDB 10.11 (Docker)                     │
│  todo  adatbázis  (entries, todo_details, event_details,    │
│  groups, categories, tags, entry_links, entry_tags,         │
│  attachments, routine_items, routine_exceptions, …)         │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ közvetlen kapcsolat (külső)
                            │
              ┌─────────────┴──────────────┐
              │   Synergetic.Tools (C#)    │
              │ Notification / Cleaner /   │
              │   Markdown importer        │
              └────────────────────────────┘
```

### 5.2. Frontend felépítés

- **Single Page Application** — egyetlen `index.html`, benne minden komponens `<script type="text/x-template">` blokkként inline. A komponens-objektumok külön `js/components/*.js` fájlokban.
- **Router** — hash mode (`#/calendar`, `#/details/42`), 6 named route.
- **Store** — globális `Vue.reactive` objektum (`js/store.js`), minden komponens innen olvas. Tartalmazza: `groups`, `nodes`, `categories`, `tags`, `locations`, `currentUser`, `searchActive` és kapcsolódó keresési state.
- **ApiService** singleton — `js/api.js`, minden backend kommunikációt egy helyen kezel (pl. `ApiService.getCalendarEntries()`, sosem nyers `api.get(...)` string). A `credentials: 'include'` minden kérésen automatikus.
- **Komponens-modell** — Options API; minden nézet (`GraphView`, `CalendarView`, `RoutineView`, `GroupsView`, `ArchiveView`, `DetailsView`) önálló komponens. A `TopBar`, `AppSidebar`, `OmniBar`, `EntryModal`, `AuthModal`, `AuthButton` univerzális.

### 5.3. Backend felépítés

- **Központi router** (`api.php`) — egyetlen belépési pont. A HTTP metódus (GET / POST / PUT / DELETE) és az `action` query/body paraméter alapján a megfelelő Controller metódusra delegál.
- **MVC-szerű** — nincs külön Model réteg; a Controllerek PDO-val közvetlenül beszélnek az adatbázissal, de jól strukturáltan (egyetlen `pdo` property, hard-kódolt SQL-ek, csak prepared statement).
- **4 Controller:**
  - `AuthController` — `register`, `login`, `logout`, `me`
  - `EntryController` — bejegyzés CRUD + csoport / kategória / tag / helyszín / link / csatolmány / pozíció
  - `RoutineController` — `routine_items` CRUD + `routine_exceptions` CRUD + completion toggle + kivétel feloldó algoritmus
  - `SearchController` — komplex multi-filter keresés (cím, tartalom, típus, tag-ID-k, kategória-ID-k, dátum range/típus, helyszín-ID-k, todo status, csatolmány-MIME, csoport-ID-k)

- **CORS + session** — az `api.php` az `Origin` header alapján konkrét origint enged (nem `*`), `Access-Control-Allow-Credentials: true`, így a session cookie működik cross-origin esetén is.

### 5.4. Adatfolyam példa: új bejegyzés létrehozása

1. **UI** — `EntryModal.js` form submit → ApiService.`createEntry(data)`
2. **ApiService** — POST `api.php`, body: `{action: "create_entry", type, title, content, group_id, ...}`
3. **api.php** — `POST` ág, `$action = 'create_entry'`, default ág → `$entryCtrl->create($input)`
4. **EntryController::create** — INSERT `entries`, ha `todo` → INSERT `todo_details`, ha `event` → INSERT `event_details`, visszaadja az új ID-t
5. **Frontend** — sikeres válasz után `Store.loadCurrentGroup()` → a friss bejegyzés megjelenik a gráfban

---

## 6. Adatbázis modell

Adatbázis neve: **`todo`**. 14 tábla, kapcsolatok ON DELETE CASCADE / SET NULL stratégiával.

### 6.1. Entitás-Kapcsolat diagram (szöveges)

```
users (1)
   │  (a 'tulajdonos' jelenleg single-user, FK nincs)
   ▼
groups (1) ◄────┐
   │            │
   ├── 1:N ────►│
   ▼            │
entries (N) ────┘
   ├─ 1:1 ──► todo_details        (típus-specifikus)
   ├─ 1:1 ──► event_details ──► locations
   ├─ N:1 ──► categories
   ├─ N:M ──► entry_tags ──► tags
   ├─ N:N ──► entry_links (self-relation, kapcsolatok)
   ├─ 1:N ──► attachments
   ├─ 1:N ──► recurrences         (csak séma; nem aktívan használt)
   └─ 1:N ──► exceptions          (csak séma; nem aktívan használt)

routine_items (függetlenül az entries-től)
   ├─ N:1 ──► categories
   ├─ 1:N ──► routine_completions
   └─ 1:N ──► routine_exceptions
```

### 6.2. Táblák részletesen

#### `users` — felhasználók
| Oszlop | Típus | Megjegyzés |
|---|---|---|
| `id` | INT, PK, AI | |
| `email` | VARCHAR(190), UNIQUE | |
| `username` | VARCHAR(60), UNIQUE | |
| `password_hash` | VARCHAR(255) | BCRYPT |
| `created_at` | TIMESTAMP | DEFAULT current_timestamp |

#### `groups` — bejegyzés-csoportok
| Oszlop | Típus | Megjegyzés |
|---|---|---|
| `id` | INT, PK, AI | |
| `name` | VARCHAR(100) | |
| `description` | TEXT | |
| `color_hex` | VARCHAR(7) | DEFAULT `#5c6bc0` |
| `created_at` | TIMESTAMP | |

A `Csoportosítatlan` (id=1) csoport mindig létezik; csoport törlésekor az elemek ide kerülnek.

#### `entries` — közös bejegyzés-séma
| Oszlop | Típus | Megjegyzés |
|---|---|---|
| `id` | INT, PK, AI | |
| `group_id` | INT, FK → groups(id) ON DELETE CASCADE | |
| `category_id` | INT NULL, FK → categories(id) ON DELETE SET NULL | |
| `type` | ENUM('note', 'todo', 'event') | |
| `title` | VARCHAR(255) | |
| `pos_x`, `pos_y` | FLOAT | gráf-pozíció (DEFAULT 400 / 300) |
| `content` | LONGTEXT | HTML (rich-text WYSIWYG-ből) |
| `created_at`, `updated_at` | TIMESTAMP | auto |
| `notified_at` | DATETIME NULL | a Synergetic.Tools notification-engine használja |

#### `todo_details` — todo-specifikus mezők
| Oszlop | Típus | Megjegyzés |
|---|---|---|
| `entry_id` | INT, PK, FK → entries(id) | 1:1 |
| `status` | ENUM('active', 'completed', 'archived') | DEFAULT 'active' |
| `planned_start` | DATETIME NULL | |
| `deadline` | DATETIME NULL | |

#### `event_details` — event-specifikus mezők
| Oszlop | Típus | Megjegyzés |
|---|---|---|
| `entry_id` | INT, PK, FK → entries(id) | 1:1 |
| `start_datetime` | DATETIME | |
| `end_datetime` | DATETIME NULL | |
| `is_all_day` | TINYINT(1) | 0/1 |
| `location_id` | INT NULL, FK → locations(id) | |

#### `categories`, `tags`, `locations` — címkék
Mindhárom hasonló: `id` PK, `name`, `color_hex`. A `tags.name` UNIQUE. A `categories` tartalmaz egy opcionális `icon_name` mezőt is.

#### `entry_tags` — entries N:M tags
| Oszlop | Típus |
|---|---|
| `entry_id` | INT (PK component) |
| `tag_id` | INT (PK component) |

#### `entry_links` — entries N:M entries (irányítatlan)
| Oszlop | Típus |
|---|---|
| `source_id` | INT (PK component) |
| `target_id` | INT (PK component) |

A backend `createLink` mindkét irányba ellenőrzi a duplikációt, így a kapcsolat logikailag irányítatlan.

#### `attachments` — csatolmányok
| Oszlop | Típus | Megjegyzés |
|---|---|---|
| `id` | INT, PK, AI | |
| `entry_id` | INT, FK → entries(id) ON DELETE CASCADE | |
| `file_path` | VARCHAR(255) | pl. `uploads/attachments/6/abc123.png` |
| `file_type` | VARCHAR(50) | MIME (`image/png`, `application/pdf` …) |
| `original_name` | VARCHAR(255) | eredeti fájlnév |
| `uploaded_at` | TIMESTAMP | |

#### `routine_items` — heti ismétlődő rutinok
| Oszlop | Típus | Megjegyzés |
|---|---|---|
| `id` | INT, PK, AI | |
| `title` | VARCHAR(255) | |
| `type` | ENUM('todo', 'event') | |
| `category_id` | INT NULL | |
| `day_of_week` | TINYINT(1) | 1=Hétfő … 7=Vasárnap |
| `start_time`, `end_time` | TIME | |
| `color_hex` | VARCHAR(7) | |

#### `routine_completions` — rutin elvégzések
| Oszlop | Típus | Megjegyzés |
|---|---|---|
| `id` | INT, PK, AI | |
| `routine_item_id` | INT | |
| `completed_date` | DATE | |
| `completed_at` | TIMESTAMP | |

UNIQUE (routine_item_id, completed_date) — egy rutint naponta egyszer lehet bepipálni.

#### `routine_exceptions` — kivétel-kezelés
| Oszlop | Típus | Megjegyzés |
|---|---|---|
| `id` | INT, PK, AI | |
| `routine_item_id` | INT | |
| `created_on` | DATE | innen számítva érvényes |
| `occurrences` | INT | hány alkalomra szól |
| `remaining` | INT | hányból van még hátra (csökken minden használatnál) |
| `is_skip` | TINYINT | 1 = ezeket az alkalmakat lemondja |
| `new_day_of_week` | TINYINT NULL | másik napra húzás |
| `new_start_time`, `new_end_time` | TIME NULL | új időpont |
| `is_active` | TINYINT | deaktivált, ha 0 (audit) |
| `valid_until` | DATE NULL | lejárati dátum |

#### `recurrences`, `exceptions` (entry-szintű)
Sémában léteznek, de aktívan nem használt funkciók (ismétlődő entry-k a TODO listán szerepelnek mint jövőbeli feature).

---

## 7. Mappa- és fájlstruktúra

```
Synergetic/
│
├─ docker-compose.yml        Docker service-ek (app, db, phpmyadmin)
├─ Dockerfile                PHP 8.2 + Apache, PDO MySQL, mod_rewrite
├─ .dockerignore             git, IDE config kizárva a build kontextusból
├─ todo.sql                  DB séma + seed adat, auto-import konténerinduláskor
├─ config.php                DB credentials (env változókból olvas)
├─ TODO                      Élő prioritás- és bug-lista (#=kész, @=javítandó)
├─ INDEX_HTML_PATCH.md       Az index.html template-blokkjainak inkrementális patch-leírásai
│
├─ index.html                A teljes SPA shell + minden komponens template-je
│                            (`<script type="text/x-template">`)
│
├─ api.php                   Központi backend router — action+method → Controller dispatch
├─ AuthController.php        Regisztráció, login, logout, /me
├─ EntryController.php       Entry CRUD, csoport / kategória / tag / link / csatolmány / pozíció
├─ RoutineController.php     Rutin CRUD, kivételek (routine_exceptions), feloldó algoritmus
├─ SearchController.php      Komplex multi-filter keresés (titel/content/tag/cat/date/location/...)
├─ test_tags.php             DEV debug: entry-tag reláció vizsgálatára
│
├─ js/
│  ├─ api.js                 ApiService singleton — fetch wrapper, credentials:'include'
│  ├─ store.js               Vue.reactive Store: nodes, groups, search state, auth
│  ├─ router.js              Vue Router 4 (hash mode), 6 route
│  ├─ app.js                 Vue alkalmazás bootstrap, root komponens
│  │
│  └─ components/
│     ├─ AppSidebar.js       Bal oldali entry-lista, csoport-switcher, "+ Új" gomb
│     ├─ TopBar.js           Filterek (todo / event / note toggle) + mode selector
│     ├─ OmniBar.js          Lebegő keresőpanel auto-show-val + preset rendszer
│     ├─ GraphView.js        Canvas-alapú gráf-renderelő, pan/zoom, quick menu, drag
│     ├─ CalendarView.js     Havi / heti / napi nézet, többnapos span overlay
│     ├─ DetailsView.js      Entry részletek, WYSIWYG editor, MD export, csatolmány UI
│     ├─ RoutineView.js      Heti és napi rutintervező, kivétel-kezelés, completion
│     ├─ GroupsView.js       Csoport-kezelő nézet, tömeges áthelyezés
│     ├─ ArchiveView.js      Archivált todo-k listája + visszaállítás
│     ├─ EntryModal.js       Új bejegyzés létrehozó modal (note / todo / event form)
│     ├─ AuthModal.js        Bejelentkezés / regisztráció modal
│     └─ AuthButton.js       Jobb felső user-state + login/logout gomb
│
├─ styles/
│  └─ vue-app.css            Komplet stíluskönyvtár: design tokenek, layout, komponens-specifikus
│                            (sötét téma, glassmorphism, reszponzív tabletre + mobilra)
│
└─ uploads/
   └─ attachments/
      └─ [entry_id]/         A bejegyzés-ID szerint partícionálva
         └─ [hash].[ext]     SHA-egyedi névvel mentett fájlok
```

### 7.1. Fontosabb fájlok és felelősségük

| Fájl | Felelősség |
|---|---|
| **`docker-compose.yml`** | 3 service (app, db, phpmyadmin) orchestrálása, volume-ok, healthcheck, network |
| **`Dockerfile`** | PHP 8.2 + Apache build (PDO + mod_rewrite engedélyezés, uploads jogosultságok) |
| **`todo.sql`** | A teljes adatbázisséma + példa-adatok, auto-import az első DB indításnál |
| **`config.php`** | DB credential-ek környezeti változókból (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`) |
| **`api.php`** | Egyetlen belépési pont a backend felé; metódus + action alapján Controller-re delegál; CORS-fejlécek, session indítás, JSON I/O |
| **`AuthController.php`** | `register`, `login`, `logout`, `me` — BCRYPT, PHP session |
| **`EntryController.php`** | A legtöbb művelet: entry CRUD, csoport CRUD, kategória / tag / helyszín kezelés, kapcsolat, csatolmány feltöltés, pozíció update, tömeges műveletek |
| **`RoutineController.php`** | Rutin elemek + kivételek + completion. A `getRoutineAll($forDate, $weekStart)` paraméterekkel kétféleképp ad vissza: konkrét napra feloldva (kivételek alkalmazva), vagy nyers heti szerkesztéshez |
| **`SearchController.php`** | Multi-filter keresés — dinamikus SQL építés, tag/cat/group AND-szemantika, attachment MIME-szerinti szűrés |
| **`index.html`** | A teljes UI shell: Vue mount target + minden komponens template-je `<script type="text/x-template" id="tpl-...">` blokkokban |
| **`js/api.js`** | Az ApiService singleton — minden backend hívás centralizált helyen, automatikus `credentials: 'include'` |
| **`js/store.js`** | Globális reaktív Store: `nodes`, `groups`, `categories`, `tags`, `locations`, `currentUser`, keresési state, highlighted node-ok |
| **`js/router.js`** | Vue Router 4 hash mode konfiguráció, 6 named route (graph, calendar, routine, groups, archive, details) |
| **`js/components/GraphView.js`** | Canvas gráf renderelő — pan/zoom, drag, kapcsolat-rajzolás, quick-menu, search-highlight, drag-to-group |
| **`js/components/CalendarView.js`** | Havi / heti / napi naptár, többnapos event-span (subgrid overlay), inline quick-add |
| **`js/components/RoutineView.js`** | Heti és napi rutin-tervező + kivételkezelés (time/day/skip mode), completion tracking |
| **`js/components/DetailsView.js`** | Entry részletek WYSIWYG-vel, contenteditable input-listener-rel a sync-hez, MD export, kategória/tag/helyszín picker, todo state, event datetime |
| **`js/components/OmniBar.js`** | Top-zóna lebegő kereső + szűrőpanel, preset mentés/betöltés localStorage-ba |
| **`styles/vue-app.css`** | Az egész app stíluskönyvtára: CSS custom property design tokenek (`--bg-item`, `--accent-muted`, `--node-task` stb.), reszponzív breakpoint-ok 1024px és 480px |
| **`uploads/attachments/[id]/`** | Csatolmányok partícionált tárolása entry-ID szerint, hash-elt fájlnévvel a Docker `uploads_data` volume-on perzisztálva |

---

*Dokumentáció vége. — Projekt repó: `tokesroland/Synergetic`*
