import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Edit, Trash2, ArrowLeft, Phone, Mail, MessageCircle, MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { authenticatedFetch, getImageUrl } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";

export default function VendorServices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/vendor-services/:vendorId?');
  const vendorId = params?.vendorId ? parseInt(params.vendorId) : user?.id;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);

  const isOwnServices = !params?.vendorId || vendorId === user?.id;

  // Fetch vendor's services
  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['vendorServices', vendorId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/services/vendor/${vendorId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch services' }));
        throw new Error(errorData.message || 'Failed to fetch services');
      }
      return response.json();
    },
    enabled: !!vendorId,
    retry: 1,
  });

  // Show error if fetch failed
  if (error) {
    console.error('Services fetch error:', error);
  }

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await authenticatedFetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete service');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorServices'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: "Service deleted successfully!" });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
    onError: () => {
      toast({ title: "Failed to delete service", variant: "destructive" });
    },
  });

  const handleDeleteClick = (serviceId: number) => {
    setServiceToDelete(serviceId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (serviceToDelete) {
      deleteServiceMutation.mutate(serviceToDelete);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="w-16 h-16 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Briefcase className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Failed to Load Services</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please try again later</p>
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
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{isOwnServices ? 'My Services' : 'Services'}</h1>
                <p className="text-sm text-gray-400">{services.length} services</p>
              </div>
            </div>
            {isOwnServices && (
              <Button
                onClick={() => setLocation('/add-service')}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center px-4">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <Briefcase className="w-10 h-10 md:w-12 md:h-12 text-gray-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">No Services Yet</h2>
            <p className="text-sm md:text-base text-gray-400 mb-6 max-w-md">
              {isOwnServices 
                ? "Start building your catalog by adding products or services"
                : "This vendor hasn't added any services yet"}
            </p>
            {isOwnServices && (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  onClick={() => setLocation('/add-product')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Product
                </Button>
                <Button
                  onClick={() => setLocation('/add-service')}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Service
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service: any, index: number) => (
              <Card 
                key={service.id} 
                className="bg-gray-900 border-gray-800 overflow-hidden hover:border-purple-500/50 transition-all duration-300 group animate-in fade-in slide-in-from-bottom duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-0">
                  {/* Service Logo */}
                  <div className="relative aspect-video bg-gray-800 overflow-hidden">
                    {service.logo_url ? (
                      <img
                        src={getImageUrl(service.logo_url)}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Briefcase className="w-16 h-16 text-gray-600" />
                      </div>
                    )}
                    
                    {/* Action Buttons - Only show for own services */}
                    {isOwnServices && (
                      <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setLocation(`/edit-service/${service.id}`)}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick(service.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Service Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-white text-lg mb-1 line-clamp-1 group-hover:text-purple-400 transition-colors">
                        {service.name}
                      </h3>
                      {service.category && (
                        <Badge variant="outline" className="border-purple-500 text-purple-400 text-xs">
                          {service.category}
                        </Badge>
                      )}
                    </div>

                    <p className="text-gray-400 text-sm line-clamp-3">
                      {service.description}
                    </p>

                    {/* Contact Information */}
                    <div className="space-y-2 pt-2 border-t border-gray-800">
                      {service.contact_phone && (
                        <a 
                          href={`tel:${service.contact_phone}`}
                          className="flex items-center space-x-2 text-sm text-gray-400 hover:text-blue-400 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          <span>{service.contact_phone}</span>
                        </a>
                      )}
                      {service.contact_email && (
                        <a 
                          href={`mailto:${service.contact_email}`}
                          className="flex items-center space-x-2 text-sm text-gray-400 hover:text-blue-400 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{service.contact_email}</span>
                        </a>
                      )}
                      {service.contact_whatsapp && (
                        <a 
                          href={`https://wa.me/${service.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-sm text-gray-400 hover:text-green-400 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-1 pt-2">
                      {service.pricing_info && (
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <div className="w-4 h-4 flex items-center justify-center text-green-500 font-bold text-sm">₦</div>
                          <span>{service.pricing_info}</span>
                        </div>
                      )}
                      {service.availability && (
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>{service.availability}</span>
                        </div>
                      )}
                      {service.location && (
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>{service.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Service</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this service? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
