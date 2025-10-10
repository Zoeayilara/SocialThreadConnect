import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Package, Search, Filter, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/VerificationBadge";
import { authenticatedFetch, getImageUrl } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch all products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // Filter products based on search and category
  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(products.map((p: any) => p.category).filter(Boolean))];

  const handleBuyNow = (product: any) => {
    toast({
      title: "Coming Soon!",
      description: `Purchase functionality for ${product.name} will be available soon.`,
    });
  };

  const handleVendorClick = (vendorId: number) => {
    setLocation(`/profile/${vendorId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
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
                <h1 className="text-2xl font-bold">Marketplace</h1>
                <p className="text-sm text-gray-400">{filteredProducts.length} products available</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? "bg-blue-500 hover:bg-blue-600" : "border-gray-700 text-gray-300"}
              >
                All
              </Button>
              {categories.map((category: any) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "bg-blue-500 hover:bg-blue-600" : "border-gray-700 text-gray-300"}
                >
                  {category}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <Package className="w-12 h-12 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Products Found</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              {searchTerm || selectedCategory 
                ? "Try adjusting your search or filters" 
                : "No products available yet. Check back soon!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: any, index: number) => (
              <Card 
                key={product.id} 
                className="bg-gray-900 border-gray-800 overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group animate-in fade-in slide-in-from-bottom duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-800 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={getImageUrl(product.imageUrl)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-gray-600" />
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Badge variant="destructive" className="text-lg px-4 py-2">Out of Stock</Badge>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white text-lg mb-2 line-clamp-1 group-hover:text-blue-400 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-blue-400">
                        ${product.price}
                      </span>
                      {product.stock > 0 && product.stock < 10 && (
                        <Badge variant="outline" className="border-orange-500 text-orange-500">
                          Only {product.stock} left
                        </Badge>
                      )}
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

                    {/* Vendor Info */}
                    <div 
                      className="flex items-center space-x-2 mb-4 cursor-pointer hover:bg-gray-800/50 p-2 -mx-2 rounded-lg transition-colors"
                      onClick={() => handleVendorClick(product.vendor_id)}
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={getImageUrl(product.vendorProfileImage)} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                          {product.vendorFirstName?.[0] || product.vendorEmail[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-400">
                          {product.vendorFirstName && product.vendorLastName
                            ? `${product.vendorFirstName} ${product.vendorLastName}`
                            : product.vendorEmail.split('@')[0]}
                        </span>
                        {product.vendorIsVerified === 1 && (
                          <VerificationBadge className="w-3 h-3" />
                        )}
                      </div>
                    </div>

                    {/* Buy Button */}
                    <Button
                      onClick={() => handleBuyNow(product)}
                      disabled={product.stock === 0}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {product.stock === 0 ? 'Out of Stock' : 'Buy Now'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
