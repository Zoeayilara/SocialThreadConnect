import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, X, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { authenticatedFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const SERVICE_CATEGORIES = [
  'Barbing/Salon',
  'Printing',
  'Plumbing',
  'Electrical',
  'Catering',
  'Photography',
  'Event Planning',
  'Consulting',
  'Tutoring',
  'Fitness Training',
  'Home Repair',
  'Car Wash',
  'Delivery',
  'Other'
];

export default function AddService() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Barbing/Salon',
    contactPhone: '',
    contactEmail: '',
    contactWhatsapp: '',
    pricingInfo: '',
    availability: '',
    location: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const createServiceMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await authenticatedFetch('/api/services', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) throw new Error('Failed to create service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorServices'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: "Service created successfully!" });
      setLocation('/vendor-dashboard');
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create service", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in service name and description",
        variant: "destructive" 
      });
      return;
    }

    if (!formData.contactPhone && !formData.contactEmail && !formData.contactWhatsapp) {
      toast({ 
        title: "Contact information required", 
        description: "Please provide at least one contact method",
        variant: "destructive" 
      });
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('contactPhone', formData.contactPhone);
    data.append('contactEmail', formData.contactEmail);
    data.append('contactWhatsapp', formData.contactWhatsapp);
    data.append('pricingInfo', formData.pricingInfo);
    data.append('availability', formData.availability);
    data.append('location', formData.location);
    
    if (logoFile) {
      data.append('serviceLogo', logoFile);
    }

    createServiceMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Add Service</h1>
              <p className="text-sm text-gray-400">Showcase your professional services</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 space-y-6">
              {/* Logo */}
              <div>
                <Label className="text-white mb-3 block">Service Logo/Brand Image</Label>
                
                {logoPreview ? (
                  <div className="relative w-48 h-48 mx-auto">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeLogo}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square max-w-xs mx-auto bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 hover:border-blue-500 transition-colors cursor-pointer flex flex-col items-center justify-center"
                  >
                    <Upload className="w-12 h-12 text-gray-600 mb-3" />
                    <p className="text-gray-400 text-sm">Click to upload logo</p>
                    <p className="text-gray-600 text-xs mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
              </div>

              {/* Service Name */}
              <div>
                <Label htmlFor="name" className="text-white mb-2 block">
                  Service Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Premium Barbing Services"
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-white mb-2 block">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your service, what you offer, your experience, etc."
                  className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category" className="text-white mb-2 block">
                  Category
                </Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
                >
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Contact Information */}
              <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg">
                <h3 className="text-lg font-semibold text-white">Contact Information *</h3>
                <p className="text-sm text-gray-400">Provide at least one contact method</p>
                
                <div>
                  <Label htmlFor="contactPhone" className="text-white mb-2 block">
                    Phone Number
                  </Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+1234567890"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="contactEmail" className="text-white mb-2 block">
                    Email Address
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="your@email.com"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="contactWhatsapp" className="text-white mb-2 block">
                    WhatsApp Number
                  </Label>
                  <Input
                    id="contactWhatsapp"
                    type="tel"
                    value={formData.contactWhatsapp}
                    onChange={(e) => setFormData({ ...formData, contactWhatsapp: e.target.value })}
                    placeholder="+1234567890"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              {/* Pricing Info */}
              <div>
                <Label htmlFor="pricingInfo" className="text-white mb-2 block">
                  Pricing Information
                </Label>
                <Input
                  id="pricingInfo"
                  value={formData.pricingInfo}
                  onChange={(e) => setFormData({ ...formData, pricingInfo: e.target.value })}
                  placeholder="e.g., Starting from ₦50,000, Hourly rate: ₦30,000"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Availability */}
              <div>
                <Label htmlFor="availability" className="text-white mb-2 block">
                  Availability
                </Label>
                <Input
                  id="availability"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  placeholder="e.g., Mon-Fri 9AM-5PM, Weekends available"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="text-white mb-2 block">
                  Location/Service Area
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Downtown LA, Mobile service available"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createServiceMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {createServiceMutation.isPending ? (
                <>
                  <Briefcase className="w-4 h-4 mr-2 animate-pulse" />
                  Creating...
                </>
              ) : (
                <>
                  <Briefcase className="w-4 h-4 mr-2" />
                  Create Service
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
