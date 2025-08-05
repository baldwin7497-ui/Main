import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Lobby from "@/pages/lobby";
import WaitingRoom from "@/pages/waiting-room";
import GamePlay from "@/pages/game-play";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Lobby} />
      <Route path="/room/:roomId">
        {(params) => <WaitingRoom roomId={params.roomId} />}
      </Route>
      <Route path="/game/:roomId">
        {(params) => <GamePlay roomId={params.roomId} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
