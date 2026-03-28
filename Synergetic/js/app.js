const App = {
    state: {
        nodes: [],
        filters: { todo: true, event: true, note: true },
        currentGroupId: 1,
        selectedId: null
    },
    
    colors: {
        todo: '#34d399',
        event: '#fb923c',
        note: '#818cf8'
    },

    async init() {
        const rootStyles = getComputedStyle(document.documentElement);
        this.colors.todo  = rootStyles.getPropertyValue('--node-task').trim()  || this.colors.todo;
        this.colors.event = rootStyles.getPropertyValue('--node-event').trim() || this.colors.event;
        this.colors.note  = rootStyles.getPropertyValue('--node-note').trim()  || this.colors.note;

        Graph.init();
        UI.init();

        await this.loadGroups();
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
            UI.renderSidebarEntries(this.state.nodes); 
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
