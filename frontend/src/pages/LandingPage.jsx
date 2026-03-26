import Navbar from "../components/landing/Navbar";
import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import DashboardPreviewSection from "../components/landing/DashboardPreviewSection";
import AboutSection from "../components/landing/AboutSection";
import StatsSection from "../components/landing/StatsSection";
import CtaSection from "../components/landing/CtaSection";
import FooterSection from "../components/landing/FooterSection";

const LandingPage = () => {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <DashboardPreviewSection />
      <AboutSection />
      <StatsSection />
      <CtaSection />
      <FooterSection />
    </main>
  );
};

export default LandingPage;
