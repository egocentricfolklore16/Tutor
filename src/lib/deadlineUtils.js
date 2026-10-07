// Helper function to calculate days left relative to start of today.
export const calculateDaysLeft = (dateValue, now = new Date()) => {
  if (!dateValue) return 0;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // If dateValue is an ISO string or YYYY-MM-DD
  const dateStr = typeof dateValue === 'string' && dateValue.includes('T')
    ? dateValue
    : `${dateValue}T00:00:00`;
  const deadlineDate = new Date(dateStr);
  deadlineDate.setHours(0, 0, 0, 0);

  return Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
};
