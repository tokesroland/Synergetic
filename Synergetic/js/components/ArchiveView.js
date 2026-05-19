/**
 * ArchiveView v1 – Archivált todo-k listája az összes részlettel.
 * Soft-delete: csak status='archived' todo-k jelennek meg itt.
 * Lehetőség a visszaállításra (status -> active).
 */
const ArchiveView = {
  template: "#tpl-archive-view",
  data() {
    return {
      entries: [],
      loading: true,
    };
  },
  computed: {
    store() {
      return Store;
    },
  },
  async mounted() {
    await this.loadArchive();
  },
  methods: {
    async loadArchive() {
      this.loading = true;
      const data = await ApiService.getArchived();
      this.entries = data && data.entries ? data.entries : [];
      this.loading = false;
    },
    goBack() {
      this.$router.push({ name: "graph" });
    },
    goToEntry(entry) {
      this.$router.push({ name: "details", params: { id: entry.id } });
    },
    // Datetime → magyar formátum (idő csak ha van)
    fmtDate(val) {
      if (!val) return null;
      const d = new Date(String(val).replace(" ", "T"));
      if (isNaN(d.getTime())) return null;
      const datePart = d.toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
      if (!hasTime) return datePart;
      const timePart = d.toLocaleTimeString("hu-HU", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${datePart} ${timePart}`;
    },
    // HTML tartalom -> rövid sima szöveges előnézet
    contentPreview(html) {
      if (!html) return "";
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const txt = (tmp.innerText || tmp.textContent || "").trim();
      return txt.length > 220 ? txt.slice(0, 220) + "…" : txt;
    },
    async restoreEntry(entry) {
      if (
        !confirm(
          `Visszaállítod aktív állapotba: "${entry.title}"?`,
        )
      )
        return;
      const res = await ApiService.updateEntry({
        id: entry.id,
        title: entry.title,
        content: entry.content || "",
        status: "active",
      });
      if (res && !res.error) {
        // Eltávolítjuk a listából, és frissítjük a Store-t (visszakerül a gráfra)
        this.entries = this.entries.filter((e) => e.id !== entry.id);
        await Store.loadCurrentGroup();
        await Store.loadGroups();
      } else {
        alert("Visszaállítási hiba: " + (res?.error || "Ismeretlen hiba"));
      }
    },
  },
};
