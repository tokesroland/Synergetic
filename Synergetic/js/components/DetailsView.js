/**
 * DetailsView v3 – Fixed: picker popup, mentés visszajelzés, contenteditable tartalom mentés
 */
const DetailsView = {
  template: "#tpl-details-view",
  data() {
    return {
      entry: null,
      loading: true,
      saving: false,
      saveSuccess: false,
      editTitle: "",
      editContent: "",
      attachments: [],
      currentTags: [],
      currentCatId: null,
      currentCatName: null,
      currentCatColor: null,
      allCategories: [],
      allTags: [],
      pickerOpen: null,
      pickerSearch: "",
      pickerAnchor: null,
      lightboxOpen: false,
      lightboxSrc: "",
      currentFontSize: 3,
      IMAGE_TYPES: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ],
    };
  },
  computed: {
    store() {
      return Store;
    },
    entryId() {
      return parseInt(this.$route.params.id);
    },
    typeColor() {
      return this.entry ? Store.colors[this.entry.type] || "#555" : "#555";
    },
    typeName() {
      return this.entry
        ? Store.typeNames[this.entry.type] || this.entry.type
        : "";
    },
    filteredPickerItems() {
      const q = this.pickerSearch.toLowerCase();
      const items =
        this.pickerOpen === "cat" ? this.allCategories : this.allTags;
      if (!q) return items;
      return items.filter((i) => i.name.toLowerCase().includes(q));
    },
    saveButtonText() {
      if (this.saving) return "Mentés...";
      if (this.saveSuccess) return "✓ Mentve!";
      return "Mentés";
    },
  },
  watch: {
    "$route.params.id"() {
      this.loadEntry();
    },
    "entry.content"(newVal) {
      // Szinkronizáljuk az editContent-et és az editor HTML-jét
      this.editContent = newVal || "";
      this.$nextTick(() => {
        const el = this.$refs.contentEditor;
        if (el && el.innerHTML !== (newVal || "")) {
          el.innerHTML = newVal || "";
        }
      });
    },
  },
  async mounted() {
    await this.loadEntry();
  },
  methods: {
    async loadEntry() {
      this.loading = true;
      const [cats, tags] = await Promise.all([
        ApiService.getCategories(),
        ApiService.getTags(),
      ]);
      this.allCategories = cats || [];
      this.allTags = tags || [];
      const data = await ApiService.getEntry(this.entryId);
      if (data) {
        this.entry = data;
        this.editTitle = data.title || "";
        this.editContent = data.content || "";
        this.currentCatId = data.category_id || null;
        this.currentCatName = data.category_name || null;
        this.currentCatColor = data.category_color || null;
        this.currentTags = (data.tags || []).map((t) => ({
          id: parseInt(t.id),
          name: t.name,
          color_hex: t.color_hex,
        }));
        this.attachments = (data.attachments || []).map((a) => ({
          id: parseInt(a.id),
          file_path: a.file_path,
          file_type: a.file_type,
          original_name: a.original_name || a.file_path.split("/").pop(),
        }));
        this.$nextTick(() => {
          const el = this.$refs.contentEditor;
          if (el) el.innerHTML = this.editContent;
        });
      }
      this.loading = false;
    },

      exportMarkdown() {
          // HTML → plain text konverzió (alapvető tagek eltávolítása)
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = this.editContent;

          // Listák, törések kezelése Markdown-szerűen
          tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
          tempDiv.querySelectorAll('li').forEach(li => {
            li.prepend('- ');
            li.append('\n');
          });
          tempDiv.querySelectorAll('b, strong').forEach(el => {
            el.prepend('**'); el.append('**');
          });
          tempDiv.querySelectorAll('i, em').forEach(el => {
            el.prepend('_'); el.append('_');
          });
          tempDiv.querySelectorAll('u').forEach(el => {
            el.prepend('__'); el.append('__');
          });

          const contentText = tempDiv.innerText || tempDiv.textContent || '';

          // Metaadatok összeállítása
          const lines = [];
          lines.push(`# ${this.editTitle}`);
          lines.push('');

          if (this.currentCatName) {
            lines.push(`**Kategória:** ${this.currentCatName}`);
          }
          if (this.currentTags.length) {
            lines.push(`**Tagek:** ${this.currentTags.map(t => '#' + t.name).join(' ')}`);
          }
          if (this.entry.type) {
            lines.push(`**Típus:** ${this.typeName}`);
          }

          lines.push('');
          lines.push('---');
          lines.push('');
          lines.push(contentText.trim());

          const mdContent = lines.join('\n');

          // Fájlnév: entry cím, érvénytelen karakterek eltávolítva
          const safeTitle = this.editTitle.replace(/[\\/:*?"<>|]/g, '_').trim() || 'entry';
          const filename = `${safeTitle}.md`;

          // Letöltés
          const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      },

    fmt(cmd) {
      document.execCommand(cmd, false, null);
    },
    fsize(dir) {
      this.currentFontSize = Math.max(
        1,
        Math.min(7, this.currentFontSize + dir),
      );
      document.execCommand("fontSize", false, this.currentFontSize);
    },
    changeFont(e) {
      document.execCommand("fontName", false, e.target.value);
    },

    async save() {
      this.saving = true;
      this.saveSuccess = false;
      
      // Tartalom kiolvasása – ha a contenteditable elérhető, onnan; egyébként editContent fallback
      const editorEl = this.$refs.contentEditor;
      let content;
      if (editorEl && editorEl.innerHTML) {
        const html = editorEl.innerHTML;
        // Üres editor ellenőrzés (csak <br> vagy üres div)
        const isEmpty = !html || html === '<br>' || html === '<div><br></div>';
        content = isEmpty ? (this.editContent || "") : html;
      } else {
        content = this.editContent || "";
      }

      const res = await ApiService.updateEntry({
        id: this.entryId,
        title: this.editTitle,
        content,
      });
      this.saving = false;
      if (res && !res.error) {
        this.saveSuccess = true;
        this.entry.title = this.editTitle;
        this.entry.content = content;
        this.editContent = content;
        // Frissítjük a Store-t az entry csoportja alapján
        const entryGroupId = this.entry.group_id;
        if (entryGroupId && parseInt(entryGroupId) !== Store.currentGroupId) {
          Store.currentGroupId = parseInt(entryGroupId);
        }
        await Store.loadCurrentGroup();
        await Store.loadGroups();
        setTimeout(() => {
          this.saveSuccess = false;
        }, 2000);
      } else {
        alert("Mentési hiba: " + (res?.error || "Ismeretlen hiba"));
      }
    },
    async deleteEntry() {
      if (!confirm(`Biztosan törlöd: "${this.entry.title}"?`)) return;
      await ApiService.deleteEntry(this.entryId);
      await Store.loadCurrentGroup();
      this.$router.push({ name: "graph" });
    },
    goBack() {
      this.$router.push({ name: "graph" });
    },
    openCatPicker(e) {
      this.pickerOpen = "cat";
      this.pickerSearch = "";
    },
    openTagPicker(e) {
      this.pickerOpen = "tag";
      this.pickerSearch = "";
    },
    async selectCategory(cat) {
      await ApiService.assignCategory(this.entryId, cat.id);
      this.currentCatId = cat.id;
      this.currentCatName = cat.name;
      this.currentCatColor = cat.color_hex;
      this.pickerOpen = null;
    },
    async selectTag(tag) {
      if (this.currentTags.find((t) => t.id === tag.id)) {
        this.pickerOpen = null;
        return;
      }
      await ApiService.assignTag(this.entryId, tag.id);
      this.currentTags.push({
        id: tag.id,
        name: tag.name,
        color_hex: tag.color_hex,
      });
      this.pickerOpen = null;
    },
    async removeTag(tagId) {
      await ApiService.unassignTag(this.entryId, tagId);
      this.currentTags = this.currentTags.filter((t) => t.id !== tagId);
    },
    async createPickerItem() {
      const name = this.pickerSearch.trim();
      if (
        !name ||
        this.allCategories.some(
          (c) => c.name.toLowerCase() === name.toLowerCase(),
        ) ||
        this.allTags.some((t) => t.name.toLowerCase() === name.toLowerCase())
      )
        return alert("Nem lehet üres vagy már létezik");
      if (this.pickerOpen === "cat") {
        await ApiService.createCategory({ name, color_hex: "#5c6bc0" });
        const cats = await ApiService.getCategories();
        this.allCategories = cats || [];
      } else {
        await ApiService.createTag({ name, color_hex: "#ff9800" });
        const tags = await ApiService.getTags();
        this.allTags = tags || [];
      }
      this.pickerSearch = "";
    },
    closePicker() {
      this.pickerOpen = null;
    },
    isImage(att) {
      return att.file_type && this.IMAGE_TYPES.includes(att.file_type);
    },
    fileIcon(mime) {
      if (!mime) return "📎";
      if (mime.startsWith("image")) return "🖼️";
      if (mime.startsWith("video")) return "🎬";
      if (mime.startsWith("audio")) return "🎵";
      if (mime === "application/pdf") return "📄";
      return "📝";
    },
    async uploadFile(event) {
      for (const file of event.target.files) {
        const res = await ApiService.uploadAttachment(this.entryId, file);
        if (res && !res.error)
          this.attachments.push({
            id: parseInt(res.id),
            file_path: res.file_path,
            file_type: res.file_type,
            original_name: res.original_name,
          });
      }
      event.target.value = "";
    },
    async deleteAttachment(att) {
      const res = await ApiService.deleteAttachment(att.id);
      if (res && !res.error)
        this.attachments = this.attachments.filter((a) => a.id !== att.id);
    },
    openLightbox(att) {
      this.lightboxSrc = att.file_path;
      this.lightboxOpen = true;
    },
  },
};
