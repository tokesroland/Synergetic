/**
 * AppSidebar v3 – Mellékattintásra bezáródik
 */
const AppSidebar = {
    template: '#tpl-sidebar',
    data(){return{groupSearch:'',groupsExpanded:true};},
    computed:{
        store(){return Store;}, groups(){return Store.groups;}, nodes(){return Store.nodes;},
        colors(){return Store.colors;}, typeNames(){return Store.typeNames;},
        filteredGroups(){if(!this.groupSearch.trim())return this.groups;const q=this.groupSearch.toLowerCase();return this.groups.filter(g=>g.name.toLowerCase().includes(q));},
        sortedEntries(){return[...this.nodes].sort((a,b)=>a.title.localeCompare(b.title,'hu'));}
    },
    mounted(){
        this._outsideClickHandler=(e)=>{if(!Store.sidebarOpen)return;const sidebar=this.$el;const hamburger=document.getElementById('hamburger-btn');if(sidebar&&!sidebar.contains(e.target)&&hamburger&&!hamburger.contains(e.target))Store.sidebarOpen=false;};
        document.addEventListener('mousedown',this._outsideClickHandler);
    },
    beforeUnmount(){document.removeEventListener('mousedown',this._outsideClickHandler);},
    methods:{
        async selectGroup(group){await Store.switchGroup(group.id);},
        selectEntry(entry){Store.selectedId=entry.id;},
        openModal(){Store.modalOpen=true;},
        toggleGroups(){this.groupsExpanded=!this.groupsExpanded;},
        goToDetails(entry){this.$router.push({name:'details',params:{id:entry.id}});},
        entryColor(type){return this.colors[type]||'#fff';}
    }
};
