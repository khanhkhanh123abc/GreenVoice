import React from 'react';
import Layout from '../../components/common/Layout';
import Topbar from '../../components/navigation/Topbar';

export default function Users() {
  return (
    <Layout>
      <Topbar title="Users Management" />
      <main className="flex-1 p-8 overflow-y-auto bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">User Management Page</h2>
          <p className="text-slate-500">This feature is under development or waiting for other team members to push their code.</p>
        </div>
      </main>
    </Layout>
  );
}