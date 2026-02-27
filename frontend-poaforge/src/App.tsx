import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { EventsPage } from "./pages/EventsPage";
import { BlogPage } from "./pages/BlogPage";
import { CreateEventPage } from "./pages/CreateEventPage";
import { EventManagerPage } from "./pages/EventManagerPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { StructuredData } from "./components/StructuredData";

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <StructuredData type="Organization" />
        <StructuredData type="WebSite" />
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/create" element={<CreateEventPage />} />
            <Route path="/manage/:eventId" element={<EventManagerPage />} />
            <Route path="/event/:eventId" element={<EventDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
