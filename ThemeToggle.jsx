import { Moon,Sun } from "lucide-react";
import { useTheme } from "./state.jsx";
import { IconButton } from "./ui.jsx";

export default function ThemeToggle() {
  const {theme,toggle}=useTheme();
  return <IconButton label={"Switch to "+(theme==="dark"?"light":"dark")+" theme"} onClick={toggle}>
    {theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}
  </IconButton>;
}
