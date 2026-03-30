/**
 * RoutineView v3 – Fixed: idővonal, tooltip, multi-day, alsó sáv rutinnevekkel
 */
const RoutineView = {
  template: "#tpl-routine-view",
  data() {
    return {
      items: [],
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
      TL_START: 5,
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
    };
  },
  computed: {
    store() {
      return Store;
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
    // Egyedi rutin nevek összegyűjtése az alsó sávhoz
    uniqueRoutineNames() {
      const map = new Map();
      this.items.forEach((item) => {
        if (!map.has(item.title)) {
          map.set(item.title, this.getItemColor(item));
        }
      });
      return Array.from(map, ([name, color]) => ({ name, color }));
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
    await this.loadAll();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.checkMobile);
  },
  methods: {
    checkMobile() {
      this.isMobile = window.innerWidth < 900;
    },
    async loadAll() {
      const [items, completions, cats] = await Promise.all([
        ApiService.getRoutineAll(),
        ApiService.getRoutineCompletions(this.getDateStr()),
        ApiService.getCategories(),
      ]);
      this.items = items || [];
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
    // Tooltip szöveg
    tlTooltip(item) {
      return `${item.title} (${this.fmtTime(item.start_time)}–${this.fmtTime(item.end_time)})`;
    },
    // Timeline bar pozíció
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
    // Modal - multi day selection
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
      this.modalOpen = true;
    },
    openEditModal(item) {
      this.editItem = item;
      this.form = {
        title: item.title,
        type: item.type,
        day_of_week: [item.day_of_week],
        start_time: item.start_time || "09:00",
        end_time: item.end_time || "10:00",
        category_id: item.category_id || "",
        color_hex: item.color_hex || "",
      };
      this.modalOpen = true;
    },
    closeModal() {
      this.modalOpen = false;
      this.editItem = null;
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
        // Edit: csak az eredeti napra
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
        // Create: minden kiválasztott napra
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
  },
};
