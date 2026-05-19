/**
 * DetailsView v4 – Todo: tervezett kezdés + határidő kiírás, állítható status enum
 * (active / completed / archived). Minden korábbi funkció megőrizve.
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
      currentCatId: null,
      currentCatName: null,
      currentCatColor: null,
      currentLocId: null,
      currentLocName: null,
      allLocations: [],
      allCategories: [],
      allTags: [],
      pickerOpen: null,
      pickerSearch: "",
      pickerAnchor: null,
      lightboxOpen: false,
      lightboxSrc: "",
      currentFontSize: 3,
      todoStatus: "active",
      todoPlannedStart: null,
      todoDeadline: null,
      eventStartDatetime: null,
      eventEndDatetime: null,
      eventIsAllDay: 0,
      eventDate: null,
      STATUS_OPTIONS: [
        { value: "active", label: "Aktív" },
        { value: "completed", label: "Kész" },
        { value: "archived", label: "Archivált" },
      ],
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
    isLoggedIn() {
      return Store.isLoggedIn;
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
    isTodo() {
      return this.entry && this.entry.type === "todo";
    },
    isEvent() {
      return this.entry && this.entry.type === 'event';
    },
    // Magyar formázott tervezett kezdés
    fmtPlannedStart() {
      return this.formatDateTime(this.todoPlannedStart);
    },
    // Magyar formázott határidő
    fmtDeadline() {
      return this.formatDateTime(this.todoDeadline);
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
    // Datetime → "2026. 03. 28. 14:30" formátum (idő csak ha van)
    formatDateTime(val) {
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

    async loadEntry() {
      this.loading = true;
      const [cats, tags, locs] = await Promise.all([
        ApiService.getCategories(),
        ApiService.getTags(),
        ApiService.getLocations ? ApiService.getLocations() : Store.locations,
      ]);
      this.allCategories = cats || [];
      this.allTags = tags || [];
      this.allLocations = locs || Store.locations || [];

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

        if (data.type === "event" && data.event_details) {
          this.currentLocId = data.event_details.location_id || null;
          this.currentLocName = data.event_details.location_name || null; // Feltételezve, hogy a backend visszaadja a nevet joins-al
        } else {
          this.currentLocId = null;
          this.currentLocName = null;
        }

        if (data.type === "todo" && data.todo_details) {
          this.todoStatus = data.todo_details.status || "active";
          this.todoPlannedStart = data.todo_details.planned_start || null;
          this.todoDeadline = data.todo_details.deadline || null;
        } else {
          this.todoStatus = "active";
          this.todoPlannedStart = null;
          this.todoDeadline = null;
        }

        // ── ÚJ: Event részletek betöltése ──
        if (data.type === "event" && data.event_details) {
          this.eventIsAllDay = parseInt(data.event_details.is_all_day) || 0;
          if (this.eventIsAllDay === 1) {
            // "2026-05-19 00:00:00" -> "2026-05-19" (HTML date input formátum)
            this.eventDate = data.event_details.start_datetime ? data.event_details.start_datetime.substring(0, 10) : '';
          } else {
            // "2026-05-19 14:30:00" -> "2026-05-19T14:30" (HTML datetime-local formátum)
            this.eventStartDatetime = data.event_details.start_datetime ? data.event_details.start_datetime.substring(0, 16).replace(' ', 'T') : '';
            this.eventEndDatetime = data.event_details.end_datetime ? data.event_details.end_datetime.substring(0, 16).replace(' ', 'T') : '';
          }
        } else {
          this.eventIsAllDay = 0;
          this.eventDate = null;
          this.eventStartDatetime = null;
          this.eventEndDatetime = null;
        }

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

          // Sorvégi sortörések normalizálása
          tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
          
          // Bekezdések kezelése (körül sortöréseket adunk)
          tempDiv.querySelectorAll('p').forEach(p => {
            p.append('\n\n');
          });
          
          // DIV-ek kezelése (ha nem lista része)
          tempDiv.querySelectorAll('div').forEach(div => {
            if (!div.querySelector('li')) {
              div.append('\n');
            }
          });
          
          // Listák kezelése Markdown-szerűen
          tempDiv.querySelectorAll('li').forEach(li => {
            li.prepend('- ');
            li.append('\n');
          });
          
          // Formázási tagek kezelése
          tempDiv.querySelectorAll('b, strong').forEach(el => {
            el.prepend('**');
            el.append('**');
          });
          tempDiv.querySelectorAll('i, em').forEach(el => {
            el.prepend('_');
            el.append('_');
          });
          tempDiv.querySelectorAll('u').forEach(el => {
            el.prepend('__');
            el.append('__');
          });

          let contentText = tempDiv.innerText || tempDiv.textContent || '';
          
          // Sortörések normalizálása (3+ üres sor → 2 üres sor)
          contentText = contentText.replace(/\n\n\n+/g, '\n\n');
          contentText = contentText.trim();

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
          if (this.isTodo) {
            const sl = (this.STATUS_OPTIONS.find(s => s.value === this.todoStatus) || {}).label || this.todoStatus;
            lines.push(`**Állapot:** ${sl}`);
            if (this.fmtPlannedStart) lines.push(`**Tervezett kezdés:** ${this.fmtPlannedStart}`);
            if (this.fmtDeadline) lines.push(`**Határidő:** ${this.fmtDeadline}`);
          }

          lines.push('');
          lines.push('---');
          lines.push('');
          lines.push(contentText);

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

      const payload = {
        id: this.entryId,
        title: this.editTitle,
        content,
      };
      // ── todo esetén az állapotot és a dátumokat is mentjük ──
      if (this.isTodo) {
        payload.status = this.todoStatus;
        payload.planned_start = this.todoPlannedStart;
        payload.deadline = this.todoDeadline;
      }

      // ──  event esetén is mentjük a dátumokat ──
      if (this.isEvent) {
        if (this.eventIsAllDay === 1) {
          payload.start_datetime = this.eventDate;
          payload.end_datetime = this.eventDate; 
        } else {
          payload.start_datetime = this.eventStartDatetime;
          payload.end_datetime = this.eventEndDatetime;
        }
      }

      const res = await ApiService.updateEntry(payload);
      
      // ── JAVÍTVA: todo esetén az állapotot és a dátumokat is mentjük ──
      if (this.isTodo) {
        payload.status = this.todoStatus;
        payload.planned_start = this.todoPlannedStart;
        payload.deadline = this.todoDeadline;
      }

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
        
        // Soft-delete: ha archiváltuk, a Store újratöltésével eltűnik a gráfról
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
