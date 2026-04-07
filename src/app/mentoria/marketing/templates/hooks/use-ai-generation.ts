'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateTemplateCollection } from '@/ai/flows/generate-template-collection';
import { checkAiHealth } from '@/ai/flows/check-ai-health';
import { 
  AIHealthState, 
  GenerationOptions, 
  SocialTarget, 
  GenerationProgress,
  GenerationResult 
} from '../types/template-types';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export function useAIGeneration(profile?: any) {
  const { toast } = useToast();
  
  // Estados de generación
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  
  // Estado de salud AI
  const [aiHealth, setAiHealth] = useState<AIHealthState>({ status: 'checking' });

  // Opciones de generación
  const [enabledChannels, setEnabledChannels] = useState<GenerationOptions>({
    landings: true,
    emails: true,
    socials: true,
    ads: true
  });

  // Social targets
  const [socialTargets, setSocialTargets] = useState<Record<string, SocialTarget>>({
    twitter: { enabled: true, thread: 3, single_post: 2 },
    instagram: { enabled: true, story: 5, carousel: 3, single_post: 2 },
    tiktok: { enabled: true, short_video: 3, carousel: 3 },
    linkedin: { enabled: true, document: 2, single_post: 2, carousel: 2 }
  });

  // Health check - optimizado para evitar llamadas constantes
  const performHealthCheck = useCallback(async () => {
    try {
      const res = await checkAiHealth();
      const normalizedStatus = res.status === 'ok' ? 'healthy' : res.status;
      setAiHealth({ ...res, status: normalizedStatus });
    } catch (e) {
      setAiHealth({ 
        status: 'error', 
        message: 'Fallo crítico al conectar con el servidor de IA.' 
      });
    }
  }, []);

  // Health check inicial - solo una vez al montar
  useEffect(() => {
    performHealthCheck();
  }, []); // Sin dependencias para evitar loop

  // Generar templates - Optimizado para evitar refrescos
  const generateTemplates = useCallback(async (
    collectionId: string,
    campaignName: string,
    directives: string,
    designTokens?: any
  ) => {
    if (aiHealth.status !== 'healthy') {
      toast({
        title: "Servicio AI no disponible",
        description: "El servicio de IA no está disponible en este momento.",
        variant: "destructive"
      });
      return false;
    }

    setIsGenerating(true);
    setGenerationProgress({ current: 0, total: 100, label: "Iniciando generación..." });

    try {
      // Convertir socialTargets al formato esperado por platforms
      const platforms = {
        twitter: socialTargets.twitter.enabled ? {
          enabled: true,
          thread: socialTargets.twitter.thread || 3,
          single_post: socialTargets.twitter.single_post || 2
        } : undefined,
        instagram: socialTargets.instagram.enabled ? {
          enabled: true,
          story: socialTargets.instagram.story || 5,
          carousel: socialTargets.instagram.carousel || 3,
          single_post: socialTargets.instagram.single_post || 2
        } : undefined,
        tiktok: socialTargets.tiktok.enabled ? {
          enabled: true,
          short_video: socialTargets.tiktok.short_video || 3,
          carousel: socialTargets.tiktok.carousel || 3
        } : undefined,
        linkedin: socialTargets.linkedin.enabled ? {
          enabled: true,
          document: socialTargets.linkedin.document || 2,
          single_post: socialTargets.linkedin.single_post || 2,
          carousel: socialTargets.linkedin.carousel || 2
        } : undefined
      };

      // Generar templates con IA
      const result = await generateTemplateCollection({
        directives,
        mentorName: profile?.displayName,
        designTokens, // ✅ Agregar los colores seleccionados
        enabledChannels,
        platforms
      });

      console.log('🔍 Resultado de generateTemplateCollection:', result);
      console.log('🔍 Tipo de resultado:', typeof result);
      console.log('🔍 Resultado es null/undefined:', result === null || result === undefined);
      
      if (result && typeof result === 'object') {
        console.log('🔍 Resultado tiene landings:', 'landings' in result);
        console.log('🔍 Resultado tiene emails:', 'emails' in result);
        console.log('🔍 Resultado tiene socials:', 'socials' in result);
        console.log('🔍 Resultado tiene ads:', 'ads' in result);
      }

      if (!result) {
        throw new Error('La IA no generó ningún resultado');
      }

      if (!result.landings || !result.emails) {
        throw new Error('La IA no generó landings o emails válidos');
      }

      // Guardar en Firestore con batching optimizado
      const db = getFirestore();
      const app = initializeFirebase();
      
      // Crear referencia a la colección
      const collectionRef = collection(db, 'templateCollections');
      
      // Preparar documento completo
      const newCollection = {
        id: collectionId,
        name: campaignName,
        directives,
        ownerId: profile?.uid,
        assets: result,
        designTokens: designTokens || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Guardar en una sola operación
      await addDoc(collectionRef, newCollection);

      // Actualizar progreso final
      setGenerationProgress({ 
        current: 100, 
        total: 100, 
        label: "¡Generación completada!" 
      });

      // Pequeña pausa para mostrar el 100%
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "✅ Generación Exitosa",
        description: `Se generaron ${result.landings.length} landings, ${result.emails.length} emails y ${(result.socials?.length || 0) + (result.ads?.length || 0)} templates de redes sociales.`,
      });

      return true;

    } catch (error: any) {
      // ✅ CORRECCIÓN: Manejo seguro de cualquier tipo de error
      let errorMessage = "Error desconocido en la generación";
      let errorStack = "";
      
      if (error !== null && error !== undefined) {
        if (typeof error === 'object') {
          // ✅ Usar any para acceder a propiedades dinámicas
          const errorAny = error as any;
          if (errorAny.message && typeof errorAny.message === 'string') {
            errorMessage = errorAny.message;
          } else if (errorAny.toString && typeof errorAny.toString === 'function') {
            errorMessage = errorAny.toString();
          } else {
            try {
              errorMessage = JSON.stringify(error);
            } catch {
              errorMessage = "Error object (no serializable)";
            }
          }
          
          if (errorAny.stack && typeof errorAny.stack === 'string') {
            errorStack = errorAny.stack;
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = String(error);
        }
        
        console.error('❌ Error en generación:', errorMessage);
        if (errorStack) {
          console.error('❌ Stack trace:', errorStack);
        }
      } else {
        console.error('❌ Error en generación: Error es null o undefined');
      }
      
      // Mostrar el error completo en consola para debugging
      console.error('❌ Error completo:', error);
      console.error('❌ Tipo de error:', typeof error);
      
      setGenerationProgress({ 
        current: 0, 
        total: 100, 
        label: "Error en la generación" 
      });

      // ✅ CORRECCIÓN: Asegurar que errorMessage siempre sea válido
      const finalErrorMessage = errorMessage || "Error desconocido en la generación";
      
      toast({
        title: "❌ Error en la Generación",
        description: finalErrorMessage,
        variant: "destructive"
      });

      return false;
    } finally {
      setIsGenerating(false);
      
      // Limpiar progreso después de un tiempo
      setTimeout(() => {
        setGenerationProgress(null);
      }, 2000);
    }
  }, [aiHealth.status, socialTargets, enabledChannels, profile?.displayName, profile?.uid, toast]);

  // Actualizar canales habilitados
  const updateEnabledChannels = useCallback((channels: Partial<GenerationOptions>) => {
    setEnabledChannels(prev => ({ ...prev, ...channels }));
  }, []);

  // Actualizar social targets
  const updateSocialTargets = useCallback((platform: string, target: Partial<SocialTarget>) => {
    setSocialTargets(prev => ({
      ...prev,
      [platform]: { ...prev[platform], ...target }
    }));
  }, []);

  return {
    isGenerating,
    generationProgress,
    aiHealth,
    enabledChannels,
    socialTargets,
    performHealthCheck,
    generateTemplates,
    updateEnabledChannels,
    updateSocialTargets
  };
}
