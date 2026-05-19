/**
 * GroupsView v4
 * – Új csoport létrehozás (+ gomb a lista alján)
 * – Csoport szerkesztés + Törlés (elemek → Csoportosítatlan)
 * – Entry-card checkbox hover-rel (tömeges áthelyezés)
 */
const GroupsView = {
  template: "#tpl-groups-view",
  data() {
    return {
      selectedGroup: null,
      entries: [],

      // Szerkesztő modal
      editModalOpen: false,
      editForm: { id: null, name: "", description: "", color_hex: "#5c6bc0" },
      editSaving: false,
      editError: "",

      // Új csoport modal
      createModalOpen: false,
      createForm: { name: "", description: "", color_hex: "#5c6bc0" },
      createSaving: false,
      createError: "",

      // Tömeges kiválasztás
      selectedEntryIds: [],
      bulkMoveOpen: false,
      bulkTargetGroupId: null,
      bulkSaving: false,

      typeConfig: {
        todo:  { color: "#34d399", name: "Feladat"  },
        event: { color: "#fb923c", name: "Esemény"  },
        note:  { color: "#818cf8", name: "Jegyzet"  },
      },
    };
  },
  computed: {
    store()  { return Store; },
    groups() { return Store.groups; },
    bulkTargetGroups() {
      if (!this.selectedGroup) return this.groups;
      return this.groups.filter(g => g.id !== this.selectedGroup.id);
    },
    anySelected() { return this.selectedEntryIds.length > 0; },
  },
  async mounted() {
    await Store.loadGroups();
    if (this.groups.length > 0) this.selectGroup(this.groups[0]);
  },
  methods: {
    // ── Csoport kiválasztása ──────────────────────────────────────────────
    async selectGroup(group) {
      this.selectedGroup = group;
      this.selectedEntryIds = [];
      this.bulkMoveOpen = false;
      const data = await ApiService.loadGroupData(group.id);
      // getAllByGroup visszatér: { entries: [...] }
      this.entries = data && data.entries ? data.entries : [];
    },

    // ── Entry navigáció (bulk módban ne navigáljon) ───────────────────────
    goToEntry(entry) {
      if (this.selectedEntryIds.length > 0) return;
      this.$router.push({ name: "details", params: { id: entry.id } });
    },

    // ── Típus szín / név ─────────────────────────────────────────────────
    entryColor(type)    { return (this.typeConfig[type] || {}).color || "#fff"; },
    entryTypeName(type) { return (this.typeConfig[type] || {}).name  || type;   },

    // ── Dátum segédek (változatlan az eredetiből) ─────────────────────────
    todoDeadline(entry) {
      if (entry.end_datetime) {
        const d = new Date(entry.end_datetime.replace(" ", "T"));
        return d.toLocaleDateString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" });
      }
      if (entry.deadline) {
        const d = new Date(entry.deadline.replace(" ", "T"));
        return d.toLocaleDateString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" });
      }
      return null;
    },
    eventStart(entry) {
      if (entry.start_datetime) {
        const d = new Date(entry.start_datetime.replace(" ", "T"));
        return d.toLocaleDateString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" });
      }
      return null;
    },

    // ══════════════════════════════════════════════════════════════════════
    // SZERKESZTÉS MODAL
    // ══════════════════════════════════════════════════════════════════════
    openEditModal(group, e) {
      e.stopPropagation();
      this.editForm  = { id: group.id, name: group.name, description: group.description || "", color_hex: group.color_hex || "#5c6bc0" };
      this.editError = "";
      this.editModalOpen = true;
    },
    closeEditModal() { this.editModalOpen = false; },

    async saveGroup() {
      if (!this.editForm.name.trim()) { this.editError = "A név kötelező!"; return; }
      this.editSaving = true;
      this.editError  = "";
      try {
        const res = await ApiService.updateGroup({
          id: this.editForm.id, name: this.editForm.name.trim(),
          description: this.editForm.description.trim(), color_hex: this.editForm.color_hex,
        });
        if (res && res.error) throw new Error(res.error);
        await Store.loadGroups();
        const updated = this.groups.find(g => g.id === this.editForm.id);
        if (updated) this.selectedGroup = updated;
        this.editModalOpen = false;
      } catch (e) {
        this.editError = e.message || "Hiba történt.";
      } finally {
        this.editSaving = false;
      }
    },

    async deleteGroup() {
      if (!this.editForm.id) return;
      if (this.editForm.id === 1) { this.editError = "Az alapértelmezett csoport nem törölhető!"; return; }
      if (!confirm(`Biztosan törlöd a(z) "${this.editForm.name}" csoportot? Az elemei átkerülnek a "Csoportosítatlan" csoportba.`)) return;
      this.editSaving = true;
      this.editError  = "";
      try {
        const res = await ApiService.deleteGroup(this.editForm.id);
        if (res && res.error) throw new Error(res.error);
        await Store.loadGroups();
        this.editModalOpen = false;
        if (this.groups.length > 0) this.selectGroup(this.groups[0]);
        else { this.selectedGroup = null; this.entries = []; }
      } catch (e) {
        this.editError = e.message || "Hiba történt.";
      } finally {
        this.editSaving = false;
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // ÚJ CSOPORT MODAL
    // ══════════════════════════════════════════════════════════════════════
    openCreateModal() {
      this.createForm  = { name: "", description: "", color_hex: "#5c6bc0" };
      this.createError = "";
      this.createModalOpen = true;
    },
    closeCreateModal() { this.createModalOpen = false; },

    async createGroup() {
      if (!this.createForm.name.trim()) { this.createError = "A név kötelező!"; return; }
      this.createSaving = true;
      this.createError  = "";
      try {
        const res = await ApiService.createGroup({
          name: this.createForm.name.trim(),
          description: this.createForm.description.trim(),
          color_hex: this.createForm.color_hex,
        });
        if (res && res.error) throw new Error(res.error);
        await Store.loadGroups();
        this.createModalOpen = false;
        const newGroup = this.groups.find(g => g.id === res.id);
        if (newGroup) this.selectGroup(newGroup);
      } catch (e) {
        this.createError = e.message || "Hiba történt.";
      } finally {
        this.createSaving = false;
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // TÖMEGES KIVÁLASZTÁS
    // ══════════════════════════════════════════════════════════════════════
    toggleEntrySelect(entryId, e) {
      e.stopPropagation();
      const idx = this.selectedEntryIds.indexOf(entryId);
      if (idx === -1) this.selectedEntryIds.push(entryId);
      else            this.selectedEntryIds.splice(idx, 1);
    },
    isSelected(entryId) { return this.selectedEntryIds.includes(entryId); },
    clearSelection() { this.selectedEntryIds = []; this.bulkMoveOpen = false; this.bulkTargetGroupId = null; },
    openBulkMove()   { this.bulkTargetGroupId = null; this.bulkMoveOpen = true; },

    async confirmBulkMove() {
      if (!this.bulkTargetGroupId) return;
      this.bulkSaving = true;
      try {
        const res = await ApiService.bulkMoveToGroup(this.selectedEntryIds, this.bulkTargetGroupId);
        if (res && res.error) throw new Error(res.error);
        await Store.loadGroups();
        await this.selectGroup(this.selectedGroup);
        this.clearSelection();
      } catch (e) {
        alert("Hiba: " + (e.message || "Ismeretlen hiba"));
      } finally {
        this.bulkSaving = false;
      }
    },
  },
};
