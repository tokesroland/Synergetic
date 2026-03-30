/**
 * TopBar v5 – Csak nézet választó, szűrő gombok teljesen eltávolítva
 */
const TopBar = {
    template: '#tpl-topbar',

    computed: {
        store()   { return Store; },

        currentView() {
            return this.$route.name || 'graph';
        }
    },

    methods: {
        changeView(event) {
            const view = event.target.value;
            this.$router.push({ name: view });
        }
    }
};
