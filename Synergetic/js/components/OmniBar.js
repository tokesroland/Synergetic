/**
 * OmniBar v3 – Hibajavítások:
 *  - Eltávolítva: "Csoportok" és "Ismétlődés" menüpontok (nem voltak funkcionálisak,
 *    illetve külön Groups-nézetben kezelendők).
 *  - Megtartva: minden más szűrő (Típus, Tag, Kategória, Dátum, Helyszín, TODO státusz,
 *    Csatolmány) + preset rendszer.
 *
 * v2 örökség: pull-tab trigger, auto-show hover, localStorage preset-ek, token scroll.
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

            // Dátum szűrő állapot
            dateType: 'created_at',
            dateFrom: '',
            dateTo: '',
            dateOrder: 'desc',
            dateSliderDays: 30,

            // Helyszín multiselect
            selectedLocationIds: [],

            // Entry type toggles
            typeFilters: {
                todo: false,
                event: false,
                note: false
            },

            // Mentett szűrő halmazok
            savedFilters: [],
            savedFiltersStorageKey: 'synergetic_saved_filters',
            presetMenuOpen: false,
            presetSearch: '',
            activePresetId: null,
        };
    },

    computed: {
        store() { return Store; },
        activeFilters() { return Store.searchFilters; },
        hasFilters() { return Store.searchFilters.length > 0; },

        filteredTags() {
            const q = this.tagSearch.toLowerCase();
            const tags = this.store.tags || [];
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

        presetLabel() {
            if (this.activePresetId) {
                const p = this.savedFilters.find(x => x.id === this.activePresetId);
                if (p) return p.name;
            }
            return 'Aktív szűrők';
        },

        filteredSavedFilters() {
            const q = (this.presetSearch || '').toLowerCase();
            if (!q) return this.savedFilters;
            return this.savedFilters.filter(p => p.name.toLowerCase().includes(q));
        },

        canSavePreset() {
            return this.hasFilters && this.presetSearch.trim().length > 0;
        },

        // ── Bal oldali menü elemei (Csoportok és Ismétlődés törölve) ──
        menuItems() {
            return [
                { id: 'types',       icon: '🧩', label: 'Bejegyzés típusa' },
                { id: 'tags',        icon: '🏷️', label: 'Tagek' },
                { id: 'categories',  icon: '📁', label: 'Kategóriák' },
                { id: 'dates',       icon: '📅', label: 'Dátum / Időrend' },
                { id: 'locations',   icon: '📍', label: 'Helyszínek' },
                { id: 'todo-status', icon: '✅', label: 'TODO státusz' },
                { id: 'attachments', icon: '📎', label: 'Csatolmányok' },
            ];
        },

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
        this._loadSavedFilters();

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

        this._hideTimer = null;

        this.$el.addEventListener('mouseleave', () => {
            if (this.hasFilters || this.searchText) return;
            this._scheduleHide();
        });

        this.$el.addEventListener('mouseenter', () => {
            clearTimeout(this._hideTimer);
        });

        this._onMouseMove = (e) => {
            const x = e.clientX;
            const y = e.clientY;
            const w = window.innerWidth;
            const overHamburger = (x < 62 && y < 62);
            const overSelector = (x > w - 170 && y < 50);
            if (y < 18 && !overHamburger && !overSelector) {
                clearTimeout(this._hideTimer);
                if (!this.visible) this.visible = true;
            }
        };
        document.addEventListener('mousemove', this._onMouseMove);

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
                if (!Store.tags || Store.tags.length === 0) await Store.loadTags();

                let matchingTag = (Store.tags || []).find(t =>
                    t.name.toLowerCase() === q.toLowerCase()
                );
                if (!matchingTag) {
                    matchingTag = (Store.tags || []).find(t =>
                        t.name.toLowerCase().includes(q.toLowerCase())
                    );
                }

                if (matchingTag) {
                    this.addToken('Tag', `#${matchingTag.name}`, { id: parseInt(matchingTag.id) });
                } else {
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

        tokenColor(key) {
            const m = {
                'Tag': 'var(--node-note)', 'Típus': 'var(--accent-muted)',
                'Cím': 'var(--text-primary)', 'Tartalom': '#f59e0b',
                'Rendezés': '#8b5cf6', 'Időablak': '#3b82f6',
                'Dátum tól': '#3b82f6', 'Dátum ig': '#3b82f6',
                'Helyszín': '#ef4444',
                'Státusz': 'var(--node-task)',
                'Csatolmány': '#f97316',
                'Kategória': '#ec4899',
            };
            return m[key] || 'var(--text-secondary)';
        },

        // ══════════════════════════════════════════════════════
        // Mentett szűrők kezelése
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

        saveCurrentAsPreset() {
            const name = (this.presetSearch || '').trim();
            if (!name) return;
            if (!this.hasFilters) return;

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

            this.typeFilters = { todo: false, event: false, note: false };
            preset.filters.forEach(f => {
                if (f.key === 'Típus' && f.data?.type) {
                    this.typeFilters[f.data.type] = true;
                }
            });

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
            this.activePresetId = null;
        },

        onShelfWheel(e) {
            const el = e.currentTarget;
            if (!el) return;
            if (el.scrollWidth <= el.clientWidth) return;
            e.preventDefault();
            el.scrollLeft += (e.deltaY !== 0 ? e.deltaY : e.deltaX);
        },
    }
};
