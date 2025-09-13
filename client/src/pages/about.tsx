import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Zap, Shield, Heart, Globe, Star } from 'lucide-react';

interface AboutProps {
  onBack: () => void;
}

export default function About({ onBack }: AboutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-gray-700/50 shadow-lg">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">About EntreeFox</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <span className="text-3xl font-bold text-white">EF</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">EntreeFox</h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Connecting communities through authentic social experiences and meaningful interactions
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-6 border border-gray-600/30 mb-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Heart className="w-6 h-6 text-red-400 mr-3" />
            Our Mission
          </h3>
          <p className="text-gray-300 leading-relaxed">
            EntreeFox is dedicated to building a vibrant social platform where users can share their thoughts, 
            connect with like-minded individuals, and create lasting relationships in a safe and engaging environment.
          </p>
        </div>

        {/* Key Features */}
        <div className="space-y-4 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">What Makes Us Special</h3>
          
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-start space-x-3">
              <Users className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-white font-medium mb-1">Community First</h4>
                <p className="text-gray-400 text-sm">Built for meaningful connections and authentic conversations</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-white font-medium mb-1">Safe & Secure</h4>
                <p className="text-gray-400 text-sm">Advanced moderation and privacy controls to protect our users</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-start space-x-3">
              <Zap className="w-6 h-6 text-purple-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-white font-medium mb-1">Lightning Fast</h4>
                <p className="text-gray-400 text-sm">Optimized performance for seamless social interactions</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20">
            <div className="flex items-start space-x-3">
              <Globe className="w-6 h-6 text-orange-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="text-white font-medium mb-1">Global Reach</h4>
                <p className="text-gray-400 text-sm">Connect with people from around the world in real-time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-6 border border-gray-600/30 mb-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Star className="w-6 h-6 text-yellow-400 mr-3" />
            Platform Features
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">✓</div>
              <p className="text-gray-300 text-sm">Real-time Messaging</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">✓</div>
              <p className="text-gray-300 text-sm">Media Sharing</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">✓</div>
              <p className="text-gray-300 text-sm">User Verification</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400 mb-1">✓</div>
              <p className="text-gray-300 text-sm">Activity Tracking</p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-6 border border-gray-600/30 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">About the Platform</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            EntreeFox was created with the vision of bringing people together through technology. 
            We believe in the power of authentic connections and strive to provide a platform 
            where users can express themselves freely while maintaining a respectful community environment.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            Our team is committed to continuous improvement, user feedback, and creating 
            innovative features that enhance the social media experience for everyone.
          </p>
        </div>

        {/* Contact Section */}
        <div className="text-center">
          <p className="text-gray-400 mb-4">
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
