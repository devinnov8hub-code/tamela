import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { initSupabaseAuth } from "./session/authSession";
import "./style.css";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faBell,
  faChartLine,
  faClock,
  faEye,
  faEyeSlash,
  faFileLines,
  faFileWaveform,
  faGear,
  faMagnifyingGlass,
  faMicrophone,
  faMoon,
  faPenToSquare,
  faPlus,
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
} from "@fortawesome/free-solid-svg-icons";

library.add(
  faBell,
  faChartLine,
  faClock,
  faEye,
  faEyeSlash,
  faFileLines,
  faFileWaveform,
  faGear,
  faMagnifyingGlass,
  faMicrophone,
  faMoon,
  faPenToSquare,
  faPlus,
  faTrashCan,
  faUser,
  faUserCheck,
  faUserClock,
  faUserDoctor,
  faUserGear,
  faUserGroup,
  faUsers,
  faUserShield,
  faUserSlash
);

const app = createApp(App);
app.component("font-awesome-icon", FontAwesomeIcon);
initSupabaseAuth();
app.use(router).mount("#app");
