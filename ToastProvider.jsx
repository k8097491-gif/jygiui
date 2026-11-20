import { createContext,useCallback,useContext,useMemo,useState } from "react";
import { Toast } from "./ui.jsx";

const ToastContext=createContext(null);
export function ToastProvider({children}) {
  const [toast,setToast]=useState(null);
  const show=useCallback(function(message,type="success"){
    setToast({id:Date.now(),message,type});
    window.clearTimeout(show.timer);
    show.timer=window.setTimeout(function(){setToast(null);},4200);
  },[]);
  const hide=useCallback(function(){setToast(null);},[]);
  const value=useMemo(function(){return {show,hide};},[show,hide]);
  return <ToastContext.Provider value={value}>{children}<Toast toast={toast} onClose={hide}/></ToastContext.Provider>;
}
export function useToast(){const value=useContext(ToastContext);if(!value)throw new Error("useToast must be used inside ToastProvider.");return value;}
