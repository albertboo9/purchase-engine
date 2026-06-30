"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Gavel, MapPin } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const schema = z.object({
  shippingName: z.string().min(2, "Le nom est requis"),
  shippingAddress: z.string().min(5, "L'adresse est requise"),
  shippingCity: z.string().min(2, "La ville est requise"),
  shippingZip: z.string().min(2, "Le code postal est requis"),
  contactPhone: z.string().min(8, "Le numéro de téléphone est requis"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: (data: any) => void;
  playClick: () => void;
}

export function AuctionPaymentStrategy({ onSuccess, playClick }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      shippingName: "",
      shippingAddress: "",
      shippingCity: "",
      shippingZip: "",
      contactPhone: ""
    }
  });

  const onSubmit = (data: FormData) => {
    playClick();
    onSuccess(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-indigo-50 p-4 rounded-xl flex items-start gap-3 border border-indigo-100">
        <Gavel className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-800">
          Félicitations pour votre enchère remportée ! Veuillez indiquer les informations de livraison ou de facturation pour valider le lot.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-400" />
          Informations de livraison
        </h3>
        
        <Input 
          label="Nom complet" 
          placeholder="Ex: Jean Dupont" 
          {...register("shippingName")} 
          error={errors.shippingName?.message} 
        />
        
        <Input 
          label="Adresse de livraison" 
          placeholder="Ex: 123 Rue de la République" 
          {...register("shippingAddress")} 
          error={errors.shippingAddress?.message} 
        />

        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Code postal" 
            placeholder="Ex: 75001" 
            {...register("shippingZip")} 
            error={errors.shippingZip?.message} 
          />
          <Input 
            label="Ville" 
            placeholder="Ex: Paris" 
            {...register("shippingCity")} 
            error={errors.shippingCity?.message} 
          />
        </div>

        <Input 
          label="Téléphone de contact" 
          type="tel"
          placeholder="Ex: +33 6 12 34 56 78" 
          helperText="Le transporteur vous contactera sur ce numéro."
          {...register("contactPhone")} 
          error={errors.contactPhone?.message} 
        />
      </div>

      <Button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/50" size="lg">
        Confirmer et Payer l'Enchère
      </Button>
    </form>
  );
}
