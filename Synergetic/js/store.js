/**
 * Synergetic – Store (v5 - Category filter + improved search)
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

        const filters = { group_id: this.currentGroupId };

        // Típus
        const typeTokens = this.searchFilters.filter(f => f.key === 'Típus');
        if (typeTokens.length) filters.types = typeTokens.map(t => t.data?.type).filter(Boolean);

        // Tag
        const tagTokens = this.searchFilters.filter(f => f.key === 'Tag');
        if (tagTokens.length) filters.tag_ids = tagTokens.map(t => t.data?.id).filter(Boolean);

        // Kategória
        const catTokens = this.searchFilters.filter(f => f.key === 'Kategória');
        if (catTokens.length) filters.category_ids = catTokens.map(t => t.data?.id).filter(Boolean);

        // Cím
        const titleTokens = this.searchFilters.filter(f => f.key === 'Cím');
        if (titleTokens.length) filters.title = titleTokens.map(t => t.value).join(' ');

        // Tartalom
        const contentTokens = this.searchFilters.filter(f => f.key === 'Tartalom');
        if (contentTokens.length) filters.content = contentTokens.map(t => t.value.replace(/^@/, '')).join(' ');

        // Dátum
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

        // Rendezés
        const orderToken = this.searchFilters.find(f => f.key === 'Rendezés');
        if (orderToken) {
            filters.date_order = orderToken.data?.order || 'desc';
            if (orderToken.data?.date_type) filters.date_type = orderToken.data.date_type;
        }

        // Helyszín
        const locTokens = this.searchFilters.filter(f => f.key === 'Helyszín');
        if (locTokens.length) {
            filters.location_ids = [];
            locTokens.forEach(t => {
                if (t.data?.ids) filters.location_ids.push(...t.data.ids);
                else if (t.data?.id) filters.location_ids.push(t.data.id);
            });
        }

        // TODO státusz
        const todoTokens = this.searchFilters.filter(f => f.key === 'Státusz');
        if (todoTokens.length) filters.todo_statuses = todoTokens.map(t => t.data?.status).filter(Boolean);

        // Csatolmány
        const attTokens = this.searchFilters.filter(f => f.key === 'Csatolmány');
        if (attTokens.length) filters.attachment_types = attTokens.map(t => t.data?.type).filter(Boolean);

        // Csoport
        const groupTokens = this.searchFilters.filter(f => f.key === 'Csoport');
        if (groupTokens.length) {
            filters.group_ids = groupTokens.map(t => t.data?.id).filter(Boolean);
            // Ha van group_ids a data-ban tömb
            groupTokens.forEach(t => { if (t.data?.ids) filters.group_ids.push(...t.data.ids); });
            delete filters.group_id;
        }

        const result = await ApiService.searchEntries(filters);
        if (result && result.entries) {
            this.searchActive = true;
            this.searchResults = result.entries;
            this.highlightedNodeIds = new Set(result.entries.map(e => e.id));
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
