/**
 * EntryModal v3 – Fixed: hiba nem zárja be a modalt, inline hibaüzenet
 */
const EntryModal = {
    template: '#tpl-entry-modal',
    data() {
        return {
            creationType:'entry', entryType:'note', entryTitle:'', entryGroupId:'', entryCategoryId:'',
            todoStart:'', todoDeadline:'', eventStart:'', eventEnd:'', eventAllDay:false, eventLocationId:'',
            categoryName:'', categoryColor:'#5c6bc0', tagName:'', tagColor:'#ff9800', locationName:'',
            submitting:false, errorMsg:''
        };
    },
    computed: {
        store(){return Store;}, isOpen(){return Store.modalOpen;},
        groups(){return Store.groups;}, categories(){return Store.categories;}, locations(){return Store.locations;}
    },
    watch: {
        isOpen(val){if(val){Store.loadGroups();Store.loadCategories();Store.loadLocations();this.entryGroupId=Store.currentGroupId;this.errorMsg='';}}
    },
    methods: {
        close(){Store.modalOpen=false;this.resetForm();},
        resetForm(){
            this.creationType='entry';this.entryType='note';this.entryTitle='';this.entryGroupId=Store.currentGroupId;this.entryCategoryId='';
            this.todoStart='';this.todoDeadline='';this.eventStart='';this.eventEnd='';this.eventAllDay=false;this.eventLocationId='';
            this.categoryName='';this.categoryColor='#5c6bc0';this.tagName='';this.tagColor='#ff9800';this.locationName='';this.errorMsg='';
        },
        async submit(){
            this.errorMsg='';this.submitting=true;
            try{
                if(this.creationType==='entry'){
                    if(!this.entryTitle.trim()){this.errorMsg='A cím kötelező!';this.submitting=false;return;}
                    await this.createEntry();
                } else if(this.creationType==='category'){
                    if(!this.categoryName.trim()){this.errorMsg='A kategória neve kötelező!';this.submitting=false;return;}
                    await this.createCategory();
                } else if(this.creationType==='tag'){
                    if(!this.tagName.trim()){this.errorMsg='A címke neve kötelező!';this.submitting=false;return;}
                    await this.createTag();
                } else if(this.creationType==='location'){
                    if(!this.locationName.trim()){this.errorMsg='A helyszín neve kötelező!';this.submitting=false;return;}
                    await this.createLocation();
                }
                this.submitting=false;this.close();
            }catch(e){this.errorMsg='Hiba: '+e.message;this.submitting=false;}
        },
        async createEntry(){
            const payload={action:'create_entry',title:this.entryTitle.trim(),group_id:parseInt(this.entryGroupId)||1,category_id:this.entryCategoryId||null,type:this.entryType};
            if(this.entryType==='todo'){payload.planned_start=this.todoStart||null;payload.deadline=this.todoDeadline||null;}
            else if(this.entryType==='event'){payload.start_datetime=this.eventStart||null;payload.end_datetime=this.eventEnd||null;payload.is_all_day=this.eventAllDay?1:0;payload.location_id=this.eventLocationId||null;}
            const data=await ApiService.createEntry(payload);
            if(data&&data.error)throw new Error(data.error);
            if(data&&data.id){await Store.loadCurrentGroup();await Store.loadGroups();}
        },
        async createCategory(){await ApiService.createCategory({name:this.categoryName.trim(),color_hex:this.categoryColor});await Store.loadCategories();},
        async createTag(){await ApiService.createTag({name:this.tagName.trim(),color_hex:this.tagColor});await Store.loadTags();},
        async createLocation(){await ApiService.createLocation({name:this.locationName.trim()});await Store.loadLocations();}
    }
};
