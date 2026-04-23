/**
 * OmniBar v2 – Összetett kereső és szűrő
 * Javítások:
 *  - Opacity animáció egyidejű a translateY-vel
 *  - Kategória szűrő hozzáadva
 *  - Pull-tab trigger (középső vonal) a hamburger/szelektor helyett
 *  - Highlight-olt node-ok kapcsolatai is kitűnnek
 *  - Auto-show: ha az egér a képernyő teteje felé megy (középső zóna),
 *    előugrik az omnibar; ha leveszi az egeret róla, visszamegy
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

        menuItems() {
            const items = [
                { id: 'types', icon: '📋', label: 'Bejegyzés típusa' },
                { id: 'tags', icon: '🏷️', label: 'Tagek (#)' },
                { id: 'categories', icon: '📁', label: 'Kategóriák' },
                { id: 'dates', icon: '📅', label: 'Dátumok' },
            ];

            if (this.typeFilters.event || this.noTypeSelected) {
                items.push({ id: 'locations', icon: '📍', label: 'Helyszínek' });
            }

            if (this.typeFilters.todo || this.noTypeSelected) {
                items.push({ id: 'todo-status', icon: '✅', label: 'Teendő státusz' });
            }

            items.push(
                { id: 'attachments', icon: '📎', label: 'Csatolmányok' },
                { id: 'groups', icon: '👥', label: 'Csoportok' },
                { id: 'recurrence', icon: '🔁', label: 'Ismétlődés' },
            );

            return items;
        },

        noTypeSelected() {
            return !this.typeFilters.todo && !this.typeFilters.event && !this.typeFilters.note;
        },

        searchMode() {
            const val = this.searchText;
            if (val.startsWith('#')) return 'tag';
            if (val.startsWith('@')) return 'content';
            return 'title';
        },

        searchQuery() {
            const val = this.searchText;
            if (val.startsWith('#') || val.startsWith('@')) return val.substring(1).trim();
            return val.trim();
        },

        tagSuggestions() {
            if (this.searchMode !== 'tag' || !this.searchQuery) return [];
            const q = this.searchQuery.toLowerCase();
            return (Store.tags || []).filter(t => t.name.toLowerCase().includes(q));
        },

        dateSliderLabel() {
            if (this.dateSliderDays <= 1) return 'Ma';
            if (this.dateSliderDays <= 90) return `Elmúlt ${this.dateSliderDays} nap`;
            return `Elmúlt ~${Math.round(this.dateSliderDays / 30)} hónap`;
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
    },

    async mounted() {
        // Kívülre kattintás → panel bezár, ha nincs aktív szűrő, omnibar is elmegy
        this._outsideClick = (e) => {
            const el = this.$el;
            const tab = document.getElementById('omnibar-pull-tab');
            if (el && !el.contains(e.target) && tab && !tab.contains(e.target)) {
                this.panelOpen = false;
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
    }
};
