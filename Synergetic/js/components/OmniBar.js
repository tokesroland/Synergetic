/**
 * OmniBar v2 – Összetett kereső és szűrő
 * Javítások:
 *  - Opacity animáció egyidejű a translateY-vel
 *  - Kategória szűrő hozzáadva
 *  - Pull-tab trigger (középső vonal) a hamburger/szelektor helyett
 *  - Highlight-olt node-ok kapcsolatai is kitűnnek
 *  - Auto-show: ha az egér a képernyő teteje felé megy (középső zóna),
 *    előugrik az omnibar; ha leveszi az egeret róla, visszamegy
 *  - ÚJ: Mentett szűrők (preset-ek) localStorage-ban + választó dropdown az
 *        "Aktív szűrők" felirat helyén
 *  - ÚJ: Token-sor görgethető (egér-kerék → vízszintes scroll)
 */
const OmniBar = {
    template: '#tpl-omnibar',

    data() {
        return {
            visible: false,
            panelOpen: false,
            searchText: '',
            activeView: 'default',
            tagSearch: '',
            categorySearch: '',
            locationSearch: '',
            groupSearch: '',

            // Dátum szűrő állapot
            dateType: 'created_at',
            dateFrom: '',
            dateTo: '',
            dateOrder: 'desc',
            dateSliderDays: 30,

            // Helyszín multiselect
            selectedLocationIds: [],

            // Csoport multiselect
            selectedGroupIds: [],

            // Entry type toggles
            typeFilters: {
                todo: false,
                event: false,
                note: false
            },

            // ── ÚJ: Mentett szűrő halmazok ──
            savedFilters: [],               // [{ id, name, color, filters: [...] }]
            savedFiltersStorageKey: 'synergetic_saved_filters',
            presetMenuOpen: false,          // dropdown kinyitva?
            presetSearch: '',               // kereső a dropdown-ban
            activePresetId: null,           // éppen betöltött preset azonosítója
        };
    },

    computed: {
        store() { return Store; },
        activeFilters() { return Store.searchFilters; },
        hasFilters() { return Store.searchFilters.length > 0; },

        filteredTags() {
            const q = this.tagSearch.toLowerCase();
            const tags = this.store.tags || [];  // Közvetlenül a Store-ból
            if (!q) return tags;
            return tags.filter(t => t.name.toLowerCase().includes(q));
        },

        filteredCategories() {
            const q = this.categorySearch.toLowerCase();
            const cats = Store.categories || [];
            if (!q) return cats;
            return cats.filter(c => c.name.toLowerCase().includes(q));
        },

        filteredLocations() {
            const q = this.locationSearch.toLowerCase();
            const locs = Store.locations || [];
            if (!q) return locs;
            return locs.filter(l => l.name.toLowerCase().includes(q));
        },

        filteredGroups() {
            const q = this.groupSearch.toLowerCase();
            const groups = Store.groups || [];
            if (!q) return groups;
            return groups.filter(g => g.name.toLowerCase().includes(q));
        },

        searchMode() {
            const t = this.searchText || '';
            if (t.startsWith('#')) return 'tag';
            if (t.startsWith('@')) return 'content';
            return 'title';
        },

        searchQuery() {
            const t = this.searchText || '';
            if (t.startsWith('#') || t.startsWith('@')) return t.slice(1).trim();
            return t.trim();
        },

        dateSliderLabel() {
            if (this.dateSliderDays <= 1)   return 'Utolsó nap';
            if (this.dateSliderDays <= 7)   return `Utolsó ${this.dateSliderDays} nap`;
            if (this.dateSliderDays <= 31)  return `Utolsó ${this.dateSliderDays} nap`;
            if (this.dateSliderDays <= 90)  return `Utolsó ${this.dateSliderDays} nap`;
            if (this.dateSliderDays <= 365) return `Elmúlt ~${Math.round(this.dateSliderDays / 30)} hónap`;
            return `Elmúlt ~${Math.round(this.dateSliderDays / 30)} hónap`;
        },

        // ── ÚJ: dropdown felirat ──
        presetLabel() {
            if (this.activePresetId) {
                const p = this.savedFilters.find(x => x.id === this.activePresetId);
                if (p) return p.name;
            }
            return 'Aktív szűrők';
        },

        // Szűrt mentett szűrők a dropdown-hoz
        filteredSavedFilters() {
            const q = (this.presetSearch || '').toLowerCase();
            if (!q) return this.savedFilters;
            return this.savedFilters.filter(p => p.name.toLowerCase().includes(q));
        },

        // Menthető-e az aktuális szűrés? (van legalább 1 aktív szűrő, és a keresés mező
        // értelmes preset-nevet tartalmaz)
        canSavePreset() {
            return this.hasFilters && this.presetSearch.trim().length > 0;
        },

        // ── HELYREÁLLÍTVA: Bal oldali menü elemei ──
        // Ezt a template a `<button v-for="item in menuItems" ...>` részben használja.
        menuItems() {
            return [
                { id: 'types',       icon: '🧩', label: 'Bejegyzés típusa' },
                { id: 'tags',        icon: '🏷️', label: 'Tagek' },
                { id: 'categories',  icon: '📁', label: 'Kategóriák' },
                { id: 'dates',       icon: '📅', label: 'Dátum / Időrend' },
                { id: 'locations',   icon: '📍', label: 'Helyszínek' },
                { id: 'todo-status', icon: '✅', label: 'TODO státusz' },
                { id: 'attachments', icon: '📎', label: 'Csatolmányok' },
                { id: 'groups',      icon: '👥', label: 'Csoportok' },
                { id: 'recurrence',  icon: '🔁', label: 'Ismétlődés' },
            ];
        },

        // Ezt a template a `<div v-if="activeView === 'tag-suggestions'">` blokkban használja.
        tagSuggestions() {
            const q = this.searchQuery.toLowerCase();
            const tags = this.store.tags || [];
            if (!q) return tags.slice(0, 20);
            return tags.filter(t => t.name.toLowerCase().includes(q)).slice(0, 20);
        },
    },

    watch: {
        searchText(val) {
            if (val.startsWith('#')) {
                this.activeView = 'tag-suggestions';
                this.openPanel();
            } else if (val.startsWith('@')) {
                this.activeView = 'content-suggestions';
                this.openPanel();
            } else if (val.length > 0) {
                this.activeView = 'title-suggestions';
                this.openPanel();
            }
        },
        'typeFilters.todo'() { this.applyTypeFilters(); },
        'typeFilters.event'() { this.applyTypeFilters(); },
        'typeFilters.note'() { this.applyTypeFilters(); },

        // Ha a felhasználó kézzel módosít a szűrőkön (hozzáad/töröl), a preset címke
        // eltűnik, mert már nem egyezik az elmentett állapottal.
        'store.searchFilters': {
            deep: true,
            handler() {
                if (!this.activePresetId) return;
                const p = this.savedFilters.find(x => x.id === this.activePresetId);
                if (!p) { this.activePresetId = null; return; }
                if (!this._filtersEqual(p.filters, Store.searchFilters)) {
                    this.activePresetId = null;
                }
            }
        },
    },

    async mounted() {
        // ── Mentett szűrők betöltése ──
        this._loadSavedFilters();

        // Kívülre kattintás → panel bezár, ha nincs aktív szűrő, omnibar is elmegy
        this._outsideClick = (e) => {
            const el = this.$el;
            const tab = document.getElementById('omnibar-pull-tab');
            if (el && !el.contains(e.target) && tab && !tab.contains(e.target)) {
                this.panelOpen = false;
                this.presetMenuOpen = false;
                if (!this.hasFilters && !this.searchText) {
                    this.visible = false;
                }
            }
        };
        document.addEventListener('mousedown', this._outsideClick);

        // ── Auto-show hover logika ──
        this._hideTimer = null;

        // Az egér elmegy az omnibar-ról → késleltetett elrejtés
        this.$el.addEventListener('mouseleave', () => {
            if (this.hasFilters || this.searchText) return; // szűrő aktív → marad
            this._scheduleHide();
        });

        // Az egér visszajön az omnibar-ra → mégse rejtjük el
        this.$el.addEventListener('mouseenter', () => {
            clearTimeout(this._hideTimer);
        });

        // document mousemove: képernyő teteje középső zónája triggereli
        this._onMouseMove = (e) => {
            const x = e.clientX;
            const y = e.clientY;
            const w = window.innerWidth;

            // Hamburger zóna kizárása (bal felső sarok ~62×62px)
            const overHamburger = (x < 62 && y < 62);

            // Szelektor zóna kizárása (jobb felső sarok ~170×50px)
            const overSelector = (x > w - 170 && y < 50);

            // Trigger: felső 55px, középső zóna
            if (y < 18 && !overHamburger && !overSelector) {
                clearTimeout(this._hideTimer);
                if (!this.visible) {
                    this.visible = true;
                }
            }
        };

        document.addEventListener('mousemove', this._onMouseMove);

        // Adatok betöltése – VÁRUNK ezekre az aszinkron hívásokra
        await Promise.all([
            Store.loadTags(),
            Store.loadLocations(),
            Store.loadGroups(),
            Store.loadCategories(),
        ]);
    },

    beforeUnmount() {
        document.removeEventListener('mousedown', this._outsideClick);
        document.removeEventListener('mousemove', this._onMouseMove);
        clearTimeout(this._hideTimer);
    },

    methods: {
        _scheduleHide() {
            clearTimeout(this._hideTimer);
            this._hideTimer = setTimeout(() => {
                this.visible = false;
                this.panelOpen = false;
                this.presetMenuOpen = false;
            }, 350);
        },

        toggleVisible() {
            this.visible = !this.visible;
            if (this.visible) {
                this.$nextTick(() => {
                    if (this.$refs.searchInput) this.$refs.searchInput.focus();
                });
            } else {
                this.panelOpen = false;
                this.presetMenuOpen = false;
            }
        },

        openPanel() {
            this.panelOpen = true;
        },

        switchView(viewId) {
            this.activeView = viewId;
            this.openPanel();
        },

        toggleType(type) {
            this.typeFilters[type] = !this.typeFilters[type];
        },

        applyTypeFilters() {
            Store.searchFilters = Store.searchFilters.filter(f => f.key !== 'Típus');
            if (this.typeFilters.todo) {
                Store.addSearchFilter({ key: 'Típus', value: 'Feladat', data: { type: 'todo' } });
            }
            if (this.typeFilters.event) {
                Store.addSearchFilter({ key: 'Típus', value: 'Esemény', data: { type: 'event' } });
            }
            if (this.typeFilters.note) {
                Store.addSearchFilter({ key: 'Típus', value: 'Jegyzet', data: { type: 'note' } });
            }
        },

        addToken(key, value, data = {}) {
            Store.addSearchFilter({ key, value, data });
            this.searchText = '';
            this.activeView = 'default';
        },

        removeToken(index) {
            const removed = Store.searchFilters[index];
            if (removed && removed.key === 'Típus' && removed.data?.type) {
                this.typeFilters[removed.data.type] = false;
            }
            Store.removeSearchFilter(index);
        },

        clearAll() {
            this.typeFilters = { todo: false, event: false, note: false };
            Store.clearAllFilters();
            this.searchText = '';
            this.activeView = 'default';
            this.activePresetId = null;
        },

        async submitSearch() {
            const val = this.searchText.trim();
            if (!val) return;

            if (this.searchMode === 'tag') {
                const q = this.searchQuery;
                if (!q) return;

                // Biztosítsuk, hogy a tagek be legyenek töltve
                if (!Store.tags || Store.tags.length === 0) {
                    await Store.loadTags();
                }

                // Először pontos egyezést keresünk
                let matchingTag = (Store.tags || []).find(t =>
                    t.name.toLowerCase() === q.toLowerCase()
                );
                // Ha nincs pontos egyezés, részleges egyezést keresünk
                if (!matchingTag) {
                    matchingTag = (Store.tags || []).find(t =>
                        t.name.toLowerCase().includes(q.toLowerCase())
                    );
                }

                if (matchingTag) {
                    this.addToken('Tag', `#${matchingTag.name}`, { id: parseInt(matchingTag.id) });
                } else {
                    // Ha nincs egyezés sem, akkor is Tag szűrőként adjuk hozzá (nem Cím-ként!)
                    // A store executeSearch név alapján fogja feloldani
                    this.addToken('Tag', `#${q}`, { name: q });
                }
            } else if (this.searchMode === 'content') {
                this.addToken('Tartalom', `@${this.searchQuery}`, {});
            } else {
                this.addToken('Cím', val, {});
            }
        },

        addInlineSearchToken() {
            const q = this.searchQuery;
            if (!q) return;

            if (this.searchMode === 'tag') {
                const match = (Store.tags || []).find(t =>
                    t.name.toLowerCase() === q.toLowerCase()
                );
                if (match) {
                    this.addToken('Tag', `#${match.name}`, { id: parseInt(match.id) });
                } else {
                    this.addToken('Tag', `#${q}`, { name: q });
                }
            } else if (this.searchMode === 'content') {
                this.addToken('Tartalom', `@${q}`, {});
            }
        },

        addTagFilter(tag) {
            this.addToken('Tag', `#${tag.name}`, { id: parseInt(tag.id) });
        },

        addCategoryFilter(cat) {
            this.addToken('Kategória', cat.name, { id: cat.id });
        },

        applyDateOrder(order) {
            Store.searchFilters = Store.searchFilters.filter(f => f.key !== 'Rendezés');
            const label = order === 'desc' ? 'Újak elöl' : 'Régiek elöl';
            this.addToken('Rendezés', label, { order, date_type: this.dateType });
        },

        applyDateWindow() {
            Store.searchFilters = Store.searchFilters.filter(f => f.key !== 'Időablak');
            const now = new Date();
            const from = new Date(now.getTime() - this.dateSliderDays * 24 * 60 * 60 * 1000);
            const fromStr = from.toISOString().split('T')[0];
            const toStr = now.toISOString().split('T')[0];
            this.addToken('Időablak', this.dateSliderLabel, {
                from: fromStr, to: toStr, days: this.dateSliderDays, date_type: this.dateType
            });
        },

        applyDateRange() {
            if (!this.dateFrom && !this.dateTo) return;
            Store.searchFilters = Store.searchFilters.filter(f =>
                f.key !== 'Dátum tól' && f.key !== 'Dátum ig' && f.key !== 'Időablak'
            );
            if (this.dateFrom) this.addToken('Dátum tól', this.dateFrom, { date: this.dateFrom });
            if (this.dateTo) this.addToken('Dátum ig', this.dateTo, { date: this.dateTo });
        },

        toggleLocation(locId) {
            const idx = this.selectedLocationIds.indexOf(locId);
            if (idx > -1) this.selectedLocationIds.splice(idx, 1);
            else this.selectedLocationIds.push(locId);
        },

        applyLocations() {
            if (this.selectedLocationIds.length === 0) return;
            Store.searchFilters = Store.searchFilters.filter(f => f.key !== 'Helyszín');
            const locs = Store.locations.filter(l => this.selectedLocationIds.includes(l.id));
            this.addToken('Helyszín', locs.map(l => l.name).join(', '), { ids: [...this.selectedLocationIds] });
            this.selectedLocationIds = [];
        },

        addTodoStatus(status, label) {
            this.addToken('Státusz', label, { status });
        },

        addAttachmentType(type, label) {
            this.addToken('Csatolmány', label, { type });
        },

        toggleGroup(groupId) {
            const idx = this.selectedGroupIds.indexOf(groupId);
            if (idx > -1) this.selectedGroupIds.splice(idx, 1);
            else this.selectedGroupIds.push(groupId);
        },

        applyGroups() {
            if (this.selectedGroupIds.length === 0) return;
            Store.searchFilters = Store.searchFilters.filter(f => f.key !== 'Csoport');
            const groups = Store.groups.filter(g => this.selectedGroupIds.includes(g.id));
            this.addToken('Csoport', groups.map(g => g.name).join(', '), { ids: [...this.selectedGroupIds] });
            this.selectedGroupIds = [];
        },

        tokenColor(key) {
            const m = {
                'Tag': 'var(--node-note)', 'Típus': 'var(--accent-muted)',
                'Cím': 'var(--text-primary)', 'Tartalom': '#f59e0b',
                'Rendezés': '#8b5cf6', 'Időablak': '#3b82f6',
                'Dátum tól': '#3b82f6', 'Dátum ig': '#3b82f6',
                'Helyszín': '#ef4444', 'Státusz': 'var(--node-task)',
                'Csatolmány': '#f97316', 'Csoport': '#6366f1',
                'Kategória': '#ec4899',
            };
            return m[key] || 'var(--text-secondary)';
        },

        // ══════════════════════════════════════════════════════
        // ÚJ: Mentett szűrők kezelése
        // ══════════════════════════════════════════════════════

        _loadSavedFilters() {
            try {
                const raw = localStorage.getItem(this.savedFiltersStorageKey);
                if (!raw) { this.savedFilters = []; return; }
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) this.savedFilters = parsed;
            } catch (e) {
                console.warn('Mentett szűrők betöltési hiba:', e);
                this.savedFilters = [];
            }
        },

        _persistSavedFilters() {
            try {
                localStorage.setItem(
                    this.savedFiltersStorageKey,
                    JSON.stringify(this.savedFilters)
                );
            } catch (e) {
                console.warn('Mentett szűrők mentési hiba:', e);
            }
        },

        _filtersEqual(a, b) {
            if (!Array.isArray(a) || !Array.isArray(b)) return false;
            if (a.length !== b.length) return false;
            // Összehasonlítás sorrend-független módon kulcs+érték alapján
            const norm = arr => arr
                .map(f => `${f.key}::${f.value}::${JSON.stringify(f.data || {})}`)
                .sort();
            const na = norm(a);
            const nb = norm(b);
            return na.every((v, i) => v === nb[i]);
        },

        _randomPresetColor() {
            const palette = [
                '#6366f1', '#ec4899', '#f59e0b', '#34d399',
                '#fb923c', '#818cf8', '#8b5cf6', '#3b82f6',
                '#ef4444', '#f97316', '#10b981', '#06b6d4'
            ];
            return palette[Math.floor(Math.random() * palette.length)];
        },

        togglePresetMenu() {
            this.presetMenuOpen = !this.presetMenuOpen;
            if (this.presetMenuOpen) {
                this.presetSearch = '';
                this.$nextTick(() => {
                    const inp = this.$refs.presetSearchInput;
                    if (inp) inp.focus();
                });
            }
        },

        closePresetMenu() {
            this.presetMenuOpen = false;
            this.presetSearch = '';
        },

        // Aktuális szűrők elmentése új preset-ként (név a kereső mezőből)
        saveCurrentAsPreset() {
            const name = (this.presetSearch || '').trim();
            if (!name) return;
            if (!this.hasFilters) return;

            // Ha már van ilyen nevű preset → felülírás megerősítés
            const existing = this.savedFilters.find(p =>
                p.name.toLowerCase() === name.toLowerCase()
            );
            if (existing) {
                if (!confirm(`"${name}" nevű szűrőhalmaz már létezik. Felülírod?`)) return;
                existing.filters = JSON.parse(JSON.stringify(Store.searchFilters));
                this.activePresetId = existing.id;
            } else {
                const preset = {
                    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    name,
                    color: this._randomPresetColor(),
                    filters: JSON.parse(JSON.stringify(Store.searchFilters)),
                };
                this.savedFilters.push(preset);
                this.activePresetId = preset.id;
            }

            this._persistSavedFilters();
            this.presetSearch = '';
            this.presetMenuOpen = false;
        },

        applyPreset(preset) {
            if (!preset || !Array.isArray(preset.filters)) return;

            // Type-filter állapot szinkronizálása
            this.typeFilters = { todo: false, event: false, note: false };
            preset.filters.forEach(f => {
                if (f.key === 'Típus' && f.data?.type) {
                    this.typeFilters[f.data.type] = true;
                }
            });

            // Szűrők lecserélése: mély másolat, hogy későbbi módosítás ne menjen vissza
            // a mentett preset-be
            Store.searchFilters = JSON.parse(JSON.stringify(preset.filters));
            this.activePresetId = preset.id;

            if (Store.searchFilters.length > 0) {
                Store.executeSearch();
            } else {
                Store.clearSearch();
            }

            this.presetMenuOpen = false;
            this.presetSearch = '';
        },

        deletePreset(preset, ev) {
            if (ev) ev.stopPropagation();
            if (!preset) return;
            if (!confirm(`Törlöd a(z) "${preset.name}" mentett szűrőt?`)) return;

            this.savedFilters = this.savedFilters.filter(p => p.id !== preset.id);
            if (this.activePresetId === preset.id) this.activePresetId = null;
            this._persistSavedFilters();
        },

        clearActivePreset() {
            // Csak a "betöltött preset" jelölést vesszük le — a szűrőket nem piszkáljuk.
            this.activePresetId = null;
        },

        // Token-sor görgetése egér-kerékkel → vízszintes scroll
        onShelfWheel(e) {
            const el = e.currentTarget;
            if (!el) return;
            // Ha nincs mit görgetni, hagyjuk a default viselkedést
            if (el.scrollWidth <= el.clientWidth) return;
            e.preventDefault();
            el.scrollLeft += (e.deltaY !== 0 ? e.deltaY : e.deltaX);
        },
    }
};
