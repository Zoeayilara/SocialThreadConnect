import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, MessageCircle, Clock } from 'lucide-react';

interface HelpProps {
  onBack: () => void;
}

export default function Help({ onBack }: HelpProps) {

  const handleEmailClick = () => {
    window.open('mailto:Entreefox@gmail.com', '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Help & Support</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Need Help?</h2>
          <p className="text-gray-400 text-lg">We're here to assist you with any questions or issues</p>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          {/* Email Support */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-6 border border-gray-600/30 hover:border-blue-500/50 transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Email Support</h3>
                <p className="text-gray-400 mb-4">
                  For detailed inquiries, technical support, or general questions, reach out to our support team.
                </p>
                <Button 
                  onClick={handleEmailClick}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Entreefox@gmail.com
                </Button>
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-6 border border-gray-600/30">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Response Time</h3>
                <p className="text-gray-400">
                  We typically respond to all inquiries within 24-48 hours during business days.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-6 border border-gray-600/30">
            <h3 className="text-lg font-semibold text-white mb-4">Common Questions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-1">How do I reset my password?</h4>
                <p className="text-gray-400 text-sm">Use the "Forgot Password" link on the login page or contact support.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">How do I verify my account?</h4>
                <p className="text-gray-400 text-sm">Account verification is handled by administrators. Contact support if needed.</p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">How do I report inappropriate content?</h4>
                <p className="text-gray-400 text-sm">Use the three-dot menu on posts to report content or contact support directly.</p>
              </div>
            </div>
          </div>

          {/* Contact Form Alternative */}
          <div className="text-center pt-6">
            <p className="text-gray-400 mb-4">
              For immediate assistance or detailed support requests
            </p>
            <Button 
              onClick={handleEmailClick}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200"
            >
              Contact Support Team
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
