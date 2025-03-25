import { Switch, Route } from "wouter";
import Dashboard from "./pages/dashboard";
import Schemes from "./pages/schemes";
import Regions from "./pages/regions";
import Reports from "./pages/reports";
import Settings from "./pages/settings";
import NotFound from "./pages/not-found";

function App() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/schemes" component={Schemes} />
      <Route path="/regions" component={Regions} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
