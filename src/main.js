import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";
import router from "./router";
import { queryClient } from "./plugins/queryClient.js";
import { useAuthStore } from "./stores/auth.js";
import "./style.css";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faAlignCenter,
  faAlignJustify,
  faAlignLeft,
  faAlignRight,
  faArrowUpFromBracket,
  faBell,
  faChartLine,
  faCircleCheck,
  faClipboardList,
  faCopy,
  faClock,
  faEye,
  faEyeSlash,
  faFileLines,
  faFilePdf,
  faFileWaveform,
  faHighlighter,
  faLink,
  faListUl,
  faGear,
  faGears,
  faMagnifyingGlass,
  faMicrophone,
  faMoon,
  faPause,
  faPenToSquare,
  faPlay,
  faPlus,
  faRightFromBracket,
  faRotateLeft,
  faRotateRight,
  faStethoscope,
  faStop,
  faTrashCan,
  faUser,
  faUserCheck,
  faUserClock,
  faUserDoctor,
  faUserGear,
  faUserGroup,
  faUsers,
  faUserShield,
  faUserSlash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

library.add(
  faAlignCenter,
  faAlignJustify,
  faAlignLeft,
  faAlignRight,
  faArrowUpFromBracket,
  faBell,
  faChartLine,
  faCircleCheck,
  faClipboardList,
  faCopy,
  faClock,
  faEye,
  faEyeSlash,
  faFileLines,
  faFilePdf,
  faFileWaveform,
  faHighlighter,
  faLink,
  faListUl,
  faGear,
  faGears,
  faMagnifyingGlass,
  faMicrophone,
  faMoon,
  faPause,
  faPenToSquare,
  faPlay,
  faPlus,
  faRightFromBracket,
  faRotateLeft,
  faRotateRight,
  faStethoscope,
  faStop,
  faTrashCan,
  faUser,
  faUserCheck,
  faUserClock,
  faUserDoctor,
  faUserGear,
  faUserGroup,
  faUsers,
  faUserShield,
  faUserSlash,
  faXmark
);

async function startApp() {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(VueQueryPlugin, { queryClient });
  app.component("font-awesome-icon", FontAwesomeIcon);

  const auth = useAuthStore(pinia);
  auth.initAuthListener();

  try {
    await auth.ensureBootstrapped();
  } catch (err) {
    console.error("[app] auth bootstrap error", err);
    auth.forceReady();
  }

  app.use(router);
  app.mount("#app");
}

startApp();
