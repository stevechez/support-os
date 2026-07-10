"use client";

import { useActionState, useState, useTransition } from "react";
import { Package, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Order } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { createOrder, deleteOrder, type OrderActionState } from "../actions";

const STATUS_STYLES: Record<string, string> = {
  processing: "bg-muted text-muted-foreground",
  shipped: "border-sky-500/20 bg-sky-500/15 text-sky-400",
  delivered: "border-emerald-500/20 bg-emerald-500/15 text-emerald-400",
  cancelled: "border-destructive/20 bg-destructive/10 text-destructive",
  refunded: "border-amber-500/20 bg-amber-500/15 text-amber-400",
};

const initial: OrderActionState = {};

export function OrdersPanel({
  customerId,
  orders,
}: {
  customerId: string;
  orders: Order[];
}) {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, action, formPending] = useActionState(
    async (prev: OrderActionState, formData: FormData) => {
      const res = await createOrder(prev, formData);
      if (!res.error) setAdding(false);
      return res;
    },
    initial
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Package className="size-4" /> Orders ({orders.length})
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setAdding((a) => !a)}>
          <Plus className="size-3.5" /> Add order
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <form
            action={action}
            className="space-y-3 rounded-lg border bg-card/50 p-3"
          >
            <input type="hidden" name="customerId" value={customerId} />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="orderNumber" className="text-xs">
                  Order #
                </Label>
                <Input id="orderNumber" name="orderNumber" required placeholder="4471" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs">
                  Status
                </Label>
                <NativeSelect id="status" name="status" defaultValue="processing">
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">
                Items
              </Label>
              <Input id="description" name="description" placeholder="2x Wireless Mouse" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="total" className="text-xs">
                  Total ($)
                </Label>
                <Input id="total" name="total" type="number" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trackingNumber" className="text-xs">
                  Tracking #
                </Label>
                <Input id="trackingNumber" name="trackingNumber" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expectedDelivery" className="text-xs">
                  Expected delivery
                </Label>
                <Input id="expectedDelivery" name="expectedDelivery" type="date" />
              </div>
            </div>
            {state.error && (
              <p className="text-xs text-destructive">{state.error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={formPending}>
                {formPending ? "Saving…" : "Save order"}
              </Button>
            </div>
          </form>
        )}

        {orders.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">#{order.order_number}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] capitalize",
                    STATUS_STYLES[order.status] ?? "bg-muted text-muted-foreground"
                  )}
                >
                  {order.status}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[
                  order.description,
                  order.total != null ? `$${Number(order.total).toFixed(2)}` : null,
                  order.tracking_number ? `tracking ${order.tracking_number}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "No details"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              onClick={() =>
                startTransition(() => deleteOrder(order.id, customerId))
              }
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}

        {orders.length === 0 && !adding && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No orders on file. The AI can only ground order-status replies in
            data added here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
