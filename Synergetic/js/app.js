/**
 * Synergetic – App v5
 */
const app = Vue.createApp({
  data() {
    return { store: Store };
  },
  computed: {
    sidebarOpen() { return Store.sidebarOpen; },
    showSidebar() { const r = this.$route.name; return r === "graph" || !r; },
    showTopBar() { const r = this.$route.name; return r === "graph" || r === "archive" || !r; },
    showHamburger() { const r = this.$route.name; return r === "graph" || !r; },
    showOmniBar() { const r = this.$route.name; return r === "graph" || !r; },
    showAuthButton() { const r = this.$route.name; return r === "graph" || !r; },
  },
  methods: {
    toggleSidebar() { Store.sidebarOpen = !Store.sidebarOpen; },
  },
  async mounted() {
    Store.initColors();
    await Store.loadCurrentUser();
    await Store.loadGroups();
    await Store.loadCurrentGroup();
    await Store.loadCategories();
    await Store.loadTags();
    await Store.loadLocations();
  },
});
app.component("app-sidebar", AppSidebar);
app.component("top-bar", TopBar);
app.component("omni-bar", OmniBar);
app.component("entry-modal", EntryModal);
app.component("auth-button", AuthButton);
app.component("auth-modal", AuthModal);
app.use(router);
app.mount("#app");
