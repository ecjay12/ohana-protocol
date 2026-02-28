import { Routes, Route } from "react-router-dom";
import { MiniappPage } from "@/pages/MiniappPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MiniappPage />} />
    </Routes>
  );
}

export default App;
