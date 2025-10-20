import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Upload, X, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { authenticatedFetch, getImageUrl } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { useRoute } from "wouter";

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

export default function EditService() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, params] = useRoute('/edit-service/:id');
  const serviceId = params?.id;
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
  const [existingLogo, setExistingLogo] = useState<string | null>(null);

  // Fetch service data
  const { data: service, isLoading, isError } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/services/${serviceId}`);
      if (!response.ok) throw new Error('Failed to fetch service');
      return response.json();
    },
    enabled: !!serviceId,
  });

  // Populate form when service data loads
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        description: service.description || '',
        category: service.category || 'Barbing/Salon',
        contactPhone: service.contact_phone || '',
        contactEmail: service.contact_email || '',
        contactWhatsapp: service.contact_whatsapp || '',
        pricingInfo: service.pricing_info || '',
        availability: service.availability || '',
        location: service.location || '',
      });
      if (service.logo_url) {
        setExistingLogo(service.logo_url);
      }
    }
  }, [service]);

  const updateServiceMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await authenticatedFetch(`/api/services/${serviceId}`, {
        method: 'PUT',
        body: data,
      });
      if (!response.ok) throw new Error('Failed to update service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorServices'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: "Service updated successfully!" });
      window.history.back();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update service", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          title: "File too large", 
          description: "Logo must be less than 5MB",
          variant: "destructive" 
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.category) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in name, description, and category",
        variant: "destructive" 
      });
      return;
    }

    if (!formData.contactPhone && !formData.contactEmail && !formData.contactWhatsapp) {
      toast({ 
        title: "Missing contact information", 
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
      data.append('logo', logoFile);
    }

    updateServiceMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="w-16 h-16 text-purple-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading service...</p>
        </div>
      </div>
    );
  }

  if (isError || !service) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Service Not Found</h2>
          <p className="text-gray-400 mb-6">Unable to load service details</p>
          <Button
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Service</h1>
              <p className="text-sm text-gray-400">Update your service details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <Label className="text-white mb-3 block">Service Logo/Brand Image</Label>
              
              <div className="space-y-4">
                {(logoPreview || existingLogo) ? (
                  <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden">
                    <img
                      src={logoPreview || getImageUrl(existingLogo!)}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveLogo}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors bg-gray-800/50"
                  >
                    <Upload className="w-12 h-12 text-gray-500 mb-2" />
                    <p className="text-gray-400 text-sm">Click to upload logo</p>
                    <p className="text-gray-500 text-xs mt-1">PNG, JPG up to 5MB</p>
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
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 space-y-4">
              {/* Service Name */}
              <div>
                <Label htmlFor="name" className="text-white mb-2 block">
                  Service Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Professional Barbing Service"
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
                  placeholder="Describe your service..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category" className="text-white mb-2 block">
                  Category *
                </Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
                  required
                >
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
              
              {/* Phone */}
              <div>
                <Label htmlFor="contactPhone" className="text-white mb-2 block">
                  Phone Number
                </Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="e.g., 08012345678"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="contactEmail" className="text-white mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="e.g., service@example.com"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <Label htmlFor="contactWhatsapp" className="text-white mb-2 block">
                  WhatsApp Number
                </Label>
                <Input
                  id="contactWhatsapp"
                  value={formData.contactWhatsapp}
                  onChange={(e) => setFormData({ ...formData, contactWhatsapp: e.target.value })}
                  placeholder="e.g., 08012345678"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Additional Details</h3>

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
                  placeholder="e.g., Monday - Friday, 9AM - 5PM"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="text-white mb-2 block">
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Lagos, Nigeria"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateServiceMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              {updateServiceMutation.isPending ? 'Updating...' : 'Update Service'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
