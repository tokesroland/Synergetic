const RoutineView = {
  template: "#tpl-routine-view",
  data() {
    return {
      items: [],          // a mai dátumra FELOLDOTT rutinok (megjelenítéshez)
      rawItems: [],       // nyers routine_items (szerkesztéshez)
      completions: [],
      categories: [],
      currentView: "week",
      selectedDow: null,
      todayDate: new Date(),
      isMobile: false,
      DAYS_SHORT: ["Hé", "Ke", "Sze", "Cs", "Pé", "Szo", "Va"],
      DAYS_FULL: [
        "Hétfő",
        "Kedd",
        "Szerda",
        "Csütörtök",
        "Péntek",
        "Szombat",
        "Vasárnap",
      ],
      TL_START: 3,
      TL_END: 23,
      typeColors: {
        todo: "#4caf50",
        event: "#ff9800",
        break: "#78909c",
        habit: "#ab47bc",
      },
      timelineOpen: true,
      modalOpen: false,
      editItem: null,
      form: {
        title: "",
        type: "todo",
        day_of_week: [],
        start_time: "09:00",
        end_time: "10:00",
        category_id: "",
        color_hex: "",
      },
      dayPills: [1, 2, 3, 4, 5, 6, 7],

      // ── ÚJ: Kivétel kezelés ──
      exceptionFormOpen: false,
      existingExceptions: [],
      exceptionForm: {
        mode: "time",        // 'time' = új időpont | 'day' = másik nap | 'skip' = lemondás
        occurrences: 1,      // a következő N előfordulás
        new_start_time: "09:00",
        new_end_time: "10:00",
        new_day_of_week: null,
      },
    };
  },
  computed: {
    store() {
      return Store;
    },
    isLoggedIn() {
      return Store.isLoggedIn;
    },
    todayDow() {
      const d = this.todayDate.getDay();
      return d === 0 ? 7 : d;
    },
    weekDisplay() {
      const mon = this.getMondayDate(),
        sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const ms = [
        "Jan",
        "Feb",
        "Már",
        "Ápr",
        "Máj",
        "Jún",
        "Júl",
        "Aug",
        "Szept",
        "Okt",
        "Nov",
        "Dec",
      ];
      return `${mon.getFullYear()}. ${ms[mon.getMonth()]} ${mon.getDate()}. – ${ms[sun.getMonth()]} ${sun.getDate()}.`;
    },
    weekDays() {
      const days = [];
      for (let dow = 1; dow <= 7; dow++) {
        const dateForDay = this.getDateForDow(dow);
        const dayItems = this.items
          .filter((i) => i.day_of_week == dow)
          .sort(
            (a, b) =>
              this.timeToMin(a.start_time) - this.timeToMin(b.start_time),
          );
        days.push({
          dow,
          name: this.DAYS_SHORT[dow - 1],
          fullName: this.DAYS_FULL[dow - 1],
          date: dateForDay,
          dayNum: dateForDay.getDate(),
          isToday: dow === this.todayDow,
          items: dayItems,
        });
      }
      return days;
    },
    selectedDayItems() {
      if (!this.selectedDow) return [];
      return this.items
        .filter((i) => i.day_of_week == this.selectedDow)
        .sort(
          (a, b) => this.timeToMin(a.start_time) - this.timeToMin(b.start_time),
        );
    },
    totalItems() {
      return this.items.length;
    },
    uniqueRoutineNames() {
      const map = new Map();
      this.items.forEach((item) => {
        if (!map.has(item.title)) {
          map.set(item.title, this.getItemColor(item));
        }
      });
      return Array.from(map, ([name, color]) => ({ name, color }));
    },
    // ── ÚJ: a kivétel-űrlap napjai (pill választóhoz) ──
    exceptionDayPills() {
      return [1, 2, 3, 4, 5, 6, 7];
    },
  },
  async mounted() {
    this.checkMobile();
    window.addEventListener("resize", this.checkMobile);
    const r = getComputedStyle(document.documentElement);
    this.typeColors.todo =
      r.getPropertyValue("--node-task").trim() || this.typeColors.todo;
    this.typeColors.event =
      r.getPropertyValue("--node-event").trim() || this.typeColors.event;
    if (this.isLoggedIn) {
      await this.loadAll();
    }
  },
  watch: {
    isLoggedIn(val) {
      if (val) this.loadAll();
    },
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.checkMobile);
  },
  methods: {
    checkMobile() {
      this.isMobile = window.innerWidth < 900;
    },
    openAuthRegister() {
      Store.openAuthModal('register');
    },
    async loadAll() {
      // Háttérben deaktiváljuk a lejárt kivételeket (audit célból megmaradnak)
      ApiService.deactivateExpiredRoutineExceptions();

      const todayStr     = this.getDateStr();
      const weekStartStr = this.getDateStr(this.getMondayDate());

      const [items, rawItems, completions, cats] = await Promise.all([
        // HETI feloldott lista – minden rutin a saját napjának dátumán
        // kapja a kivétel-feloldást (idő/nap módosítás, skip).
        ApiService.getRoutineAll(null, weekStartStr),
        // NYERS lista (szerkesztéshez, kivétel nélkül)
        ApiService.getRoutineAll(),
        ApiService.getRoutineCompletions(todayStr),
        ApiService.getCategories(),
      ]);
      this.items = items || [];
      this.rawItems = rawItems || [];
      this.completions = (completions || []).map(
        (c) => c.routine_item_id || c.id,
      );
      this.categories = cats || [];
    },
    getDateStr(date) {
      if (!date) date = this.todayDate;
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    },
    getMondayDate() {
      const d = new Date(this.todayDate),
        day = d.getDay();
      d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
      d.setHours(0, 0, 0, 0);
      return d;
    },
    getDateForDow(dow) {
      const mon = this.getMondayDate(),
        d = new Date(mon);
      d.setDate(mon.getDate() + (dow - 1));
      return d;
    },
    getItemColor(item) {
      return (
        item.color_hex ||
        item.category_color ||
        this.typeColors[item.type] ||
        "#888"
      );
    },
    timeToMin(t) {
      if (!t) return 0;
      const p = t.split(":");
      return parseInt(p[0]) * 60 + parseInt(p[1]);
    },
    fmtTime(t) {
      if (!t) return "";
      return t.substring(0, 5);
    },
    isCompleted(id) {
      return this.completions.includes(id);
    },
    async toggleCompletion(item) {
      await ApiService.toggleRoutineCompletion(item.id, this.getDateStr());
      const idx = this.completions.indexOf(item.id);
      if (idx >= 0) this.completions.splice(idx, 1);
      else this.completions.push(item.id);
    },
    showDay(dow) {
      this.selectedDow = dow;
      this.currentView = "day";
    },
    showWeek() {
      this.currentView = "week";
    },
    goBack() {
      this.$router.push({ name: "graph" });
    },
    toggleTimeline() {
      this.timelineOpen = !this.timelineOpen;
    },
    tlTooltip(item) {
      return `${item.title} (${this.fmtTime(item.start_time)}–${this.fmtTime(item.end_time)})`;
    },
    tlBarStyle(item) {
      const totalMin = (this.TL_END - this.TL_START) * 60;
      const startMin = this.timeToMin(item.start_time) - this.TL_START * 60;
      const endMin = this.timeToMin(item.end_time) - this.TL_START * 60;
      const left = Math.max(0, (startMin / totalMin) * 100);
      const width = Math.max(1, ((endMin - startMin) / totalMin) * 100);
      return {
        left: left + "%",
        width: width + "%",
        background: this.getItemColor(item),
      };
    },
    // ── SEGÉD: a nyers (kivétel nélküli) item megkeresése id alapján ──
    findRawItem(id) {
      return this.rawItems.find((i) => i.id == id) || null;
    },
    openCreateModal(dow) {
      this.editItem = null;
      this.form = {
        title: "",
        type: "todo",
        day_of_week: dow ? [dow] : [this.todayDow],
        start_time: "09:00",
        end_time: "10:00",
        category_id: "",
        color_hex: "",
      };
      // Kivétel szekció zárva új elemnél (még nincs id)
      this.exceptionFormOpen = false;
      this.existingExceptions = [];
      this.modalOpen = true;
    },
    async openEditModal(item) {
      // Szerkesztésnél MINDIG a nyers ütemezésből indulunk, hogy a
      // kivétellel feloldott (módosított) idő ne íródjon vissza alapként.
      const raw = this.findRawItem(item.id) || item;
      this.editItem = raw;
      this.form = {
        title: raw.title,
        type: raw.type,
        day_of_week: [raw.day_of_week],
        start_time: raw.start_time || "09:00",
        end_time: raw.end_time || "10:00",
        category_id: raw.category_id || "",
        color_hex: raw.color_hex || "",
      };
      // Kivétel-űrlap alaphelyzet
      this.exceptionFormOpen = false;
      this.resetExceptionForm(raw);
      this.modalOpen = true;
      // Meglévő kivételek betöltése ehhez a rutinhoz
      await this.loadExceptions(raw.id);
    },
    closeModal() {
      this.modalOpen = false;
      this.editItem = null;
      this.exceptionFormOpen = false;
      this.existingExceptions = [];
    },
    toggleDayPill(dow) {
      const idx = this.form.day_of_week.indexOf(dow);
      if (idx >= 0) this.form.day_of_week.splice(idx, 1);
      else this.form.day_of_week.push(dow);
    },
    isDaySelected(dow) {
      return this.form.day_of_week.includes(dow);
    },
    async saveItem() {
      if (!this.form.title.trim()) {
        alert("A megnevezés kötelező!");
        return;
      }
      if (this.editItem) {
        await ApiService.updateRoutineItem({
          id: this.editItem.id,
          title: this.form.title,
          type: this.form.type,
          day_of_week: this.form.day_of_week[0] || this.editItem.day_of_week,
          start_time: this.form.start_time,
          end_time: this.form.end_time,
          category_id: this.form.category_id || null,
          color_hex: this.form.color_hex || null,
        });
      } else {
        for (const dow of this.form.day_of_week) {
          await ApiService.createRoutineItem({
            title: this.form.title,
            type: this.form.type,
            day_of_week: dow,
            start_time: this.form.start_time,
            end_time: this.form.end_time,
            category_id: this.form.category_id || null,
            color_hex: this.form.color_hex || null,
          });
        }
      }
      this.closeModal();
      await this.loadAll();
    },
    async deleteItem(item) {
      if (!confirm(`Törlöd: "${item.title}"?`)) return;
      await ApiService.deleteRoutineItem(item.id);
      await this.loadAll();
    },

    /* ============================================================
     *  ===== ÚJ: KIVÉTEL KEZELÉS =====
     * ============================================================ */

    resetExceptionForm(raw) {
      const base = raw || this.editItem || {};
      this.exceptionForm = {
        mode: "time",
        occurrences: 1,
        new_start_time: base.start_time
          ? base.start_time.substring(0, 5)
          : "09:00",
        new_end_time: base.end_time ? base.end_time.substring(0, 5) : "10:00",
        new_day_of_week: base.day_of_week || this.todayDow,
      };
    },

    toggleExceptionForm() {
      this.exceptionFormOpen = !this.exceptionFormOpen;
      if (this.exceptionFormOpen) {
        this.resetExceptionForm(this.editItem);
      }
    },

    async loadExceptions(routineItemId) {
      if (!routineItemId) {
        this.existingExceptions = [];
        return;
      }
      const list = await ApiService.getRoutineExceptions(routineItemId);
      this.existingExceptions = list || [];
    },

    excSummary(ex) {
      // Olvasható összefoglaló egy kivételhez (lista megjelenítéshez)
      const used = ex.used != null ? ex.used : ex.occurrences - ex.remaining;
      const status = ex.is_active == 1 ? "" : " · (lejárt)";
      if (ex.is_skip == 1) {
        return `Lemondás · ${ex.occurrences} alkalom (felhasznált: ${used})${status}`;
      }
      const parts = [];
      if (ex.new_day_of_week) {
        parts.push(`→ ${this.DAYS_FULL[ex.new_day_of_week - 1]}`);
      }
      if (ex.new_start_time || ex.new_end_time) {
        parts.push(
          `${this.fmtTime(ex.new_start_time)}–${this.fmtTime(ex.new_end_time)}`,
        );
      }
      return `${parts.join(" ")} · ${ex.occurrences} alkalom (felhasznált: ${used})${status}`;
    },

    async saveException() {
      if (!this.editItem || !this.editItem.id) {
        alert("Előbb mentsd el a rutint, utána adhatsz hozzá kivételt!");
        return;
      }
      const occ = parseInt(this.exceptionForm.occurrences, 10);
      if (!occ || occ < 1) {
        alert("Az alkalmak száma legalább 1 legyen!");
        return;
      }

      const payload = {
        routine_item_id: this.editItem.id,
        occurrences: occ,
        is_skip: 0,
        new_day_of_week: null,
        new_start_time: null,
        new_end_time: null,
      };

      if (this.exceptionForm.mode === "skip") {
        payload.is_skip = 1;
      } else if (this.exceptionForm.mode === "day") {
        payload.new_day_of_week = this.exceptionForm.new_day_of_week;
        // napváltáskor az időt is átvihetjük, ha a user módosította
        payload.new_start_time = this.exceptionForm.new_start_time || null;
        payload.new_end_time = this.exceptionForm.new_end_time || null;
      } else {
        // 'time' – csak időpont
        payload.new_start_time = this.exceptionForm.new_start_time || null;
        payload.new_end_time = this.exceptionForm.new_end_time || null;
      }

      const res = await ApiService.createRoutineException(payload);
      if (res && res.error) {
        alert(res.error);
        return;
      }
      this.exceptionFormOpen = false;
      await this.loadExceptions(this.editItem.id);
      await this.loadAll();
    },

    async deactivateExc(ex) {
      if (!confirm("Biztosan deaktiválod ezt a kivételt? (előzményként megmarad)"))
        return;
      await ApiService.deactivateRoutineException(ex.id);
      await this.loadExceptions(this.editItem.id);
      await this.loadAll();
    },

    async deleteExc(ex) {
      if (!confirm("Véglegesen törlöd ezt a kivételt? Ez nem visszavonható."))
        return;
      await ApiService.deleteRoutineException(ex.id);
      await this.loadExceptions(this.editItem.id);
      await this.loadAll();
    },
  },
};
