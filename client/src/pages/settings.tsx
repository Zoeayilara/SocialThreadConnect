import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bell, Bookmark, User, HelpCircle, Info, LogOut, ChevronRight, Moon, Sun } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [, setLocation] = useLocation();
  const { logoutMutation } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const settingsItems = [
    { icon: Bell, label: 'Notifications', onClick: () => setLocation('/notifications') },
    { icon: Bookmark, label: 'Saved', onClick: () => setLocation('/saved') },
    { icon: User, label: 'Account', onClick: () => setLocation('/account') },
    { icon: HelpCircle, label: 'Help', onClick: () => setLocation('/help') },
    { icon: Info, label: 'About', onClick: () => setLocation('/about') },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-3 flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>
      </div>

      {/* Settings List */}
      <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-xl px-4 py-6">
        {/* Theme Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
              <div>
                <span className="text-gray-900 dark:text-white font-medium">Appearance</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </p>
              </div>
            </div>
            <Switch
              checked={theme === 'light'}
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index}
                className="flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer rounded-lg transition-colors"
                onClick={item.onClick}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-4 px-4 py-4 text-left hover:bg-red-50 dark:hover:bg-gray-900/50 rounded-lg transition-colors"
          >
            <LogOut className="w-6 h-6 text-red-500 dark:text-red-400" />
            <span className="text-red-500 dark:text-red-400 text-lg">Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
