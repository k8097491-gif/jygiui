import { createContext,useCallback,useContext,useEffect,useMemo,useState } from "react";
import { api } from "./api.js";

const AuthContext=createContext(null);
export function AuthProvider({children}) {
  const [user,setUser]=useState(null);
  const [status,setStatus]=useState("loading");
  const [error,setError]=useState("");
  useEffect(function(){
    let active=true;
    api("/api/me").then(function(result){if(active){setUser(result.user);setStatus("ready");}})
      .catch(function(err){if(active){setUser(null);setStatus("ready");if(err.status!==401)setError(err.message);}});
    return function(){active=false;};
  },[]);
  const signIn=useCallback(async function(credentials){
    setError("");
    const result=await api("/api/auth/login",{method:"POST",body:credentials});
    setUser(result.user);setStatus("ready");
    return result.user;
  },[]);
  const register=useCallback(async function(data){
    setError("");
    const result=await api("/api/auth/register",{method:"POST",body:data});
    setUser(result.user);setStatus("ready");
    return result.user;
  },[]);
  const demoSignIn=useCallback(async function(role){
    setError("");
    const result=await api("/api/auth/demo",{method:"POST",body:{role}});
    setUser(result.user);setStatus("ready");
    return result.user;
  },[]);
  const signOut=useCallback(async function(){
    try { await api("/api/auth/logout",{method:"POST"}); }
    finally { setUser(null);setStatus("ready"); }
  },[]);
  const updateUser=useCallback(function(nextUser){setUser(nextUser);},[]);
  const value=useMemo(function(){return {user,status,error,setError,signIn,register,demoSignIn,signOut,updateUser};},[user,status,error,signIn,register,demoSignIn,signOut,updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error("useAuth must be inside AuthProvider.");return value;}

const ThemeContext=createContext(null);
export function ThemeProvider({children}) {
  const [theme,setTheme]=useState(function(){
    try{return localStorage.getItem("campus-helpdesk-theme")|| (matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");}
    catch{return "light";}
  });
  useEffect(function(){
    document.documentElement.classList.toggle("dark",theme==="dark");
    document.documentElement.dataset.theme=theme;
    try{localStorage.setItem("campus-helpdesk-theme",theme);}catch{ /* Storage can be disabled by the browser. */ }
  },[theme]);
  const toggle=useCallback(function(){setTheme(function(current){return current==="dark"?"light":"dark";});},[]);
  const value=useMemo(function(){return {theme,toggle};},[theme,toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme(){const value=useContext(ThemeContext);if(!value)throw new Error("useTheme must be inside ThemeProvider.");return value;}
