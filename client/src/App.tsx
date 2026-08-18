import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import JamPractice from "./pages/JamPractice";
import Landing from "./pages/Landing";
import Topics from "./pages/Topics";
import Discussion from "./pages/Discussion";
import Interview from "./pages/Interview";
import History from "./pages/History";
import Progress from "./pages/Progress";
import SessionDetail from "./pages/SessionDetail";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/app"} component={Dashboard} />
      <Route path={"/jam"} component={JamPractice} />
      <Route path={"/topics"} component={Topics} />
      <Route path={"/discussion"} component={Discussion} />
      <Route path={"/interview"} component={Interview} />
      <Route path={"/history/:id"} component={SessionDetail} />
      <Route path={"/history"} component={History} />
      <Route path={"/progress"} component={Progress} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
