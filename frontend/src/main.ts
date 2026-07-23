import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast, { POSITION, type PluginOptions } from 'vue-toastification';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import './styles/main.css';
import 'vue-toastification/dist/index.css';

const app = createApp(App);

const toastOptions: PluginOptions = {
  position: POSITION.TOP_RIGHT,
  timeout: 4000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
  filterBeforeCreate: (toast, toasts) => {
    if (toasts.filter((t) => t.content === toast.content).length !== 0) {
      return false;
    }
    return toast;
  },
  toastClassName: 'cs-toast',
  bodyClassName: 'cs-toast-body',
};

app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(Toast, toastOptions);

app.mount('#app');
