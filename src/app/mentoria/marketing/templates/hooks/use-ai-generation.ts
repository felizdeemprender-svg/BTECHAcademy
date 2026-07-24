"use client";

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateTemplateCollection } from "@/ai/flows/generate-template-collection";
import { generateStyleDemos } from "@/ai/flows/generate-style-demos";
import { checkAiHealth } from "@/ai/flows/check-ai-health";
import {
  AIHealthState,
  GenerationOptions,
  GenerationProgress,
  GenerationResult,
} from "../types/template-types";
import { getFirestore, collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { initializeFirebase } from "@/firebase";

export function useAIGeneration(profile?: any) {
  const { toast } = useToast();

  // Estados de generación
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] =
    useState<GenerationProgress | null>(null);

  // Estado de salud AI
  const [aiHealth, setAiHealth] = useState<AIHealthState>({
    status: "checking",
  });

  // Opciones de generación
  const [enabledChannels, setEnabledChannels] = useState<GenerationOptions>({
    landings: true,
    emails: true,
    ads: true,
  });

  // Health check - optimizado para evitar llamadas constantes
  const performHealthCheck = useCallback(async () => {
    try {
      const res = await checkAiHealth();
      const normalizedStatus = res.status === "ok" ? "healthy" : res.status;
      setAiHealth({ ...res, status: normalizedStatus });
    } catch (e: any) {
      console.error("Health Check failed on client:", e);
      setAiHealth({
        status: "error",
        message: "Fallo al conectar: " + (e.message || String(e)),
      });
    }
  }, []);

  // Health check inicial - solo una vez al montar
  useEffect(() => {
    performHealthCheck();
  }, []); // Sin dependencias para evitar loop

  // Generar templates - Optimizado para evitar refrescos
  const generateTemplates = useCallback(
    async (
      collectionId: string,
      campaignName: string,
      directives: string,
      designTokens?: any,
      styleId?: string,
    ) => {
      if (aiHealth.status !== "healthy") {
        toast({
          title: "Servicio AI no disponible",
          description: "El servicio de IA no está disponible en este momento.",
          variant: "destructive",
        });
        return false;
      }

      setIsGenerating(true);
      setGenerationProgress({
        current: 0,
        total: 100,
        label: "Iniciando generación...",
      });

      try {
        // Generar templates con IA
        const result = await generateTemplateCollection({
          directives,
          mentorName: profile?.displayName,
          designTokens,
          enabledChannels,
          styleId,
        });

        console.log("🔍 Resultado de generateTemplateCollection:", result);
        console.log("🔍 Tipo de resultado:", typeof result);
        console.log(
          "🔍 Resultado es null/undefined:",
          result === null || result === undefined,
        );

        if (result && typeof result === "object") {
          console.log("🔍 Resultado tiene landings:", "landings" in result);
          console.log("🔍 Resultado tiene emails:", "emails" in result);
          console.log("🔍 Resultado tiene socials:", "socials" in result);
          console.log("🔍 Resultado tiene ads:", "ads" in result);
        }

        if (!result) {
          throw new Error("La IA no generó ningún resultado");
        }

        if (!result.landings || !result.emails) {
          throw new Error("La IA no generó landings o emails válidos");
        }

        // Guardar en Firestore con batching optimizado
        const db = getFirestore();
        const app = initializeFirebase();

        // Crear referencia a la colección
        const collectionRef = collection(db, "templateCollections");

        // Preparar documento completo
        const newCollection = {
          id: collectionId,
          name: campaignName,
          directives,
          ownerId: profile?.uid,
          assets: result,
          designTokens: designTokens || null,
          styleId: styleId || 'classic', // Guardar el estilo seleccionado, default a classic
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Guardar en una sola operación
        await addDoc(collectionRef, newCollection);

        // Actualizar progreso final
        setGenerationProgress({
          current: 100,
          total: 100,
          label: "¡Generación completada!",
        });

        // Pequeña pausa para mostrar el 100%
        await new Promise((resolve) => setTimeout(resolve, 1000));

        toast({
          title: "✅ Generación Exitosa",
          description: `Se generaron ${result.landings.length} landings, ${result.emails.length} emails y ${result.ads?.length || 0} templates de anuncios.`,
        });

        return true;
      } catch (error: any) {
        // ✅ CORRECCIÓN: Manejo seguro de cualquier tipo de error
        let errorMessage = "Error desconocido en la generación";
        let errorStack = "";

        if (error !== null && error !== undefined) {
          if (typeof error === "object") {
            // ✅ Usar any para acceder a propiedades dinámicas
            const errorAny = error as any;
            if (errorAny.message && typeof errorAny.message === "string") {
              errorMessage = errorAny.message;
            } else if (
              errorAny.toString &&
              typeof errorAny.toString === "function"
            ) {
              errorMessage = errorAny.toString();
            } else {
              try {
                errorMessage = JSON.stringify(error);
              } catch {
                errorMessage = "Error object (no serializable)";
              }
            }

            if (errorAny.stack && typeof errorAny.stack === "string") {
              errorStack = errorAny.stack;
            }
          } else if (typeof error === "string") {
            errorMessage = error;
          } else {
            errorMessage = String(error);
          }

          console.error("❌ Error en generación:", errorMessage);
          if (errorStack) {
            console.error("❌ Stack trace:", errorStack);
          }
        } else {
          console.error("❌ Error en generación: Error es null o undefined");
        }

        // Mostrar el error completo en consola para debugging
        console.error("❌ Error completo:", error);
        console.error("❌ Tipo de error:", typeof error);

        setGenerationProgress({
          current: 0,
          total: 100,
          label: "Error en la generación",
        });

        // ✅ CORRECCIÓN: Asegurar que errorMessage siempre sea válido
        const finalErrorMessage =
          errorMessage || "Error desconocido en la generación";

        toast({
          title: "❌ Error en la Generación",
          description: finalErrorMessage,
          variant: "destructive",
        });

        return false;
      } finally {
        setIsGenerating(false);

        // Limpiar progreso después de un tiempo
        setTimeout(() => {
          setGenerationProgress(null);
        }, 2000);
      }
    },
    [
      aiHealth.status,
      enabledChannels,
      profile?.displayName,
      profile?.uid,
      toast,
    ],
  );

  // Actualizar canales habilitados
  const updateEnabledChannels = useCallback(
    (channels: Partial<GenerationOptions>) => {
      setEnabledChannels((prev) => ({ ...prev, ...channels }));
    },
    [],
  );

  return {
    isGenerating,
    generationProgress,
    aiHealth,
    enabledChannels,
    performHealthCheck,
    generateTemplates,
    updateEnabledChannels,
  };
}
