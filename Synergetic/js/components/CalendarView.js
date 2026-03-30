/**
 * CalendarView v3 – Fix: nav fix pozíció, heti nézet + gomb
 */
const CalendarView = {
    template: '#tpl-calendar-view',
    data(){
        return{
            date:new Date(),selected:new Date(),view:'month',entries:[],H:56,
            MONTHS:['Január','Február','Március','Április','Május','Június','Július','Augusztus','Szeptember','Október','November','December'],
            DAYS_S:['H','K','Sze','Cs','P','Szo','V'],DAYS_F:['Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat','Vasárnap'],
            names:{task:'Feladat',todo:'Feladat',event:'Esemény',note:'Jegyzet'},
            dividerDragging:false,gridFlex:55,nowInterval:null
        };
    },
    computed:{
        store(){return Store;},colors(){return Store.colors;},
        title(){
            const y=this.date.getFullYear(),m=this.date.getMonth();
            if(this.view==='month')return`${y}. ${this.MONTHS[m]}`;
            if(this.view==='week'){const mon=this.getMonday(this.date),sun=new Date(mon);sun.setDate(mon.getDate()+6);const s=`${this.MONTHS[mon.getMonth()]} ${mon.getDate()}.`;const e=mon.getMonth()!==sun.getMonth()?`${this.MONTHS[sun.getMonth()]} ${sun.getDate()}.`:`${sun.getDate()}.`;return`${y}. ${s} – ${e}`;}
            return`${y}. ${this.MONTHS[m]} ${this.date.getDate()}., ${this.DAYS_F[this.dayIdx(this.date)]}`;
        },
        monthCells(){
            const year=this.date.getFullYear(),month=this.date.getMonth(),startOfs=(new Date(year,month,1).getDay()+6)%7,dim=new Date(year,month+1,0).getDate(),prevDays=new Date(year,month,0).getDate(),total=Math.ceil((startOfs+dim)/7)*7,cells=[];
            for(let i=0;i<total;i++){let cellDate,isOther=false;if(i<startOfs){cellDate=new Date(year,month-1,prevDays-startOfs+1+i);isOther=true;}else if(i>=startOfs+dim){cellDate=new Date(year,month+1,i-startOfs-dim+1);isOther=true;}else cellDate=new Date(year,month,i-startOfs+1);const de=this.entriesForDate(cellDate);cells.push({date:cellDate,day:cellDate.getDate(),isOther,isToday:this.isToday(cellDate),isSelected:this.sameDay(cellDate,this.selected),dots:de.slice(0,4).map(e=>this.col(e.type))});}
            return cells;
        },
        agendaTodos(){return this.todoFor(this.selected);},
        agendaEvents(){return this.entriesForDate(this.selected).filter(e=>e.type!=='todo').sort((a,b)=>new Date(a.start_datetime?.replace(' ','T')||0)-new Date(b.start_datetime?.replace(' ','T')||0));},
        weekDays(){const mon=this.getMonday(this.date),days=[];for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);days.push({date:d,dayName:this.DAYS_S[i],dayNum:d.getDate(),isToday:this.isToday(d),entries:this.entriesForDate(d)});}return days;},
        dayTimedEntries(){return this.timedFor(this.date).sort((a,b)=>new Date(a.start_datetime?.replace(' ','T')||0)-new Date(b.start_datetime?.replace(' ','T')||0));},
        dayTodos(){return this.todoFor(this.date);},dayAlldayEntries(){return this.alldayFor(this.date);},
        isDayToday(){return this.isToday(this.date);},hours24(){return Array.from({length:24},(_,i)=>i);}
    },
    async mounted(){await this.loadEntries();this.nowInterval=setInterval(()=>this.$forceUpdate(),60000);},
    beforeUnmount(){if(this.nowInterval)clearInterval(this.nowInterval);},
    methods:{
        async loadEntries(){const d=await ApiService.getCalendarEntries();if(d)this.entries=d;},
        entriesForDate(date){const t=new Date(date);t.setHours(0,0,0,0);return this.entries.filter(e=>{if(e.type==='todo'){if(e.start_datetime){const ps=new Date(e.start_datetime.replace(' ','T'));ps.setHours(0,0,0,0);if(t.getTime()===ps.getTime())return true;}if(e.end_datetime){const dl=new Date(e.end_datetime.replace(' ','T'));dl.setHours(0,0,0,0);if(t.getTime()===dl.getTime())return true;}return false;}if(!e.start_datetime)return false;const s=new Date(e.start_datetime.replace(' ','T'));s.setHours(0,0,0,0);if(e.end_datetime){const end=new Date(e.end_datetime.replace(' ','T'));end.setHours(0,0,0,0);return t>=s&&t<=end;}return t.getTime()===s.getTime();});},
        timedFor(d){return this.entriesForDate(d).filter(e=>!this.isAllDay(e)&&e.type!=='todo');},
        alldayFor(d){return this.entriesForDate(d).filter(e=>this.isAllDay(e)&&e.type!=='todo');},
        todoFor(d){return this.entriesForDate(d).filter(e=>e.type==='todo');},
        isAllDay(e){return e.is_all_day==1;},col(type){return this.colors[type]||this.colors.todo;},
        todoRole(entry,date){const t=new Date(date);t.setHours(0,0,0,0);let role='';if(entry.start_datetime){const ps=new Date(entry.start_datetime.replace(' ','T'));ps.setHours(0,0,0,0);if(t.getTime()===ps.getTime())role='start';}if(entry.end_datetime){const dl=new Date(entry.end_datetime.replace(' ','T'));dl.setHours(0,0,0,0);if(t.getTime()===dl.getTime())role=role==='start'?'both':'deadline';}return role;},
        todoMeta(entry){let m='';if(entry.end_datetime){const dl=new Date(entry.end_datetime.replace(' ','T'));m=`Határidő: ${dl.toLocaleDateString('hu-HU',{month:'short',day:'numeric'})}`;if(entry.start_datetime){const ps=new Date(entry.start_datetime.replace(' ','T'));m+=` · Tervezett: ${ps.toLocaleDateString('hu-HU',{month:'short',day:'numeric'})}`;}}else if(entry.start_datetime)m='Tervezett kezdés napja';return m;},
        prev(){if(this.view==='month')this.date=new Date(this.date.getFullYear(),this.date.getMonth()-1,1);else if(this.view==='week'){const d=new Date(this.date);d.setDate(d.getDate()-7);this.date=d;}else{const d=new Date(this.date);d.setDate(d.getDate()-1);this.date=d;}},
        next(){if(this.view==='month')this.date=new Date(this.date.getFullYear(),this.date.getMonth()+1,1);else if(this.view==='week'){const d=new Date(this.date);d.setDate(d.getDate()+7);this.date=d;}else{const d=new Date(this.date);d.setDate(d.getDate()+1);this.date=d;}},
        goToday(){this.date=new Date();this.selected=new Date();},
        selectCell(cell){this.selected=cell.date;},setView(v){this.view=v;},
        goToEntry(entry){this.$router.push({name:'details',params:{id:entry.id}});},
        goBack(){this.$router.push({name:'graph'});},
        // Heti nézet: + gomb → naptár entry hozzáadás
        addEntryForDate(date){
            // Set start_datetime for the entry modal
            Store.modalOpen=true;
            // The modal will use the current group
        },
        startDividerDrag(e){this.dividerDragging=true;e.preventDefault();const onMove=(ev)=>{if(!this.dividerDragging)return;const c=this.$refs.mvContainer;if(!c)return;const r=c.getBoundingClientRect();this.gridFlex=Math.max(20,Math.min(80,((ev.clientY-r.top)/r.height)*100));};const onUp=()=>{this.dividerDragging=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);},
        entryTop(entry){if(!entry.start_datetime)return'0px';const d=new Date(entry.start_datetime.replace(' ','T'));return(d.getHours()*60+d.getMinutes())/60*this.H+'px';},
        entryHeight(entry){if(!entry.start_datetime||!entry.end_datetime)return this.H+'px';const s=new Date(entry.start_datetime.replace(' ','T')),e=new Date(entry.end_datetime.replace(' ','T'));return Math.max(18,(e-s)/60000/60*this.H)+'px';},
        nowLineTop(){const n=new Date();return(n.getHours()*60+n.getMinutes())/60*this.H+'px';},
        isToday(d){const t=new Date();return d.getDate()===t.getDate()&&d.getMonth()===t.getMonth()&&d.getFullYear()===t.getFullYear();},
        sameDay(a,b){return a.getDate()===b.getDate()&&a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear();},
        dayIdx(d){return(d.getDay()+6)%7;},
        getMonday(d){const m=new Date(d);const day=m.getDay();m.setDate(m.getDate()-day+(day===0?-6:1));m.setHours(0,0,0,0);return m;},
        fmtTime(dt){if(!dt)return'';const d=new Date(dt.replace(' ','T'));return d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'});}
    }
};
