"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BookOpen, Building2, Info } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const schema = z.object({
  companyName: z.string().min(2, "Le nom de l'entreprise est requis"),
  vatNumber: z.string().optional(),
  adminFirstName: z.string().min(2, "Le prénom est requis"),
  adminLastName: z.string().min(2, "Le nom est requis"),
  adminEmail: z.string().email("Email pro invalide"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: (data: any) => void;
  playClick: () => void;
}

export function B2bThematiqueStrategy({ onSuccess, playClick }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      vatNumber: "",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: ""
    }
  });

  const onSubmit = (data: FormData) => {
    playClick();
    onSuccess(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-indigo-50 p-4 rounded-xl flex items-start gap-3 border border-indigo-100">
        <BookOpen className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-800">
          Vous achetez une thématique B2B complète. Un espace entreprise sera créé pour gérer vos apprenants. 
          L'email renseigné ci-dessous sera désigné comme Administrateur de cet espace.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Informations de l'entreprise</h3>
        <Input 
          label="Raison sociale (Nom de l'entreprise)" 
          placeholder="Ex: Acme Corp" 
          {...register("companyName")} 
          error={errors.companyName?.message} 
        />
        <Input 
          label="Numéro de TVA intracommunautaire (Optionnel)" 
          placeholder="Ex: FR XX XXX XXX XXX" 
          helperText="Permet l'exonération de TVA si applicable."
          {...register("vatNumber")} 
          error={errors.vatNumber?.message} 
        />
      </div>

      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Administrateur de la flotte</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Prénom" 
            placeholder="Ex: Marc" 
            {...register("adminFirstName")} 
            error={errors.adminFirstName?.message} 
          />
          <Input 
            label="Nom" 
            placeholder="Ex: Dupont" 
            {...register("adminLastName")} 
            error={errors.adminLastName?.message} 
          />
        </div>
        <Input 
          label="Email professionnel" 
          type="email"
          placeholder="marc@acme.com" 
          helperText="Cet email recevra les accès au Dashboard B2B pour gérer les licences."
          {...register("adminEmail")} 
          error={errors.adminEmail?.message} 
        />
      </div>

      <Button type="submit" className="w-full mt-4" size="lg">
        Passer au paiement
      </Button>
    </form>
  );
}
