/**
 * Synergetic – Store (v7)
 *
 * v7 hibajavítások:
 *  - executeSearch: a tag/category/group token-eknél a frontend string vs int
 *    ID különbség miatt nem mindig egyezett a backend visszaadta ID-val.
 *    Mostantól mindenhol Number()-rel normalizálunk.
 *  - highlightedNodeIds: a backend e.id-ja string-ként jön (PDO FETCH_ASSOC),
 *    de a Store.nodes-ban az id integer. A Set most NUMBER ID-kat tárol,
 *    és a GraphView is Number(node.id)-vel ellenőriz (lásd GraphView v6).
 *  - Debug log: minden szűrő-érték látható az executeSearch-ben.
 */
const Store = Vue.reactive({
    groups: [],
    currentGroupId: 1,
    nodes: [],
    selectedId: null,

    filters: { todo: true, event: true, note: true },

    categories: [],
    tags: [],
    locations: [],

    sidebarOpen: true,
    modalOpen: false,

    // ── Auth ──
    currentUser: null,
    authModalOpen: false,
    authModalMode: 'login',

    // ── Keresés ──
    searchActive: false,
    searchFilters: [],
    searchResults: null,
    highlightedNodeIds: null,

    colors: { todo: '#34d399', event: '#fb923c', note: '#818cf8' },
    typeNames: { todo: 'Feladat', event: 'Esemény', note: 'Jegyzet' },

    initColors() {
        const r = getComputedStyle(document.documentElement);
        this.colors.todo  = r.getPropertyValue('--node-task').trim()  || this.colors.todo;
        this.colors.event = r.getPropertyValue('--node-event').trim() || this.colors.event;
        this.colors.note  = r.getPropertyValue('--node-note').trim()  || this.colors.note;
    },

    // ── Auth metódusok ──
    get isLoggedIn() { return !!this.currentUser; },

    async loadCurrentUser() {
        if (typeof ApiService.getCurrentUser !== 'function') {
            console.warn('[Store] ApiService.getCurrentUser hiányzik – frissítsd az api.js-t!');
            this.currentUser = null;
            return;
        }
        const data = await ApiService.getCurrentUser();
        if (data && data.user) {
            this.currentUser = data.user;
        } else {
            this.currentUser = null;
        }
    },

    async logout() {
        if (typeof ApiService.logout !== 'function') {
            this.currentUser = null;
            return null;
        }
        const res = await ApiService.logout();
        if (res && !res.error) {
            this.currentUser = null;
        }
        return res;
    },

    openAuthModal(mode = 'login') {
        this.authModalMode = mode;
        this.authModalOpen = true;
    },

    closeAuthModal() {
        this.authModalOpen = false;
    },

    async loadGroups() {
        const data = await ApiService.loadGroups();
        if (data) this.groups = data;
    },
    async loadCurrentGroup() {
        const data = await ApiService.loadGroupData(this.currentGroupId);
        if (data && data.entries) { this.nodes = data.entries; this.selectedId = null; }
    },
    async loadCategories() {
        const data = await ApiService.getCategories();
        if (data) this.categories = data;
    },
    async loadTags() {
        const data = await ApiService.getTags();
        if (data) this.tags = data;
    },
    async loadLocations() {
        const data = await ApiService.getLocations();
        if (data) this.locations = data;
    },

    // ── Keresés végrehajtása ──
    async executeSearch() {
        if (this.searchFilters.length === 0) { this.clearSearch(); return; }

        // Biztosítjuk, hogy a tagek és kategóriák be legyenek töltve
        if (!this.tags || this.tags.length === 0) await this.loadTags();
        if (!this.categories || this.categories.length === 0) await this.loadCategories();

        const filters = { group_id: this.currentGroupId };

        // ── Típus ──
        const typeTokens = this.searchFilters.filter(f => f.key === 'Típus');
        if (typeTokens.length) filters.types = typeTokens.map(t => t.data?.type).filter(Boolean);

        // ── Tag ──
        const tagTokens = this.searchFilters.filter(f => f.key === 'Tag');
        if (tagTokens.length) {
            const tagIds = [];
            for (const t of tagTokens) {
                // Először próbáljuk a token data.id-ját — Number()-rel normalizálva.
                const directId = t.data?.id !== undefined && t.data?.id !== null
                    ? Number(t.data.id)
                    : NaN;
                if (!Number.isNaN(directId) && directId > 0) {
                    tagIds.push(directId);
                    continue;
                }
                // Ha nincs id, próbáljuk a nevet a betöltött tag-ek között.
                const rawName = (t.data?.name || (t.value || '').replace(/^#/, '')).toLowerCase().trim();
                if (!rawName) continue;
                const found = (this.tags || []).find(tag => String(tag.name).toLowerCase() === rawName);
                if (found && found.id !== undefined) {
                    const fid = Number(found.id);
                    if (!Number.isNaN(fid) && fid > 0) tagIds.push(fid);
                }
            }
            if (tagIds.length) filters.tag_ids = tagIds;
        }

        // ── Kategória ──
        const catTokens = this.searchFilters.filter(f => f.key === 'Kategória');
        if (catTokens.length) {
            const catIds = catTokens
                .map(t => Number(t.data?.id))
                .filter(n => !Number.isNaN(n) && n > 0);
            if (catIds.length) filters.category_ids = catIds;
        }

        // ── Cím ──
        const titleTokens = this.searchFilters.filter(f => f.key === 'Cím');
        if (titleTokens.length) filters.title = titleTokens.map(t => t.value).join(' ');

        // ── Tartalom ──
        const contentTokens = this.searchFilters.filter(f => f.key === 'Tartalom');
        if (contentTokens.length) filters.content = contentTokens.map(t => t.value.replace(/^@/, '')).join(' ');

        // ── Dátum ──
        const dateTypeToken = this.searchFilters.find(f => f.key === 'Dátum típus');
        if (dateTypeToken) filters.date_type = dateTypeToken.data?.type || 'created_at';

        const dateWindowToken = this.searchFilters.find(f => f.key === 'Időablak');
        if (dateWindowToken?.data) {
            filters.date_from = dateWindowToken.data.from;
            filters.date_to = dateWindowToken.data.to;
            if (dateWindowToken.data.date_type) filters.date_type = dateWindowToken.data.date_type;
        }

        const dateFromToken = this.searchFilters.find(f => f.key === 'Dátum tól');
        if (dateFromToken) filters.date_from = dateFromToken.data?.date;
        const dateToToken = this.searchFilters.find(f => f.key === 'Dátum ig');
        if (dateToToken) filters.date_to = dateToToken.data?.date;

        // ── Rendezés ──
        const orderToken = this.searchFilters.find(f => f.key === 'Rendezés');
        if (orderToken) {
            filters.date_order = orderToken.data?.order || 'desc';
            if (orderToken.data?.date_type) filters.date_type = orderToken.data.date_type;
        }

        // ── Helyszín ──
        const locTokens = this.searchFilters.filter(f => f.key === 'Helyszín');
        if (locTokens.length) {
            filters.location_ids = [];
            locTokens.forEach(t => {
                if (t.data?.ids) {
                    t.data.ids.forEach(x => {
                        const n = Number(x);
                        if (!Number.isNaN(n) && n > 0) filters.location_ids.push(n);
                    });
                } else if (t.data?.id) {
                    const n = Number(t.data.id);
                    if (!Number.isNaN(n) && n > 0) filters.location_ids.push(n);
                }
            });
            if (!filters.location_ids.length) delete filters.location_ids;
        }

        // ── TODO státusz ──
        const todoTokens = this.searchFilters.filter(f => f.key === 'Státusz');
        if (todoTokens.length) filters.todo_statuses = todoTokens.map(t => t.data?.status).filter(Boolean);

        // ── Csatolmány ──
        const attTokens = this.searchFilters.filter(f => f.key === 'Csatolmány');
        if (attTokens.length) filters.attachment_types = attTokens.map(t => t.data?.type).filter(Boolean);

        // ── Diagnosztika ──
        console.log('[executeSearch] filters →', JSON.parse(JSON.stringify(filters)));

        const result = await ApiService.searchEntries(filters);

        console.log('[executeSearch] result →', result);

        if (result && Array.isArray(result.entries)) {
            this.searchActive = true;
            this.searchResults = result.entries;
            // FONTOS: Number()-rel normalizáljuk az ID-kat, hogy a GraphView .has()
            // megbízhatóan találja meg a node-okat (mindenhol szám alapú összehasonlítás).
            this.highlightedNodeIds = new Set(
                result.entries
                    .map(e => Number(e.id))
                    .filter(n => !Number.isNaN(n))
            );
            console.log('[executeSearch] highlightedNodeIds (count=' + this.highlightedNodeIds.size + ') →',
                Array.from(this.highlightedNodeIds));
        } else {
            // Hiba a backend válaszánál — ne hagyjuk félinformációban a UI-t.
            this.searchActive = true;
            this.searchResults = [];
            this.highlightedNodeIds = new Set();
            console.warn('[executeSearch] hibás vagy üres backend válasz — highlight ürítve.');
        }
    },

    clearSearch() {
        this.searchActive = false;
        this.searchResults = null;
        this.highlightedNodeIds = null;
        this.searchFilters = [];
    },

    addSearchFilter(token) {
        const exists = this.searchFilters.some(f => f.key === token.key && f.value === token.value);
        if (!exists) { this.searchFilters.push(token); this.executeSearch(); }
    },

    removeSearchFilter(index) {
        this.searchFilters.splice(index, 1);
        if (this.searchFilters.length === 0) this.clearSearch();
        else this.executeSearch();
    },

    clearAllFilters() { this.clearSearch(); },

    get visibleNodes() { return this.nodes.filter(n => this.filters[n.type]); },

    async switchGroup(groupId) {
        this.currentGroupId = groupId;
        await this.loadCurrentGroup();
        if (this.searchActive) this.executeSearch();
    }
});
