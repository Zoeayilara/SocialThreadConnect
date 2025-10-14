import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, X, Package, DollarSign, Tag, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];
const CATEGORY_OPTIONS = ["Clothing", "Accessories", "Shoes", "Electronics", "Home & Living", "Beauty", "Sports", "Other"];

export default function AddProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
  });
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const createProductMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await authenticatedFetch('/api/products', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) throw new Error('Failed to create product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: "Product created successfully!" });
      setLocation('/vendor-products');
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create product", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Limit to 5 images
      const newFiles = files.slice(0, 5 - imageFiles.length);
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

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    
    // Append all images
    imageFiles.forEach((file) => {
      data.append('productImages', file);
    });

    createProductMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/vendor-products')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Add New Product</h1>
              <p className="text-sm text-gray-400">Fill in the details below</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <Label className="text-white mb-3 block">Product Images (up to 5)</Label>
              
              {/* Image Previews Grid */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeImage(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      {index === 0 && (
                        <Badge className="absolute bottom-2 left-2 bg-blue-500">Main</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              {imagePreviews.length < 5 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 hover:border-blue-500 transition-colors cursor-pointer flex flex-col items-center justify-center"
                >
                  <Upload className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm">Click to upload product images</p>
                  <p className="text-gray-600 text-xs mt-1">PNG, JPG up to 10MB each ({imagePreviews.length}/5)</p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Product Details */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="name" className="text-white mb-2 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
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

              <div>
                <Label htmlFor="description" className="text-white mb-2 block">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your product..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price" className="text-white mb-2 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Price *
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
                  <Label htmlFor="stock" className="text-white mb-2 flex items-center">
                    <Boxes className="w-4 h-4 mr-2" />
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

              <div>
                <Label htmlFor="category" className="text-white mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  Category
                </Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Sizes */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <Label className="text-white mb-3 block">Available Sizes</Label>
              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map(size => (
                  <Badge
                    key={size}
                    variant={selectedSizes.includes(size) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      selectedSizes.includes(size)
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-400"
                    }`}
                    onClick={() => toggleSize(size)}
                  >
                    {size}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/vendor-products')}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProductMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {createProductMutation.isPending ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
