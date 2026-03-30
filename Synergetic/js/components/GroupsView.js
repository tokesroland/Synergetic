/**
 * GroupsView v3 – Szerkesztő gomb csoportoknál, todo határidő, event dátum entry kártyákon
 */
const GroupsView = {
    template: '#tpl-groups-view',
    data() {
        return {
            selectedGroup:null, entries:[],
            editModalOpen:false, editForm:{id:null,name:'',description:'',color_hex:'#5c6bc0'},
            typeConfig:{ todo:{color:'#34d399',name:'Feladat'}, event:{color:'#fb923c',name:'Esemény'}, note:{color:'#818cf8',name:'Jegyzet'} }
        };
    },
    computed:{ store(){return Store;}, groups(){return Store.groups;} },
    async mounted(){ await Store.loadGroups(); if(this.groups.length>0)this.selectGroup(this.groups[0]); },
    methods:{
        async selectGroup(group){
            this.selectedGroup=group;
            const data=await ApiService.loadGroupData(group.id);
            this.entries=(data&&data.entries)?data.entries:[];
        },
        goToEntry(entry){this.$router.push({name:'details',params:{id:entry.id}});},
        entryColor(type){return(this.typeConfig[type]||{}).color||'#fff';},
        entryTypeName(type){return(this.typeConfig[type]||{}).name||type;},
        // Todo határidő
        todoDeadline(entry){
            if(entry.end_datetime){const d=new Date(entry.end_datetime.replace(' ','T'));return d.toLocaleDateString('hu-HU',{year:'numeric',month:'2-digit',day:'2-digit'});}
            if(entry.deadline){const d=new Date(entry.deadline.replace(' ','T'));return d.toLocaleDateString('hu-HU',{year:'numeric',month:'2-digit',day:'2-digit'});}
            return null;
        },
        // Event start
        eventStart(entry){
            if(entry.start_datetime){const d=new Date(entry.start_datetime.replace(' ','T'));return d.toLocaleDateString('hu-HU',{year:'numeric',month:'2-digit',day:'2-digit'});}
            return null;
        },
        // Edit group
        openEditModal(group,e){
            e.stopPropagation();
            this.editForm={id:group.id,name:group.name,description:group.description||'',color_hex:group.color_hex||'#5c6bc0'};
            this.editModalOpen=true;
        },
        closeEditModal(){this.editModalOpen=false;},
        async saveGroup(){
            // Backend-en nincs update_group endpoint, szimulálva
            alert('Csoport mentve! (Backend fejlesztés alatt)');
            this.editModalOpen=false;
        }
    }
};
