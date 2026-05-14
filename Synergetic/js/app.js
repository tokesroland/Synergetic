/**
 * Synergetic – App v6.1 (+ Auth, hibatűrő betöltés)
 */
const app = Vue.createApp({
  data() {
    return { store: Store };
  },
  computed: {
    sidebarOpen() { return Store.sidebarOpen; },
    showSidebar() { const r = this.$route.name; return r === "graph" || !r; },
    showTopBar() { const r = this.$route.name; return r === "graph" || !r; },
    showHamburger() { const r = this.$route.name; return r === "graph" || !r; },
    showOmniBar() { const r = this.$route.name; return r === "graph" || !r; },
    // Az auth gomb csak a graph oldalon jelenik meg (a hamburger melletti területen)
    showAuthButton() { const r = this.$route.name; return r === "graph" || !r; },
  },
  methods: {
    toggleSidebar() { Store.sidebarOpen = !Store.sidebarOpen; },
  },
  async mounted() {
    Store.initColors();

    // A fő adatbetöltés FÜGGETLEN az auth-tól: külön try-blokk, hogy egy
    // esetleges auth hiba SOHA ne akadályozza meg a gráf/jegyzetek betöltését.
    try {
      await Store.loadGroups();
      await Store.loadCurrentGroup();
      await Store.loadCategories();
      await Store.loadTags();
      await Store.loadLocations();
    } catch (e) {
      console.error("[App] Adatbetöltési hiba:", e);
    }

    // Auth állapot betöltése külön, nem blokkoló módon.
    try {
      await Store.loadCurrentUser();
    } catch (e) {
      console.error("[App] Auth betöltési hiba:", e);
      Store.currentUser = null;
    }
  },
});
app.component("app-sidebar", AppSidebar);
app.component("top-bar", TopBar);
app.component("omni-bar", OmniBar);
app.component("entry-modal", EntryModal);
app.component("auth-modal", AuthModal);
app.component("auth-button", AuthButton);
app.use(router);
app.mount("#app");
