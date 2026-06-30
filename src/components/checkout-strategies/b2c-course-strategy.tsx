"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { User, Users, Info } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const schema = z.object({
  isForSelf: z.boolean(),
  firstName: z.string().min(2, "Le prénom est requis"),
  lastName: z.string().min(2, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  beneficiaryEmail: z.string().optional()
}).superRefine((data, ctx) => {
  if (!data.isForSelf && (!data.beneficiaryEmail || !z.string().email().safeParse(data.beneficiaryEmail).success)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "L'email du bénéficiaire est requis et doit être valide",
      path: ["beneficiaryEmail"]
    });
  }
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess: (data: any) => void;
  playClick: () => void;
}

export function B2cCourseStrategy({ onSuccess, playClick }: Props) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      isForSelf: true,
      firstName: "",
      lastName: "",
      email: "",
      beneficiaryEmail: ""
    }
  });

  const isForSelf = watch("isForSelf");

  const onSubmit = (data: FormData) => {
    playClick();
    onSuccess({
      buyer: { firstName: data.firstName, lastName: data.lastName, email: data.email },
      beneficiaryEmail: data.isForSelf ? data.email : data.beneficiaryEmail
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Pour qui achetez-vous cette formation ?</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => { setValue("isForSelf", true); playClick(); }}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              isForSelf ? "border-indigo-600 bg-indigo-50/50 text-indigo-700" : "border-gray-200 hover:border-gray-300 text-gray-600"
            }`}
          >
            <User className="w-6 h-6" />
            <span className="font-medium text-sm">Pour moi-même</span>
          </button>
          <button
            type="button"
            onClick={() => { setValue("isForSelf", false); playClick(); }}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              !isForSelf ? "border-indigo-600 bg-indigo-50/50 text-indigo-700" : "border-gray-200 hover:border-gray-300 text-gray-600"
            }`}
          >
            <Users className="w-6 h-6" />
            <span className="font-medium text-sm">Pour un tiers</span>
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vos informations (Payeur)</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Prénom" 
            placeholder="Ex: Jean" 
            {...register("firstName")} 
            error={errors.firstName?.message} 
          />
          <Input 
            label="Nom" 
            placeholder="Ex: Dupont" 
            {...register("lastName")} 
            error={errors.lastName?.message} 
          />
        </div>
        <Input 
          label="Votre email" 
          type="email"
          placeholder="jean.dupont@email.com" 
          helperText="Le reçu de paiement sera envoyé à cette adresse."
          {...register("email")} 
          error={errors.email?.message} 
        />
      </div>

      {!isForSelf && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="pt-4 border-t border-gray-100"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Bénéficiaire de la formation
          </h3>
          
          <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm flex items-start gap-3 mb-4 border border-indigo-100">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              Le bénéficiaire recevra un email avec ses identifiants de connexion à Studies Learning. 
              Vos informations de paiement ne lui seront pas communiquées.
            </p>
          </div>

          <Input 
            label="Email du bénéficiaire" 
            type="email"
            placeholder="beneficiaire@email.com" 
            {...register("beneficiaryEmail")} 
            error={errors.beneficiaryEmail?.message} 
          />
        </motion.div>
      )}

      <Button type="submit" className="w-full mt-4" size="lg">
        Passer au paiement
      </Button>
    </form>
  );
}
