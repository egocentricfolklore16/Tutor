import React, { useState, useEffect } from "react";
import {
  Users,
  MessageCircle,
  Trophy,
  BookOpen,
  Calendar,
  Bell,
  Star,
  Zap,
  Heart,
} from "lucide-react";

const Community = () => {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Countdown timer to Phase 2 launch (approximately 5 months from now)
  useEffect(() => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 5);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });

      if (distance < 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleEmailSubmit = () => {
    if (email.trim()) {
      setIsSubscribed(true);
      setEmail("");
      // In a real app, you'd send this to your backend
      console.log("Subscribed email:", email);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleEmailSubmit();
    }
  };

  const communityFeatures = [
    {
      icon: <Users className="w-7 h-7" />,
      title: "Study Groups",
      description:
        "Create or join study groups with classmates and peers. Collaborate on assignments, share resources, and motivate each other to achieve academic success.",
      highlight: "Connect with like-minded learners",
    },
    {
      icon: <MessageCircle className="w-7 h-7" />,
      title: "Virtual Study Rooms",
      description:
        "Join live study sessions where you can focus together, share screens, ask questions in real-time, and get instant help from peers and mentors.",
      highlight: "Study together, even when apart",
    },
    {
      icon: <BookOpen className="w-7 h-7" />,
      title: "Discussion Forums",
      description:
        "Ask questions, share knowledge, and participate in subject-specific discussions. Get help from the community and help others in return.",
      highlight: "Knowledge sharing made easy",
    },
    {
      icon: <Trophy className="w-7 h-7" />,
      title: "Challenges & Rewards",
      description:
        "Participate in study challenges, earn achievement badges, and climb leaderboards. Gamify your learning experience to stay motivated.",
      highlight: "Make learning competitive and fun",
    },
  ];

  const additionalFeatures = [
    {
      icon: <Star className="w-5 h-5" />,
      text: "AI-Powered Study Partner Matching",
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      text: "Group Study Session Scheduling",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      text: "Real-time Collaborative Note-taking",
    },
    { icon: <Heart className="w-5 h-5" />, text: "Peer Mentorship Programs" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute "></div>
        <div className="relative container mx-auto px-4 pt-20 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Icon and Badge */}
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-[#00A651] to-[#00C853] rounded-full mb-8 shadow-xl">
              <Users className="w-12 h-12 text-white" />
            </div>

            <div className="inline-flex items-center bg-green-100 text-green-500 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4 mr-2" />
              Phase 2 Development • Social Learning Features
            </div>

            <h1 className="text-6xl font-bold bg-gradient-to-r from-[#00A651] to-[#00C853] bg-clip-text text-transparent mb-6">
              Community Hub
            </h1>
            <h2 className="text-3xl font-bold text-slate-700 mb-6">
              Coming Soon to Hyper Tutor
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed mb-8 max-w-3xl mx-auto">
              Transform your solo study sessions into collaborative learning
              experiences. Connect with peers, join study groups, and accelerate
              your academic success through the power of community.
            </p>
            <div className="mb-10">
              <img
                className="rounded-lg border border-gray-200 shadow-2xl"
                src="comm.jpg"
                alt=""
              />
            </div>

            {/* Stats Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-12">
              <div className="bg-white/60 backdrop-blur rounded-xl p-4 text-center shadow-xl">
                <div className="text-2xl font-bold text-red-600">10,000+</div>
                <div className="text-sm text-slate-600">
                  Expected Community Members
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur rounded-xl p-4 text-center shadow-xl">
                <div className="text-2xl font-bold text-yellow-600">24/7</div>
                <div className="text-sm text-slate-600">Active Study Rooms</div>
              </div>
              <div className="bg-white/60 backdrop-blur rounded-xl p-4 text-center shadow-xl">
                <div className="text-2xl font-bold text-green-600">50+</div>
                <div className="text-sm text-slate-600">Subject Categories</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown Timer */}
      <div className="container mx-auto px-4 mb-16">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-4xl mx-auto border border-slate-200">
          <h3 className="text-3xl font-bold text-center text-slate-800 mb-2">
            Launch Countdown
          </h3>
          <p className="text-center text-slate-600 mb-8">
            Expected launch in Phase 2 development cycle
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-lime-400 text-white rounded-2xl p-6 text-center transform hover:scale-105 transition-transform">
              <div className="text-4xl font-bold mb-1">
                {String(timeLeft.days).padStart(2, "0")}
              </div>
              <div className="text-sm uppercase tracking-wider opacity-90">
                Days
              </div>
            </div>
            <div className="bg-emerald-700 text-white rounded-2xl p-6 text-center transform hover:scale-105 transition-transform">
              <div className="text-4xl font-bold mb-1">
                {String(timeLeft.hours).padStart(2, "0")}
              </div>
              <div className="text-sm uppercase tracking-wider opacity-90">
                Hours
              </div>
            </div>
            <div className="bg-teal-500 text-white rounded-2xl p-6 text-center transform hover:scale-105 transition-transform">
              <div className="text-4xl font-bold mb-1">
                {String(timeLeft.minutes).padStart(2, "0")}
              </div>
              <div className="text-sm uppercase tracking-wider opacity-90">
                Minutes
              </div>
            </div>
            <div className="bg-yellow-400 text-white rounded-2xl p-6 text-center transform hover:scale-105 transition-transform">
              <div className="text-4xl font-bold mb-1">
                {String(timeLeft.seconds).padStart(2, "0")}
              </div>
              <div className="text-sm uppercase tracking-wider opacity-90">
                Seconds
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 mb-16">
        <div className="text-center mb-12">
          <h3 className="text-4xl font-bold text-slate-800 mb-4">
            What's Coming to Community
          </h3>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Powerful social learning features designed to enhance collaboration,
            motivation, and academic success
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {communityFeatures.map((feature, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-slate-200"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 p-4 bg-green-100 rounded-xl text-green-600 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-slate-800 mb-2">
                    {feature.title}
                  </h4>
                  <div className="text-sm font-medium text-green-600 mb-3">
                    {feature.highlight}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Features */}
      <div className="container mx-auto px-4 mb-16">
        <div className="bg-gradient-to-r from-[#00A651] to-[#00C853] rounded-3xl p-8 text-white max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-4">Plus Many More Features</h3>
            <p className="text-slate-300 text-lg">
              We're building a comprehensive social learning ecosystem
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {additionalFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 bg-white rounded-lg p-4 shadow-sm"
              >
                <div className="text-blue-400">{feature.icon}</div>
                <span className="text-black font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Email Signup */}
      <div className="container mx-auto px-4 mb-16">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl mx-auto text-center border border-slate-200">
          {!isSubscribed ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-400 rounded-full mb-6">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">
                Be First in Line
              </h3>
              <p className="text-slate-600 mb-6 text-lg">
                Join our waitlist and get exclusive early access when Community
                features launch. Plus, receive development updates and beta
                testing opportunities!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your email address"
                  className="flex-1 px-6 py-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-slate-700 text-lg"
                />
                <button
                  onClick={handleEmailSubmit}
                  className="px-8 py-4 bg-gradient-to-r from-[#00A651] to-[#00C853] text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 whitespace-nowrap text-lg shadow-lg"
                >
                  Join Waitlist
                </button>
              </div>
            </>
          ) : (
            <div>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-6">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-4">
                Welcome to the Community!
              </h3>
              <p className="text-slate-600 text-lg mb-4">
                🎉 You're all set! We'll notify you the moment Community
                features go live.
              </p>
              <p className="text-sm text-slate-500">
                Keep an eye on your inbox for exclusive updates and early access
                opportunities.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="container mx-auto px-4 pb-16">
        <div className="text-center">
          <div className="inline-flex items-center bg-slate-100 rounded-full px-6 py-3 text-slate-700">
            <Calendar className="w-5 h-5 mr-2" />
            <span className="font-medium">
              Development Timeline: Phase 2 (Months 5-8) • Enhanced Features
            </span>
          </div>
          <p className="text-slate-500 mt-4 max-w-2xl mx-auto">
            Community features are part of Hyper Tutor's Phase 2 development,
            focusing on social learning capabilities that will set us apart from
            traditional study platforms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Community;
