import { ArrowRight, MessageCircle, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

function CommunitySpotlight() {
  const navigate = useNavigate();
  return <section className="accent-card-community relative overflow-hidden rounded-lg border p-5 shadow-sm"><div className="absolute -right-5 -top-8 opacity-20"><Users size={120} /></div><div className="relative"><div className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /><p className="text-xs font-bold uppercase tracking-[0.18em]">Community</p></div><h2 className="mt-3 text-xl font-bold text-gray-900">Learn together</h2><p className="mt-2 max-w-sm text-sm leading-6 text-gray-600">Find study partners, share a breakthrough, and keep your momentum moving.</p><button type="button" onClick={() => navigate("/Community")} className="mt-5 inline-flex items-center gap-2 text-sm font-bold hover:opacity-75">Explore community <ArrowRight className="h-4 w-4" /></button></div></section>;
}

export default CommunitySpotlight;