import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertTriangle, Shield, Users } from 'lucide-react';

interface TermsDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  userType: 'customer' | 'vendor';
}

export default function TermsDialog({ isOpen, onAccept, userType }: TermsDialogProps) {
  const isVendor = userType === 'vendor';

  const vendorTerms = {
    title: "VENDOR TERMS AND CONDITIONS",
    icon: <Shield className="w-6 h-6 text-orange-500" />,
    content: [
      {
        title: "Product Advertising Guidelines",
        text: "Advertise your products and services in a professional and honest manner. Misleading advertisements or false claims may result in account suspension or permanent ban."
      },
      {
        title: "Verification Requirements", 
        text: "To get verified on EntreeFox, you need to build a strong reputation with high customer satisfaction, positive reviews, and consistent quality service. Verified vendors get priority visibility."
      },
      {
        title: "Transaction Responsibility",
        text: "Always verify customer credibility before engaging in any transaction. EntreeFox serves as a platform to connect vendors and customers but does not take responsibility for failed transactions, disputes, or fraudulent activities."
      },
      {
        title: "Code of Conduct",
        text: "Maintain professional behavior in all interactions. Be respectful, respond promptly to inquiries, and provide excellent customer service to build your reputation on the platform."
      },
      {
        title: "Chat Guidelines",
        text: "Be respectful and courteous in your messages. No spamming or sharing of sensitive content. No hate speech, harassment, or offensive language. Report any suspicious or inappropriate behavior."
      }
    ]
  };

  const customerTerms = {
    title: "CUSTOMER TERMS AND CONDITIONS", 
    icon: <Users className="w-6 h-6 text-blue-500" />,
    content: [
      {
        title: "Vendor Trust & Verification",
        text: "Always verify vendor credibility before making any purchase. Check their reviews, ratings, and verification status. EntreeFox recommends dealing with verified vendors for better security."
      },
      {
        title: "Transaction Safety",
        text: "EntreeFox serves as a platform to connect customers and vendors but does not take responsibility for failed transactions, product quality issues, or fraudulent activities. Exercise caution in all dealings."
      },
      {
        title: "Content Guidelines",
        text: "No illegal content, hate speech, harassment, or offensive material should be posted. Respect community guidelines and maintain a positive environment for all users."
      },
      {
        title: "Community Standards",
        text: "Be respectful to other users, vendors, and the community. Follow proper etiquette when communicating and engaging with others on the platform."
      },
      {
        title: "Chat Guidelines", 
        text: "Be respectful and courteous in your messages. No spamming or sharing of sensitive content. No hate speech, harassment, or offensive language. Report any suspicious or inappropriate behavior."
      }
    ]
  };

  const terms = isVendor ? vendorTerms : customerTerms;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl w-[95vw] bg-white border-gray-200 max-h-[90vh] overflow-hidden p-6 flex flex-col">
        <DialogHeader className="text-center pb-4 flex-shrink-0">
          <div className="flex items-center justify-center mb-2">
            {terms.icon}
          </div>
          <DialogTitle className="text-gray-900 text-lg font-bold">
            {terms.title}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Welcome to EntreeFox! To ensure a safe and enjoyable experience for all users, please read and agree to the following terms and conditions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-4">
            {terms.content.map((section, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="text-gray-900 font-semibold text-sm mb-2">
                      {section.title}
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {section.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-900 font-semibold text-sm mb-2">
                    Important Notice
                  </h4>
                  <p className="text-red-800 text-sm leading-relaxed">
                    By using EntreeFox, you agree to these terms and conditions. We reserve the right to remove any content or user that violates these guidelines. Violations may result in account suspension or permanent ban.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-center pt-6 mt-4 border-t border-gray-200 flex-shrink-0">
          <Button 
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-8 py-2 rounded-lg transition-all duration-200 hover:scale-105 flex items-center space-x-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Yes, I agree</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
