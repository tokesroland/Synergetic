/**
 * Synergetic – Store
 * Központi reaktív állapotkezelés Vue.reactive() segítségével.
 */
const Store = Vue.reactive({
    // ─── Alkalmazás állapot ────────────────────────────────────
    groups: [],
    currentGroupId: 1,
    nodes: [],
    selectedId: null,

    filters: {
        todo: true,
        event: true,
        note: true
    },

    // ─── Kategóriák, Tagek ─────────────────────────────────────
    categories: [],
    tags: [],
    locations: [],

    // ─── UI állapot ────────────────────────────────────────────
    sidebarOpen: true,
    modalOpen: false,

    // ─── Színek ────────────────────────────────────────────────
    colors: {
        todo: '#34d399',
        event: '#fb923c',
        note: '#818cf8'
    },

    typeNames: {
        todo: 'Feladat',
        event: 'Esemény',
        note: 'Jegyzet'
    },

    // ─── Inicializálás ─────────────────────────────────────────
    initColors() {
        const r = getComputedStyle(document.documentElement);
        this.colors.todo  = r.getPropertyValue('--node-task').trim()  || this.colors.todo;
        this.colors.event = r.getPropertyValue('--node-event').trim() || this.colors.event;
        this.colors.note  = r.getPropertyValue('--node-note').trim()  || this.colors.note;
    },

    // ─── Adatbetöltés ──────────────────────────────────────────
    async loadGroups() {
        const data = await ApiService.loadGroups();
        if (data) this.groups = data;
    },

    async loadCurrentGroup() {
        const data = await ApiService.loadGroupData(this.currentGroupId);
        if (data && data.entries) {
            this.nodes = data.entries;
            this.selectedId = null;
        }
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

    // ─── Szűrt node-ok ─────────────────────────────────────────
    get visibleNodes() {
        return this.nodes.filter(n => this.filters[n.type]);
    },

    // ─── Csoport váltás ────────────────────────────────────────
    async switchGroup(groupId) {
        this.currentGroupId = groupId;
        await this.loadCurrentGroup();
    }
});
