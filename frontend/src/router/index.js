import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  },
  {
    path: '/gamedays',
    name: 'Gamedays',
    component: () => import('../views/Gameday/list/Gamedays.vue')
  },
  {
    path: '/gamedays/add',
    name: 'add Gameday',
    component: () => import('../views/Gameday/add/add.vue')
  },
  {
    path: '/gamedays/info/:id',
    name: 'gamedayinfo',
    component: () => import('../views/Gameday/info/Gamedayinfo.vue')
  }
]

const router = new VueRouter({
  routes
})

export default router
