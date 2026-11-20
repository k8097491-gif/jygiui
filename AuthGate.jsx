import { Navigate,useLocation } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "./state.jsx";

export default function AuthGate({children}) {
  const {user,status}=useAuth();
  const location=useLocation();
  if(status==="loading")return <div className="grid min-h-screen place-items-center bg-campus dark:bg-ink"><div className="text-center text-ink dark:text-white"><LoaderCircle className="mx-auto animate-spin" size={24}/><p className="mt-3 text-sm">Opening your support workspace…</p></div></div>;
  if(!user)return <Navigate to="/sign-in" replace state={{from:location.pathname}}/>;
  return children;
}
