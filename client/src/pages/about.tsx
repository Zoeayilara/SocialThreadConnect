import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Zap, Shield, Heart, Globe, Star } from 'lucide-react';

interface AboutProps {
  onBack: () => void;
}

export default function About({ onBack }: AboutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">About EntreeFox</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <span className="text-3xl font-bold text-white">EF</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">EntreeFox</h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
            Connecting communities through authentic social experiences and meaningful interactions
          </p>
        </div>

        {/* Announcement Section */}
        <div className="bg-orange-50 dark:bg-gradient-to-r dark:from-orange-500/20 dark:to-red-600/20 rounded-xl p-6 border border-orange-300 dark:border-orange-500/30 mb-6 relative overflow-hidden">
          <div className="absolute top-4 right-4 text-4xl">📢</div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4 text-center">
            ENTREEFOX IS HERE!!
          </h3>
          <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p className="font-normal">
              <span className="font-medium">Entreefox</span> is a web app that is primarily for university students to connect with each other which means <span className="font-medium">Entreefox</span> gives a social media interface and a market place where student Entrepreneurs and business owners can interact, connect with each other and render services to their potential clients giving students a platform to interact and chat with not just students within their school community but with students from other schools.
            </p>
            <p className="font-normal">
              We also give a platform for startup Entrepreneurs to get their business and the services they render known to students in their community and outside their community.
            </p>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="bg-gray-50 dark:bg-gradient-to-r dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600/30 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Heart className="w-6 h-6 text-red-400 mr-3" />
            Our Mission
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            EntreeFox is dedicated to building a vibrant social platform where university students can connect, share their thoughts, 
            and create meaningful relationships. We provide both a social media interface and a marketplace where student entrepreneurs 
            and business owners can interact, connect, and render services to their potential clients in a safe and engaging environment.
          </p>
        </div>

        {/* Key Features */}
        <div className="space-y-4 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">What Makes Us Special</h3>
          
          <div className="bg-blue-50 dark:bg-gradient-to-r dark:from-blue-500/10 dark:to-purple-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-500/20">
            <div className="flex items-start space-x-3">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-gray-900 dark:text-white font-medium mb-1">University Community</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Connect with students within your school and across other universities</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-gradient-to-r dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-4 border border-green-200 dark:border-green-500/20">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-gray-900 dark:text-white font-medium mb-1">Safe & Secure</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Advanced moderation and privacy controls to protect our users</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-gradient-to-r dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl p-4 border border-purple-200 dark:border-purple-500/20">
            <div className="flex items-start space-x-3">
              <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-gray-900 dark:text-white font-medium mb-1">Lightning Fast</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Optimized performance for seamless social interactions</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-gradient-to-r dark:from-orange-500/10 dark:to-red-500/10 rounded-xl p-4 border border-orange-200 dark:border-orange-500/20">
            <div className="flex items-start space-x-3">
              <Globe className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-gray-900 dark:text-white font-medium mb-1">Entrepreneurship Hub</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Platform for student entrepreneurs to showcase their businesses and services</p>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="bg-gray-50 dark:bg-gradient-to-r dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600/30 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Star className="w-6 h-6 text-yellow-400 mr-3" />
            Platform Features
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">✓</div>
              <p className="text-gray-700 dark:text-gray-300 text-sm">Social Media Interface</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">✓</div>
              <p className="text-gray-700 dark:text-gray-300 text-sm">Marketplace Platform</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">✓</div>
              <p className="text-gray-700 dark:text-gray-300 text-sm">Cross-University Chat</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400 mb-1">✓</div>
              <p className="text-gray-700 dark:text-gray-300 text-sm">Business Networking</p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-gray-50 dark:bg-gradient-to-r dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600/30 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About the Platform</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
            EntreeFox was created specifically for university students with the vision of combining social networking 
            with entrepreneurial opportunities. We provide a unique dual-platform experience that serves as both a 
            social media interface and a marketplace where student entrepreneurs and business owners can thrive.
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
            Our platform enables students to connect not just within their own school community, but with students 
            from universities across the globe. This creates unprecedented opportunities for collaboration, 
            networking, and business development.
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            We're dedicated to empowering the next generation of entrepreneurs by providing them with the tools 
            and connections they need to turn their ideas into successful ventures while building meaningful 
            relationships along the way.
          </p>
        </div>

        {/* Contact Section */}
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Have questions or feedback? We'd love to hear from you!
          </p>
          <Button 
            onClick={() => window.open('mailto:Entreefox@gmail.com', '_blank')}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:scale-105"
          >
            Get in Touch
          </Button>
        </div>
      </div>
    </div>
  );
}
