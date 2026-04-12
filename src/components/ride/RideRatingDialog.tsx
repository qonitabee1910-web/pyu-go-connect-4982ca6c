
import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RideRatingDialogProps {
  rideId: string;
  driverId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RideRatingDialog({
  rideId,
  driverId,
  isOpen,
  onClose,
  onSuccess,
}: RideRatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Silakan berikan rating");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase.from("ride_ratings") as any).insert({
        ride_id: rideId,
        driver_id: driverId,
        rider_id: user.id,
        rating,
        comment,
      });

      if (error) throw error;

      toast.success("Terima kasih atas penilaian Anda!");
      onSuccess();
    } catch (err: any) {
      console.error("Failed to submit rating:", err);
      toast.error("Gagal mengirim rating: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Beri Rating Driver</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform active:scale-90"
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm font-medium">
            {rating === 1 && "Buruk"}
            {rating === 2 && "Cukup"}
            {rating === 3 && "Bagus"}
            {rating === 4 && "Sangat Bagus"}
            {rating === 5 && "Luar Biasa!"}
          </p>
          <Textarea
            placeholder="Bagikan pengalaman Anda (opsional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>
        <DialogFooter className="sm:justify-center">
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full h-12 text-lg font-bold gradient-primary"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...
              </>
            ) : (
              "Kirim Penilaian"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
