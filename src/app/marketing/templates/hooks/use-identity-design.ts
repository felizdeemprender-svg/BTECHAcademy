"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { AIHealthState } from "../types/template-types";
import {
  generateIdentityDesign as generateIdentityDesignAI,
  generateIdentityDesignBatch,
} from "@/ai/flows/generate-identity-design";

export interface DesignTokens {
  primary: string;
  secondary: string;
  accent: string;
  fontHeading: string;
  fontBody: string;
}

export interface IdentityDesign {
  designTokens: DesignTokens;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    neutrals: string[];
    complements: string[];
  };
  typography: {
    heading: {
      font: string;
      weights: string[];
      sizes: string[];
    };
    body: {
      font: string;
      weights: string[];
      sizes: string[];
    };
  };
  rationale: {
    colors: string;
    typography: string;
    overall: string;
  };
}

export function useIdentityDesign() {
  const { toast } = useToast();

  // Estados del diseño
  const [isDesigning, setIsDesigning] = useState(false);
  const [designProgress, setDesignProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);

  // Galería de diseños
  const [designGallery, setDesignGallery] = useState<IdentityDesign[]>([]);
  const [currentDesignIndex, setCurrentDesignIndex] = useState(0);
  const [identityDesign, setIdentityDesign] = useState<IdentityDesign | null>(
    null,
  );
  const [isDesignApproved, setIsDesignApproved] = useState(false);

  // Generar diseño de identidad (galería de 5)
  const generateIdentityDesign = useCallback(
    async (directives: string) => {
      setIsDesigning(true);
      setDesignProgress({
        current: 0,
        total: 100,
        label: "Enviando directivas a IA...",
      });

      try {
        setDesignProgress({
          current: 20,
          total: 100,
          label: "IA analizando requisitos...",
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setDesignProgress({
          current: 40,
          total: 100,
          label: "Generando 5 propuestas...",
        });
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setDesignProgress({
          current: 60,
          total: 100,
          label: "Creando paletas de colores...",
        });
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setDesignProgress({
          current: 80,
          total: 100,
          label: "Seleccionando tipografías...",
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Llamar a la IA para generar 5 diseños
        const generatedDesigns = await generateIdentityDesignBatch({
          directives,
        });

        setDesignProgress({
          current: 100,
          total: 100,
          label: "Diseños completados",
        });
        setDesignGallery(generatedDesigns);
        setCurrentDesignIndex(0);
        setIdentityDesign(generatedDesigns[0]);
        setIsDesignApproved(false);

        toast({
          title: "5 Propuestas Generadas",
          description:
            "La IA ha creado 5 diseños únicos. Navega entre ellos con las flechas.",
        });

        return generatedDesigns[0];
      } catch (error) {
        console.error("Error generating identity design:", error);
        toast({
          title: "Error en diseño",
          description: "No se pudo generar el diseño de identidad con IA.",
          variant: "destructive",
        });
        return null;
      } finally {
        setTimeout(() => {
          setIsDesigning(false);
          setDesignProgress(null);
        }, 1000);
      }
    },
    [toast],
  );

  // Navegación en la galería
  const navigateDesign = useCallback(
    (direction: "next" | "prev") => {
      if (designGallery.length === 0) return;

      const newIndex =
        direction === "next"
          ? (currentDesignIndex + 1) % designGallery.length
          : (currentDesignIndex - 1 + designGallery.length) %
            designGallery.length;

      setCurrentDesignIndex(newIndex);
      setIdentityDesign(designGallery[newIndex]);
      setIsDesignApproved(false);
    },
    [designGallery, currentDesignIndex],
  );

  // Obtener diseño actual
  const getCurrentDesign = useCallback(() => {
    return designGallery[currentDesignIndex] || null;
  }, [designGallery, currentDesignIndex]);

  // Verificar si hay diseños siguientes/anteriores
  const hasNextDesign = useCallback(() => {
    return (
      designGallery.length > 0 && currentDesignIndex < designGallery.length - 1
    );
  }, [designGallery, currentDesignIndex]);

  const hasPrevDesign = useCallback(() => {
    return designGallery.length > 0 && currentDesignIndex > 0;
  }, [designGallery, currentDesignIndex]);

  // Actualizar diseño (refinamiento)
  const updateIdentityDesign = useCallback(
    async (updates: Partial<IdentityDesign>) => {
      if (!identityDesign) return null;

      setIsDesigning(true);
      setDesignProgress({
        current: 0,
        total: 100,
        label: "Aplicando ajustes...",
      });

      try {
        // Simular actualización
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const updatedDesign: IdentityDesign = {
          ...identityDesign,
          ...updates,
          rationale: {
            colors:
              updates.rationale?.colors || identityDesign.rationale.colors,
            typography:
              updates.rationale?.typography ||
              identityDesign.rationale.typography,
            overall:
              "Diseño actualizado según tus preferencias. Se han mantenido los principios fundamentales de la identidad visual.",
          },
        };

        setIdentityDesign(updatedDesign);
        setIsDesignApproved(false);

        setDesignProgress({
          current: 100,
          total: 100,
          label: "Ajustes aplicados",
        });

        toast({
          title: "Diseño Actualizado",
          description: "Los ajustes han sido aplicados exitosamente.",
        });

        return updatedDesign;
      } catch (error) {
        console.error("Error updating design:", error);
        toast({
          title: "Error en actualización",
          description: "No se pudo aplicar los ajustes.",
          variant: "destructive",
        });
        return null;
      } finally {
        setTimeout(() => {
          setIsDesigning(false);
          setDesignProgress(null);
        }, 1000);
      }
    },
    [identityDesign, toast],
  );

  // Aprobar diseño
  const approveDesign = useCallback(() => {
    setIsDesignApproved(true);
    toast({
      title: "Diseño Aprobado",
      description:
        "Ahora puedes generar los planos omnicanal con esta identidad visual.",
    });
  }, [toast]);

  // Resetear diseño
  const resetDesign = useCallback(() => {
    setIdentityDesign(null);
    setIsDesignApproved(false);
  }, []);

  return {
    // Estados
    isDesigning,
    designProgress,
    identityDesign,
    isDesignApproved,
    designGallery,
    currentDesignIndex,

    // Acciones
    generateIdentityDesign,
    updateIdentityDesign,
    approveDesign,
    resetDesign,
    navigateDesign,
    getCurrentDesign,
    hasNextDesign,
    hasPrevDesign,
  };
}
