/**
 * Synergetic – Router
 * Vue Router 4 konfiguráció (hash mode CDN-hez)
 */
const routes = [
    { path: '/',          name: 'graph',    component: GraphView    },
    { path: '/calendar',  name: 'calendar', component: CalendarView },
    { path: '/routine',   name: 'routine',  component: RoutineView  },
    { path: '/groups',    name: 'groups',   component: GroupsView   },
    { path: '/details/:id', name: 'details', component: DetailsView, props: true }
];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes
});
