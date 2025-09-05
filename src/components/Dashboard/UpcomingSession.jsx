import {
  Clock,
  BookOpen,
  Calendar,
  Play,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";

const UpcomingSessions = () => {
  const sessions = [
    {
      id: 1,
      subject: "Calculus III",
      topic: "Triple Integrals",
      time: "2:30 PM",
      duration: "45 min",
      type: "AI Tutoring",
      priority: "high",
      status: "scheduled",
      isOverdue: false,
    },
    {
      id: 2,
      subject: "Chemistry",
      topic: "Organic Reactions Review",
      time: "4:15 PM",
      duration: "30 min",
      type: "Flashcards",
      priority: "medium",
      status: "scheduled",
      isOverdue: false,
    },
    {
      id: 3,
      subject: "History",
      topic: "World War II Essay Prep",
      time: "Yesterday",
      duration: "60 min",
      type: "Study Session",
      priority: "high",
      status: "missed",
      isOverdue: true,
    },
  ];

  const getTypeIcon = (type) => {
    switch (type) {
      case "AI Tutoring":
        return <BookOpen className="h-4 w-4" />;
      case "Flashcards":
        return <Calendar className="h-4 w-4" />;
      case "Study Session":
        return <BookOpen className="h-4 w-4" />;
      case "Practice Problems":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority, isOverdue) => {
    if (isOverdue) return "border-l-red-500 bg-red-50";
    switch (priority) {
      case "high":
        return "border-l-orange-500 bg-orange-50";
      case "medium":
        return "border-l-blue-500 bg-blue-50";
      default:
        return "border-l-gray-300 bg-gray-50";
    }
  };

  const getStatusBadge = (status, isOverdue) => {
    if (isOverdue) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Missed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
        Scheduled
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-23">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Upcoming Sessions
        </h2>
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
          View All
        </button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`border-l-4 rounded-r-lg p-4 transition-all hover:shadow-md ${getPriorityColor(
              session.priority,
              session.isOverdue
            )}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    {getTypeIcon(session.type)}
                    
                  </div>
                  {getStatusBadge(session.status, session.isOverdue)}
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">
                  {session.subject}
                </h3>
                <p className="text-[10px] text-gray-600 mb-2 lg:w-fit">{session.topic}</p>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{session.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{session.duration}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {!session.isOverdue && (
                  <button className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    <Play className="h-3 w-3" />
                    Start
                  </button>
                )}
                {session.isOverdue && (
                  <button className="flex items-center gap-1 px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors">
                    Reschedule
                  </button>
                )}
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      
    </div>
  );
};

export default UpcomingSessions;
