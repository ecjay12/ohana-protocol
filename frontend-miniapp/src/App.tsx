import { Routes, Route } from "react-router-dom";
import { MiniappPage } from "@/pages/MiniappPage";
import { AddToGridPage } from "@/pages/AddToGridPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MiniappPage />} />
      <Route path="/add-to-grid" element={<AddToGridPage />} />
    </Routes>
  );
}

export default App;
