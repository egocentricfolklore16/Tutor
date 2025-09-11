import React from "react";

const AuthLayout = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950">
    <div className="w-full max-w-md p-6 rounded-xl shadow-2xl bg-[#162616] border border-emerald-900/30">
      {children}
    </div>
  </div>
);

export default AuthLayout;
