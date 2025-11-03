import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Package, Phone, MapPin, Mail, Calendar } from 'lucide-react';
import { authenticatedFetch, getImageUrl } from '@/utils/api';
import { formatRelativeTime } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';

interface Order {
  id: number;
  product_name: string;
  product_price: number;
  product_image: string;
  quantity: number;
  size: string | null;
  total_amount: number;
  shipping_address: string;
  payment_reference: string;
  status: string;
  created_at: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  customer_profile_image: string;
}

export default function VendorOrders() {
  const [, setLocation] = useLocation();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['vendorOrders'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/vendor/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    refetchOnWindowFocus: true, // Refresh when user comes back to tab
    refetchOnMount: true, // Refresh when component mounts
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      case 'shipped':
        return 'bg-blue-500';
      case 'delivered':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/vendor-dashboard')}
              className="text-gray-600 dark:text-gray-400 p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">My Orders</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">{orders.length} total orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground">
                When customers purchase your products, their orders will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order: Order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="pb-3 px-3 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                      <AvatarImage src={getImageUrl(order.customer_profile_image)} />
                      <AvatarFallback>
                        {order.customer_first_name?.[0]}{order.customer_last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {order.customer_first_name} {order.customer_last_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Order #{order.id}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(order.status)} text-xs flex-shrink-0`}>
                    {order.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
                {/* Product Info */}
                <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
                  {order.product_image && (
                    <img
                      src={getImageUrl(order.product_image)}
                      alt={order.product_name}
                      className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm sm:text-base truncate">{order.product_name}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Qty: {order.quantity}
                      {order.size && ` • ${order.size}`}
                    </p>
                    <p className="text-sm sm:text-base font-semibold text-green-600">
                      ₦{order.total_amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Customer Contact Info */}
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{order.customer_email}</span>
                  </div>
                  {order.customer_phone && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{order.customer_phone}</span>
                    </div>
                  )}
                  <div className="flex items-start space-x-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="flex-1 break-words">{order.shipping_address}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{formatRelativeTime(order.created_at)}</span>
                  </div>
                </div>

                {/* Reference */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground break-all">
                    Ref: {order.payment_reference}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
