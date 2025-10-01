import React from "react";

const PlaceholderPage = ({ pageName }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {pageName.charAt(0).toUpperCase() + pageName.slice(1)}
      </h2>
      <p className="text-gray-500">This page is under construction</p>
    </div>
  </div>
);

export default PlaceholderPage;
