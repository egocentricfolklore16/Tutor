import React from "react";
import { FileText } from "lucide-react";

const NoteEditor = () => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="text-center">
      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Note Editor</h3>
      <p className="text-gray-500">Take notes during your study session</p>
    </div>
  </div>
);

export default NoteEditor;
