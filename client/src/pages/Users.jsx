import React from 'react';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';

export default function Users() {
  return (
    <Layout>
      <Topbar title="Users Management" />
      <main className="flex-1 p-8 overflow-y-auto bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Trang Quản Lý Người Dùng</h2>
          <p className="text-slate-500">Tính năng này đang được phát triển hoặc chờ thành viên khác push code lên.</p>
        </div>
      </main>
    </Layout>
  );
}