import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, Bookmark, User, HelpCircle, Info, LogOut, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setTimeout(() => {
          window.location.href = '/welcome';
        }, 500);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const settingsItems = [
    { icon: Bell, label: 'Notifications', onClick: () => setLocation('/notifications') },
    { icon: Bookmark, label: 'Saved', onClick: () => setLocation('/saved') },
    { icon: User, label: 'Account', onClick: () => setLocation('/account') },
    { icon: HelpCircle, label: 'Help', onClick: () => console.log('Help') },
    { icon: Info, label: 'About', onClick: () => console.log('About') },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>
      </div>

      {/* Settings List */}
      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-6">
        <div className="space-y-1">
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer rounded-lg transition-colors"
                onClick={item.onClick}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gray-400" />
                  <span className="text-white">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-4 px-4 py-4 text-left hover:bg-gray-900/50 rounded-lg transition-colors"
          >
            <LogOut className="w-6 h-6 text-red-400" />
            <span className="text-red-400 text-lg">Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
