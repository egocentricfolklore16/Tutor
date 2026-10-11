import React from "react";
import NotificationCenter from "./NotificationCenter";

export default function NotificationsPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <NotificationCenter inlineMode={true} />
    </div>
  );
}
