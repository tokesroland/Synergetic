/**
 * Synergetic – App v3
 * Hamburger csak graph oldalon
 */
const app = Vue.createApp({
  data() {
    return { store: Store };
  },
  computed: {
    sidebarOpen() {
      return Store.sidebarOpen;
    },
    showSidebar() {
      const r = this.$route.name;
      return r === "graph" || !r;
    },
    showTopBar() {
      const r = this.$route.name;
      return r === "graph" || !r;
    },
    showHamburger() {
      const r = this.$route.name;
      return r === "graph" || !r;
    },
  },
  methods: {
    toggleSidebar() {
      Store.sidebarOpen = !Store.sidebarOpen;
    },
  },
  async mounted() {
    Store.initColors();
    await Store.loadGroups();
    await Store.loadCurrentGroup();
    await Store.loadCategories();
    await Store.loadTags();
  },
});
app.component("app-sidebar", AppSidebar);
app.component("top-bar", TopBar);
app.component("entry-modal", EntryModal);
app.use(router);
app.mount("#app");