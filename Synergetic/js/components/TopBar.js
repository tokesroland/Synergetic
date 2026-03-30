/**
 * TopBar – Szűrők és nézet választó
 */
const TopBar = {
    template: '#tpl-topbar',

    computed: {
        store()   { return Store; },
        filters() { return Store.filters; },

        currentView() {
            return this.$route.name || 'graph';
        }
    },

    methods: {
        toggleFilter(type) {
            Store.filters[type] = !Store.filters[type];
        },

        changeView(event) {
            const view = event.target.value;
            this.$router.push({ name: view });
        }
    }
};
