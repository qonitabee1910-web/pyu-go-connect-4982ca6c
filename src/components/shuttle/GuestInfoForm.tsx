import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GuestInfoFormProps {
  seatNumber: number;
  onSave: (name: string, phone: string) => void;
}

export function GuestInfoForm({
  seatNumber,
  onSave
}: GuestInfoFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Penumpang Kursi {seatNumber}</CardTitle>
          <p className="text-[10px] text-muted-foreground">Isi detail penumpang untuk tiket</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor={`gn-${seatNumber}`}>Nama Lengkap</Label>
            <Input 
              id={`gn-${seatNumber}`} 
              value={name} 
              onChange={(e) => {
                setName(e.target.value);
                onSave(e.target.value, phone);
              }} 
              placeholder="Contoh: Budi Santoso" 
              className="h-9 text-sm" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`gp-${seatNumber}`}>Nomor WhatsApp</Label>
            <Input 
              id={`gp-${seatNumber}`} 
              type="tel" 
              value={phone} 
              onChange={(e) => {
                setPhone(e.target.value);
                onSave(name, e.target.value);
              }} 
              placeholder="08123456789" 
              className="h-9 text-sm" 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
