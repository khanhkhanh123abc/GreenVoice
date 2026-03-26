import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Thanh menu bên trái */}
      <Sidebar />
    
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Nội dung chính của trang sẽ thay đổi tùy theo Route */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}