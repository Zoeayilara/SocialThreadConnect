import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Edit, Trash2, ShoppingBag, ArrowLeft, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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

export default function VendorProducts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/vendor-products/:vendorId');
  const vendorId = params?.vendorId ? parseInt(params.vendorId) : user?.id;
  const isOwnProducts = vendorId === user?.id;
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  // Fetch vendor's products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['vendorProducts', vendorId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/products/vendor/${vendorId}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: !!vendorId,
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await authenticatedFetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorProducts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: "Product deleted successfully" });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const handleDelete = (productId: number) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading your products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{isOwnProducts ? 'My Products' : 'Products'}</h1>
                <p className="text-sm text-gray-400">{products.length} products</p>
              </div>
            </div>
            {isOwnProducts && (
              <div className="flex space-x-2">
                <Button
                  onClick={() => setLocation('/vendor-services')}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  My Services
                </Button>
                <Button
                  onClick={() => setLocation('/add-product')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <Package className="w-12 h-12 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Products Yet</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Start building your product catalog or showcase your services
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setLocation('/add-product')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
              <Button
                onClick={() => setLocation('/add-service')}
                variant="outline"
                className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Render a Service
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: any, index: number) => (
              <Card 
                key={product.id} 
                className="bg-gray-900 border-gray-800 overflow-hidden hover:border-blue-500/50 transition-all duration-300 group animate-in fade-in slide-in-from-bottom duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-0">
                  {/* Product Image(s) */}
                  <div className="relative aspect-square bg-gray-800 overflow-hidden">
                    {product.imageUrl ? (() => {
                      try {
                        const imageUrls = JSON.parse(product.imageUrl);
                        if (Array.isArray(imageUrls) && imageUrls.length > 1) {
                          return (
                            <Carousel className="w-full h-full">
                              <CarouselContent>
                                {imageUrls.map((url: string, idx: number) => (
                                  <CarouselItem key={idx}>
                                    <img
                                      src={getImageUrl(url)}
                                      alt={`${product.name} ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </CarouselItem>
                                ))}
                              </CarouselContent>
                              <CarouselPrevious className="left-2" />
                              <CarouselNext className="right-2" />
                            </Carousel>
                          );
                        } else if (Array.isArray(imageUrls) && imageUrls.length === 1) {
                          return (
                            <img
                              src={getImageUrl(imageUrls[0])}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          );
                        }
                      } catch {
                        // Single image URL (not JSON)
                        return (
                          <img
                            src={getImageUrl(product.imageUrl)}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        );
                      }
                    })() : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-gray-600" />
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Badge variant="destructive" className="text-lg px-4 py-2">Out of Stock</Badge>
                      </div>
                    )}
                    
                    {/* Action Buttons - Only show for own products */}
                    {isOwnProducts && (
                      <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => setLocation(`/edit-product/${product.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white text-lg mb-2 line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Price & Stock */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-blue-400">
                        ${product.price}
                      </span>
                      <Badge variant="outline" className={product.stock > 0 ? "border-green-500 text-green-500" : "border-red-500 text-red-500"}>
                        Stock: {product.stock}
                      </Badge>
                    </div>

                    {/* Sizes */}
                    {product.sizes && (
                      <div className="flex items-center space-x-1 mb-3">
                        <span className="text-xs text-gray-500">Sizes:</span>
                        {JSON.parse(product.sizes).slice(0, 4).map((size: string) => (
                          <Badge key={size} variant="outline" className="border-gray-700 text-gray-400 text-xs">
                            {size}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Buy Button - Only show for other users viewing vendor products */}
                    {!isOwnProducts && (
                      <Button
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        disabled={product.stock === 0}
                        onClick={() => {
                          // TODO: Implement buy/add to cart functionality
                          toast({ title: "Coming soon!", description: "Purchase functionality will be available soon." });
                        }}
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        {product.stock === 0 ? 'Out of Stock' : 'Buy Now'}
                      </Button>
                    )}
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
            <AlertDialogTitle className="text-white">Delete Product</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
