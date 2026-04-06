import Sidebar from "../navigation/Sidebar";
import ChatBot from "./ChatBot";

export default function Layout({ children }) {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Left sidebar menu */}
      <Sidebar />

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Main content changes based on Route */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* AI Chatbot — chỉ hiện với Student */}
      <ChatBot />
    </div>
  );
}
