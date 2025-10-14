import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch, getImageUrl } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const CATEGORIES = ['Clothing', 'Accessories', 'Footwear', 'Electronics', 'Books', 'Other'];

export default function EditProduct() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/edit-product/:id');
  const productId = params?.id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'Clothing',
  });
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  // Fetch product data
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      return response.json();
    },
    enabled: !!productId,
  });

  // Populate form when product data loads
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        stock: product.stock?.toString() || '',
        category: product.category || 'Clothing',
      });
      setSelectedSizes(product.sizes ? JSON.parse(product.sizes) : []);
      
      // Parse existing images
      if (product.imageUrl) {
        try {
          const urls = JSON.parse(product.imageUrl);
          setExistingImageUrls(Array.isArray(urls) ? urls : [product.imageUrl]);
        } catch {
          setExistingImageUrls([product.imageUrl]);
        }
      }
    }
  }, [product]);

  const updateProductMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await authenticatedFetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: data,
      });
      if (!response.ok) throw new Error('Failed to update product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast({ title: "Product updated successfully!" });
      // Use replace to prevent going back to edit page
      window.history.replaceState(null, '', '/vendor-products');
      setLocation('/vendor-products');
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImageUrls.length + imagePreviews.length;
    const availableSlots = 5 - totalImages;
    
    if (files.length > 0 && availableSlots > 0) {
      const newFiles = files.slice(0, availableSlots);
      setImageFiles(prev => [...prev, ...newFiles]);
      
      // Generate previews in order
      const previews: string[] = [];
      for (const file of newFiles) {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        previews.push(preview);
      }
      setImagePreviews(prev => [...prev, ...previews]);
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeExistingImage = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.price) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in all the required fields",
        variant: "destructive" 
      });
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('price', formData.price);
    data.append('stock', formData.stock || '0');
    data.append('category', formData.category);
    data.append('sizes', JSON.stringify(selectedSizes));
    
    // If there are new images, append them
    if (imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        data.append('productImages', file);
      });
    } else if (existingImageUrls.length > 0) {
      // Keep existing images if no new ones uploaded
      data.append('imageUrl', JSON.stringify(existingImageUrls));
    }

    updateProductMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading product...</p>
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
              size="icon"
              onClick={() => window.history.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Product</h1>
              <p className="text-sm text-gray-400">Update your product details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 space-y-6">
              {/* Product Images */}
              <div>
                <Label className="text-white mb-3 block">Product Images (up to 5)</Label>
                
                {/* Existing Images */}
                {existingImageUrls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">Current Images:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {existingImageUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
                          <img
                            src={getImageUrl(url)}
                            alt={`Existing ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeExistingImage(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          {index === 0 && (
                            <Badge className="absolute bottom-2 left-2 bg-blue-500">Main</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Images Preview */}
                {imagePreviews.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">New Images:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
                          <img
                            src={preview}
                            alt={`New ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeNewImage(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                {(existingImageUrls.length + imagePreviews.length) < 5 && (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      Upload new images ({existingImageUrls.length + imagePreviews.length}/5)
                    </p>
                  </div>
                )}
              </div>

              {/* Product Name */}
              <div>
                <Label htmlFor="name" className="text-white mb-2 block">
                  Product Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
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
                  placeholder="Describe your product"
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                  required
                />
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price" className="text-white mb-2 block">
                    Price ($) *
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock" className="text-white mb-2 block">
                    Stock Quantity
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
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
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sizes */}
              <div>
                <Label className="text-white mb-2 block">Available Sizes</Label>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map(size => (
                    <Badge
                      key={size}
                      variant={selectedSizes.includes(size) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        selectedSizes.includes(size)
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : 'border-gray-700 text-gray-400 hover:border-blue-500'
                      }`}
                      onClick={() => toggleSize(size)}
                    >
                      {size}
                    </Badge>
                  ))}
                </div>
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
              disabled={updateProductMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {updateProductMutation.isPending ? 'Updating...' : 'Update Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
