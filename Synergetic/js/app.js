const App = {
    // Globális adatok és állapotok
    state: {
        nodes: [],
        filters: { task: true, event: true, note: true },
        currentGroupId: 1,
        selectedId: null
    },
    
    // Színek (CSS-ből olvassuk ki)
    colors: {
        task: '#4caf50',
        event: '#ff9800',
        note: '#7986cb'
    },

    async init() {
        const rootStyles = getComputedStyle(document.documentElement);
        this.colors.task = rootStyles.getPropertyValue('--node-task').trim() || this.colors.task;
        this.colors.event = rootStyles.getPropertyValue('--node-event').trim() || this.colors.event;
        this.colors.note = rootStyles.getPropertyValue('--node-note').trim() || this.colors.note;

        Graph.init();
        UI.init();

        // 1. Csoportok betöltése
        await this.loadGroups();
        // 2. Aktuális csoport elemeinek betöltése
        await this.loadCurrentGroup();
    },

    async loadGroups() {
        const groups = await API.loadGroups();
        if (groups) {
            UI.renderGroups(groups);
        }
    },

    async loadCurrentGroup() {
        const data = await API.loadGroupData(this.state.currentGroupId);
        if (data && data.entries) {
            this.state.nodes = data.entries;
            this.state.selectedId = null; 
            Graph.draw();
            // ÚJ: Kilistázzuk az elemeket a sidebarba!
            UI.renderSidebarEntries(this.state.nodes); 
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());