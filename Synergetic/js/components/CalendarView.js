/**
 * CalendarView v4 – Multi-day EVENT span vonalak a havi nézetben
 * Változások:
 *  - multiDayEvents computed: tól-ig event-ek azonosítása
 *  - multiDaySpans computed: soronkénti vonal adatok (row, colStart, colEnd, lane, color)
 *  - monthCells: multi-day event-ek kizárva a dots-ból (csak vonal jelzi őket)
 */
const CalendarView = {
  template: "#tpl-calendar-view",
  data() {
    return {
      date: new Date(),
      selected: new Date(),
      view: "month",
      entries: [],
      H: 56,
      MONTHS: [
        "Január", "Február", "Március", "Április", "Május", "Június",
        "Július", "Augusztus", "Szeptember", "Október", "November", "December",
      ],
      DAYS_S: ["H", "K", "Sze", "Cs", "P", "Szo", "V"],
      DAYS_F: [
        "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap",
      ],
      names: {
        task: "Feladat",
        todo: "Feladat",
        event: "Esemény",
        note: "Jegyzet",
      },
      dividerDragging: false,
      gridFlex: 55,
      nowInterval: null,
      // Gyors bejegyzés form
      quickAddOpen: false,
      quickAddTitle: "",
      quickAddType: "event",
      quickAddStart: "",
      quickAddEnd: "",
      quickAddDeadline: "",
      quickAddError: "",
      quickAddSaving: false,
      quickAddTypes: [
        { value: "event", label: "Esemény" },
        { value: "todo",  label: "Feladat" },
        { value: "note",  label: "Jegyzet" },
      ],
    };
  },
  computed: {
    store() { return Store; },
    colors() { return Store.colors; },

    title() {
      const y = this.date.getFullYear(), m = this.date.getMonth();
      if (this.view === "month") return `${y}. ${this.MONTHS[m]}`;
      if (this.view === "week") {
        const mon = this.getMonday(this.date), sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        const s = `${this.MONTHS[mon.getMonth()]} ${mon.getDate()}.`;
        const e = mon.getMonth() !== sun.getMonth()
          ? `${this.MONTHS[sun.getMonth()]} ${sun.getDate()}.`
          : `${sun.getDate()}.`;
        return `${y}. ${s} – ${e}`;
      }
      return `${y}. ${this.MONTHS[m]} ${this.date.getDate()}., ${this.DAYS_F[this.dayIdx(this.date)]}`;
    },

    // ─── Tól-ig (multi-day) EVENT entry-k ──────────────────────────────────
    multiDayEvents() {
      return this.entries.filter((e) => {
        if (e.type !== "event") return false;
        if (!e.start_datetime || !e.end_datetime) return false;
        const s = new Date(e.start_datetime.replace(" ", "T"));
        const en = new Date(e.end_datetime.replace(" ", "T"));
        s.setHours(0, 0, 0, 0);
        en.setHours(0, 0, 0, 0);
        return en > s; // legalább 2 különböző nap
      });
    },

    // ─── Havi nézet cellák ──────────────────────────────────────────────────
    monthCells() {
      const year = this.date.getFullYear(),
        month = this.date.getMonth(),
        startOfs = (new Date(year, month, 1).getDay() + 6) % 7,
        dim = new Date(year, month + 1, 0).getDate(),
        prevDays = new Date(year, month, 0).getDate(),
        total = Math.ceil((startOfs + dim) / 7) * 7,
        cells = [];

      // Multi-day event ID-k halmaza — ezek NEM jelennek meg pontként
      const multiDayIds = new Set(this.multiDayEvents.map((e) => e.id));

      for (let i = 0; i < total; i++) {
        let cellDate, isOther = false;
        if (i < startOfs) {
          cellDate = new Date(year, month - 1, prevDays - startOfs + 1 + i);
          isOther = true;
        } else if (i >= startOfs + dim) {
          cellDate = new Date(year, month + 1, i - startOfs - dim + 1);
          isOther = true;
        } else {
          cellDate = new Date(year, month, i - startOfs + 1);
        }

        // Multi-day event-ek kizárva a dots-ból
        const de = this.entriesForDate(cellDate).filter(
          (e) => !multiDayIds.has(e.id)
        );

        cells.push({
          date: cellDate,
          day: cellDate.getDate(),
          isOther,
          isToday: this.isToday(cellDate),
          isSelected: this.sameDay(cellDate, this.selected),
          dots: de.slice(0, 4).map((e) => this.col(e.type)),
        });
      }
      return cells;
    },

    // ─── Multi-day span vonalak soronként ────────────────────────────────────
    // Minden span egy vonal-szegmens az adott heti sorban:
    //   row       : sor index (0-alapú)
    //   colStart  : oszlop index (0-6) ahol a vonal kezdődik ezen a soron
    //   colEnd    : oszlop index (0-6) ahol a vonal végződik ezen a soron
    //   isStart   : ez a szegmens az event valódi kezdőnapján indul
    //   isEnd     : ez a szegmens az event valódi zárónapján ér véget
    //   lane      : sáv index (0=legalsó, 1,2...) ha több event átfedi egymást
    //   color     : az event színe
    //   entryId   : az event ID-ja
    multiDaySpans() {
      if (!this.monthCells.length) return [];

      const cells = this.monthCells;
      const totalRows = cells.length / 7;
      const spans = [];

      for (const ev of this.multiDayEvents) {
        const evStart = new Date(ev.start_datetime.replace(" ", "T"));
        const evEnd   = new Date(ev.end_datetime.replace(" ", "T"));
        evStart.setHours(0, 0, 0, 0);
        evEnd.setHours(0, 0, 0, 0);

        for (let row = 0; row < totalRows; row++) {
          const rowFirstCell = cells[row * 7].date;
          const rowLastCell  = cells[row * 7 + 6].date;
          const rs = new Date(rowFirstCell); rs.setHours(0, 0, 0, 0);
          const re = new Date(rowLastCell);  re.setHours(0, 0, 0, 0);

          // Az event átfedi ezt a sort?
          if (evEnd < rs || evStart > re) continue;

          // A sor beli tényleges start/end dátum
          const spanStart = evStart >= rs ? evStart : rs;
          const spanEnd   = evEnd   <= re ? evEnd   : re;

          // Oszlop indexek meghatározása
          let colStart = -1, colEnd = -1;
          for (let col = 0; col < 7; col++) {
            const cellD = new Date(cells[row * 7 + col].date);
            cellD.setHours(0, 0, 0, 0);
            if (cellD.getTime() === spanStart.getTime()) colStart = col;
            if (cellD.getTime() === spanEnd.getTime())   colEnd   = col;
          }
          if (colStart < 0 || colEnd < 0 || colEnd < colStart) continue;

          spans.push({
            row,
            colStart,
            colEnd,
            color: this.col(ev.type),
            entryId: ev.id,
            isStart: evStart.getTime() === spanStart.getTime(),
            isEnd:   evEnd.getTime()   === spanEnd.getTime(),
            lane: 0, // lane kiosztás lentebb
          });
        }
      }

      // Lane kiosztás: ugyanazon sorban lévő, átfedő spanok külön lane-re kerülnek
      // Lane 0 = legalsó sáv (margin-bottom:2px), 1,2... felfelé tolódnak
      const rowLaneSlots = {}; // row → lane → foglalt intervallumok tömbje
      for (const span of spans) {
        const r = span.row;
        if (!rowLaneSlots[r]) rowLaneSlots[r] = [];
        let lane = 0;
        while (true) {
          if (!rowLaneSlots[r][lane]) rowLaneSlots[r][lane] = [];
          const occupied = rowLaneSlots[r][lane];
          const overlaps = occupied.some(
            (o) => !(span.colEnd < o.colStart || span.colStart > o.colEnd)
          );
          if (!overlaps) {
            occupied.push({ colStart: span.colStart, colEnd: span.colEnd });
            span.lane = lane;
            break;
          }
          lane++;
        }
      }

      return spans;
    },

    agendaTodos() { return this.todoFor(this.selected); },

    agendaEvents() {
      return this.entriesForDate(this.selected)
        .filter((e) => e.type !== "todo")
        .sort(
          (a, b) =>
            new Date(a.start_datetime?.replace(" ", "T") || 0) -
            new Date(b.start_datetime?.replace(" ", "T") || 0)
        );
    },

    weekDays() {
      const mon = this.getMonday(this.date), days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        days.push({
          date: d,
          dayName: this.DAYS_S[i],
          dayNum: d.getDate(),
          isToday: this.isToday(d),
          entries: this.entriesForDate(d).filter((e) => e.type !== "todo"),
        });
      }
      return days;
    },

    isDayToday() { return this.isToday(this.date); },
    dayAlldayEntries() { return this.alldayFor(this.date); },
    dayTimedEntries() { return this.timedFor(this.date); },
    dayTodos() { return this.todoFor(this.date); },
    hours24() { return Array.from({ length: 24 }, (_, i) => i); },
  },

  methods: {
    async loadEntries() {
      try {
        const data = await ApiService.getCalendarEntries();
        this.entries = data || [];
      } catch (e) {
        console.error("Naptár betöltési hiba:", e);
      }
    },

    entriesForDate(date) {
      const t = new Date(date);
      t.setHours(0, 0, 0, 0);
      return this.entries.filter((e) => {
        if (e.type === "todo") {
          if (e.start_datetime) {
            const ps = new Date(e.start_datetime.replace(" ", "T"));
            ps.setHours(0, 0, 0, 0);
            if (t.getTime() === ps.getTime()) return true;
          }
          if (e.end_datetime) {
            const dl = new Date(e.end_datetime.replace(" ", "T"));
            dl.setHours(0, 0, 0, 0);
            if (t.getTime() === dl.getTime()) return true;
          }
          return false;
        }
        if (!e.start_datetime) return false;
        const s = new Date(e.start_datetime.replace(" ", "T"));
        s.setHours(0, 0, 0, 0);
        if (e.end_datetime) {
          const end = new Date(e.end_datetime.replace(" ", "T"));
          end.setHours(0, 0, 0, 0);
          return t >= s && t <= end;
        }
        return t.getTime() === s.getTime();
      });
    },

    timedFor(d) {
      return this.entriesForDate(d).filter(
        (e) => !this.isAllDay(e) && e.type !== "todo"
      );
    },
    alldayFor(d) {
      return this.entriesForDate(d).filter(
        (e) => this.isAllDay(e) && e.type !== "todo"
      );
    },
    todoFor(d) {
      return this.entriesForDate(d).filter((e) => e.type === "todo");
    },
    isAllDay(e) { return e.is_all_day == 1; },
    col(type) { return this.colors[type] || this.colors.todo; },

    todoRole(entry, date) {
      const t = new Date(date);
      t.setHours(0, 0, 0, 0);
      let role = "";
      if (entry.start_datetime) {
        const ps = new Date(entry.start_datetime.replace(" ", "T"));
        ps.setHours(0, 0, 0, 0);
        if (t.getTime() === ps.getTime()) role = "start";
      }
      if (entry.end_datetime) {
        const dl = new Date(entry.end_datetime.replace(" ", "T"));
        dl.setHours(0, 0, 0, 0);
        if (t.getTime() === dl.getTime())
          role = role === "start" ? "both" : "deadline";
      }
      return role;
    },

    todoMeta(entry) {
      let m = "";
      if (entry.end_datetime) {
        const dl = new Date(entry.end_datetime.replace(" ", "T"));
        m = `Határidő: ${dl.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}`;
        if (entry.start_datetime) {
          const ps = new Date(entry.start_datetime.replace(" ", "T"));
          m += ` · Tervezett: ${ps.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}`;
        }
      } else if (entry.start_datetime) {
        m = "Tervezett kezdés napja";
      }
      return m;
    },

    prev() {
      if (this.view === "month")
        this.date = new Date(this.date.getFullYear(), this.date.getMonth() - 1, 1);
      else if (this.view === "week") {
        const d = new Date(this.date); d.setDate(d.getDate() - 7); this.date = d;
      } else {
        const d = new Date(this.date); d.setDate(d.getDate() - 1); this.date = d;
      }
    },
    next() {
      if (this.view === "month")
        this.date = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1);
      else if (this.view === "week") {
        const d = new Date(this.date); d.setDate(d.getDate() + 7); this.date = d;
      } else {
        const d = new Date(this.date); d.setDate(d.getDate() + 1); this.date = d;
      }
    },
    goToday() { this.date = new Date(); this.selected = new Date(); },
    selectCell(cell) { this.selected = cell.date; },
    setView(v) { this.view = v; },
    goToEntry(entry) { this.$router.push({ name: "details", params: { id: entry.id } }); },
    goBack() { this.$router.push({ name: "graph" }); },
    addEntryForDate(date) { Store.modalOpen = true; },

    // ─── Gyors bejegyzés ────────────────────────────────────────────────────
    toggleQuickAdd() {
      this.quickAddOpen = !this.quickAddOpen;
      if (this.quickAddOpen) {
        this.quickAddTitle = "";
        this.quickAddError = "";
        // Előre beállítjuk a kiválasztott napot event esetén
        const d = this.selected;
        const pad = (n) => String(n).padStart(2, "0");
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        this.quickAddStart = `${dateStr}T09:00`;
        this.quickAddEnd   = `${dateStr}T10:00`;
        this.quickAddDeadline = `${dateStr}T23:59`;
        this.$nextTick(() => { if (this.$refs.quickAddInput) this.$refs.quickAddInput.focus(); });
      }
    },
    closeQuickAdd() {
      this.quickAddOpen = false;
      this.quickAddTitle = "";
      this.quickAddError = "";
    },
    async submitQuickAdd() {
      const title = this.quickAddTitle.trim();
      if (!title) { this.quickAddError = "A cím kötelező!"; return; }
      this.quickAddSaving = true;
      this.quickAddError = "";
      try {
        const payload = {
          action: "create_entry",
          title,
          type: this.quickAddType,
          group_id: parseInt(Store.currentGroupId) || 1,
        };
        if (this.quickAddType === "event") {
          payload.start_datetime = this.quickAddStart || null;
          payload.end_datetime   = this.quickAddEnd   || null;
          payload.is_all_day = 0;
        } else if (this.quickAddType === "todo") {
          payload.deadline = this.quickAddDeadline || null;
        }
        const res = await ApiService.createEntry(payload);
        if (res && res.error) throw new Error(res.error);
        await this.loadEntries();
        await Store.loadCurrentGroup();
        this.closeQuickAdd();
      } catch (e) {
        this.quickAddError = "Hiba: " + e.message;
      } finally {
        this.quickAddSaving = false;
      }
    },

    startDividerDrag(e) {
      this.dividerDragging = true;
      e.preventDefault();
      const onMove = (ev) => {
        if (!this.dividerDragging) return;
        const c = this.$refs.mvContainer;
        if (!c) return;
        const r = c.getBoundingClientRect();
        this.gridFlex = Math.max(20, Math.min(80, ((ev.clientY - r.top) / r.height) * 100));
      };
      const onUp = () => {
        this.dividerDragging = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },

    entryTop(entry) {
      if (!entry.start_datetime) return "0px";
      const d = new Date(entry.start_datetime.replace(" ", "T"));
      return ((d.getHours() * 60 + d.getMinutes()) / 60) * this.H + "px";
    },
    entryHeight(entry) {
      if (!entry.start_datetime || !entry.end_datetime) return this.H + "px";
      const s = new Date(entry.start_datetime.replace(" ", "T")),
            e = new Date(entry.end_datetime.replace(" ", "T"));
      return Math.max(18, ((e - s) / 60000 / 60) * this.H) + "px";
    },
    nowLineTop() {
      const n = new Date();
      return ((n.getHours() * 60 + n.getMinutes()) / 60) * this.H + "px";
    },
    isToday(d) {
      const t = new Date();
      return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    },
    sameDay(a, b) {
      return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    },
    dayIdx(d) { return (d.getDay() + 6) % 7; },
    getMonday(d) {
      const m = new Date(d);
      const day = m.getDay();
      m.setDate(m.getDate() - day + (day === 0 ? -6 : 1));
      m.setHours(0, 0, 0, 0);
      return m;
    },
    fmtTime(dt) {
      if (!dt) return "";
      const d = new Date(dt.replace(" ", "T"));
      return d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
    },
  },

  mounted() {
    this.loadEntries();
    this.nowInterval = setInterval(() => {}, 60000);
  },
  beforeUnmount() {
    clearInterval(this.nowInterval);
  },
};
