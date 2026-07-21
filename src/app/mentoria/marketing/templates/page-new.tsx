"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/components/auth-context";
import { CollectionManager } from "./components/collection-manager";
import { AIGenerator } from "./components/ai-generator";
import { IdentityDesigner } from "./components/identity-designer";
import { useCollections } from "./hooks/use-collections";
import { useAIGeneration } from "./hooks/use-ai-generation";
import { useIdentityDesign } from "./hooks/use-identity-design";

export default function MarketingTemplatesPage() {
  const { profile } = useAuth();

  // Hooks personalizados
  const {
    collections,
    isLoading,
    createCollection,
    deleteCollection,
    updateCollection,
  } = useCollections(profile);

  const {
    isGenerating,
    generationProgress,
    aiHealth,
    enabledChannels,
    performHealthCheck,
    generateTemplates,
    updateEnabledChannels,
  } = useAIGeneration();

  const {
    isDesigning,
    designProgress,
    identityDesign,
    isDesignApproved,
    generateIdentityDesign,
    updateIdentityDesign,
    approveDesign,
    resetDesign,
  } = useIdentityDesign();

  // Estados de UI
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isIdentityDesignerOpen, setIsIdentityDesignerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [campaignDirectives, setCampaignDirectives] = useState("");

  // Colección seleccionada
  const selectedCollection = useMemo(() => {
    if (!selectedId || !collections) return null;
    return collections.find((c) => c.id === selectedId);
  }, [selectedId, collections]);

  // Handlers
  const handleCreateNew = () => {
    setIsIdentityDesignerOpen(true);
  };

  const handleGenerateDesign = async (directives: string) => {
    setCampaignDirectives(directives);
    return await generateIdentityDesign(directives);
  };

  const handleUpdateDesign = async (updates: any) => {
    return await updateIdentityDesign(updates);
  };

  const handleApproveDesign = () => {
    approveDesign();
    setIsIdentityDesignerOpen(false);
    setIsCreateOpen(true);
  };

  const handleGenerate = async (name: string, directives: string) => {
    const collectionId = await createCollection(name, directives);
    if (collectionId) {
      const success = await generateTemplates(
        collectionId,
        name,
        directives,
        identityDesign?.designTokens,
      );
      if (success) {
        setSelectedId(collectionId);
        resetDesign(); // Resetear para próxima campaña
      }
      return success;
    }
    return false;
  };

  const handleViewCollection = (id: string) => {
    setSelectedId(id);
    // Aquí podríamos abrir un modal de vista o navegar a una página de detalles
  };

  const handleDeleteCollection = async (id: string) => {
    if (
      window.confirm("¿Estás seguro de que quieres eliminar esta colección?")
    ) {
      await deleteCollection(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Arquitecto de Identidad IA
          </h1>
          <p className="text-gray-600 mt-2">
            Crea identidades visuales con IA y genera planos omnicanal para tus
            campañas de marketing
          </p>
        </div>

        {/* Gestor de Colecciones */}
        <CollectionManager
          collections={collections}
          isLoading={isLoading}
          onCreateNew={handleCreateNew}
          onViewCollection={handleViewCollection}
          onDeleteCollection={handleDeleteCollection}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />

        {/* Vista Previa de Colección Seleccionada */}
        {selectedCollection && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Vista Previa: {selectedCollection.name}
            </h2>
            {/* Aquí podríamos agregar un componente de vista previa */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-600">
                Vista previa de la colección seleccionada. Los templates se
                mostrarían aquí con opciones de edición y refinamiento.
              </p>
            </div>
          </div>
        )}

        {/* Modal de Diseño de Identidad */}
        <IdentityDesigner
          isOpen={isIdentityDesignerOpen}
          onClose={() => setIsIdentityDesignerOpen(false)}
          directives={campaignDirectives}
          identityDesign={identityDesign}
          isDesigning={isDesigning}
          designProgress={designProgress}
          isDesignApproved={isDesignApproved}
          onGenerateDesign={handleGenerateDesign}
          onUpdateDesign={handleUpdateDesign}
          onApproveDesign={handleApproveDesign}
        />

        {/* Modal de Generación AI */}
        <AIGenerator
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            resetDesign();
          }}
          onGenerate={handleGenerate}
          aiHealth={aiHealth}
          isGenerating={isGenerating}
          generationProgress={generationProgress}
          enabledChannels={enabledChannels}
          onChannelsChange={updateEnabledChannels}
          onHealthCheck={performHealthCheck}
          // Props para diseño de identidad
          identityDesign={identityDesign}
          isDesigning={isDesigning}
          designProgress={designProgress}
          isDesignApproved={isDesignApproved}
          designGallery={[]}
          currentDesignIndex={0}
          onGenerateDesign={handleGenerateDesign}
          onUpdateDesign={handleUpdateDesign}
          onApproveDesign={handleApproveDesign}
          onNavigateDesign={() => {}}
          hasNextDesign={() => false}
          hasPrevDesign={() => false}
        />
      </div>
    </DashboardLayout>
  );
}
