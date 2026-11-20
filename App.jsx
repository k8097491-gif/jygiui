import { lazy,Suspense } from "react";
import { BrowserRouter,Route,Routes } from "react-router-dom";
import { QueryClient,QueryClientProvider } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { AuthProvider } from "./state.jsx";
import { ThemeProvider } from "./state.jsx";
import { ToastProvider } from "./ToastProvider.jsx";
import AuthGate from "./AuthGate.jsx";
import AppShell from "./AppShell.jsx";

const LandingPage=lazy(()=>import("./LandingPage.jsx"));
const AuthPage=lazy(()=>import("./AuthPage.jsx"));
const DashboardPage=lazy(()=>import("./DashboardPage.jsx"));
const TicketsPage=lazy(()=>import("./TicketsPage.jsx"));
const TicketFormPage=lazy(()=>import("./TicketFormPage.jsx"));
const TicketDetailPage=lazy(()=>import("./TicketDetailPage.jsx"));
const KnowledgePage=lazy(()=>import("./KnowledgePage.jsx"));
const InsightsPage=lazy(()=>import("./InsightsPage.jsx"));
const SettingsPage=lazy(()=>import("./SettingsPage.jsx"));

const client=new QueryClient({defaultOptions:{queries:{staleTime:15000,retry:1,refetchOnWindowFocus:true},mutations:{retry:0}}});
function NotFound(){return <main className="grid min-h-screen place-items-center bg-campus px-6 text-center dark:bg-ink"><div><h1 className="text-4xl font-semibold text-ink dark:text-white">That page is not here.</h1><p className="mt-3 text-sm text-muted dark:text-white/55">The route may have changed, or the address may be incomplete.</p><a className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-sm font-semibold text-white dark:border-signal dark:bg-signal dark:text-ink" href="/">Return to service overview</a></div></main>;}
function RouteLoading(){return <main className="grid min-h-[55vh] place-items-center bg-campus text-ink dark:bg-ink dark:text-white" aria-live="polite"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-blue" size={23}/><p className="mt-3 text-sm">Opening the support workspace…</p></div></main>;}
function RoutesView(){
 return <Routes>
  <Route path="/" element={<LandingPage/>}/>
  <Route path="/sign-in" element={<AuthPage/>}/>
  <Route path="/app" element={<AuthGate><AppShell/></AuthGate>}>
    <Route index element={<DashboardPage/>}/>
    <Route path="tickets" element={<TicketsPage/>}/>
    <Route path="tickets/new" element={<TicketFormPage/>}/>
    <Route path="tickets/:id" element={<TicketDetailPage/>}/>
    <Route path="knowledge" element={<KnowledgePage/>}/>
    <Route path="insights" element={<InsightsPage/>}/>
    <Route path="settings" element={<SettingsPage/>}/>
  </Route>
  <Route path="*" element={<NotFound/>}/>
 </Routes>;
}
export default function App(){
 return <QueryClientProvider client={client}><ThemeProvider><AuthProvider><ToastProvider><BrowserRouter><Suspense fallback={<RouteLoading/>}><RoutesView/></Suspense></BrowserRouter></ToastProvider></AuthProvider></ThemeProvider></QueryClientProvider>;
}
