'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth-context';
import { CollectionManager } from './components/collection-manager';
import { AIGenerator } from './components/ai-generator';
import { TemplateViewerProduction } from './components/template-viewer-production';
import { useCollections } from './hooks/use-collections';
import { useAIGeneration } from './hooks/use-ai-generation';
import { useIdentityDesign } from './hooks/use-identity-design';
import { TemplateCollection } from './types/template-types';

export default function MarketingTemplatesPage() {
  const { profile } = useAuth();
  
  // TODOS los hooks primero - sin condicionales
  const { 
    collections, 
    isLoading, 
    createCollection, 
    deleteCollection, 
    updateCollection 
  } = useCollections(profile || null);
  
  const {
    isGenerating,
    generationProgress,
    aiHealth,
    enabledChannels,
    socialTargets,
    performHealthCheck,
    generateTemplates,
    updateEnabledChannels,
    updateSocialTargets
  } = useAIGeneration(profile);

  const {
    isDesigning,
    designProgress,
    identityDesign,
    isDesignApproved,
    designGallery,
    currentDesignIndex,
    generateIdentityDesign,
    updateIdentityDesign,
    approveDesign,
    resetDesign,
    navigateDesign,
    hasNextDesign,
    hasPrevDesign
  } = useIdentityDesign();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [campaignDirectives, setCampaignDirectives] = useState('');
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Colección seleccionada - siempre después de todos los hooks
  const selectedCollection = useMemo(() => {
    if (!selectedId || !collections) return null;
    return collections.find(c => c.id === selectedId);
  }, [selectedId, collections]);


  // Solo ahora podemos hacer early return (después de TODOS los hooks)
  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando información de usuario...</p>
            <p className="text-sm text-gray-500 mt-2">Si persiste, inicia sesión nuevamente</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Handlers
  const handleCreateNew = () => {
    setIsCreateOpen(true);
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
  };

  const handleGenerate = async (name: string, directives: string) => {
    const success = await generateTemplates(
      'new-collection', // collectionId
      name, 
      directives, 
      identityDesign?.designTokens
    );
    if (success) {
      resetDesign(); // Resetear para próxima campaña
    }
    return success;
  };

  const handleViewCollection = (id: string) => {
    setSelectedId(id);
    setIsViewerOpen(true);
  };

  const handleDeleteCollection = async (id: string) => {
    await deleteCollection(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleEditTemplate = (template: any, type: string) => {
    console.log('Edit template:', template, type);
    // TODO: Implementar edición de templates
  };

  const handleRefineTemplate = (template: any, type: string) => {
    console.log('Refine template:', template, type);
    // TODO: Implementar refinamiento con IA
  };

  const handleUpdateCollection = (updatedCollection: TemplateCollection) => {
    if (selectedCollection?.id) {
      updateCollection(selectedCollection.id, updatedCollection);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Arquitecto de Identidad IA</h1>
          <p className="text-gray-600 mt-2">
            Crea identidades visuales con IA y genera planos omnicanal para tus campañas de marketing
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

        {/* Vista Individual de Colección Seleccionada */}
        {selectedCollection && (
          <TemplateViewerProduction 
            collection={selectedCollection}
            isOpen={isViewerOpen}
            onClose={() => setIsViewerOpen(false)}
            onUpdateCollection={handleUpdateCollection}
          />
        )}

        {/* Modal de Generación AI con Flujo Integrado */}
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
          socialTargets={socialTargets}
          onChannelsChange={updateEnabledChannels}
          onSocialTargetsChange={updateSocialTargets}
          onHealthCheck={performHealthCheck}
          // Props para diseño de identidad
          identityDesign={identityDesign}
          isDesigning={isDesigning}
          designProgress={designProgress}
          isDesignApproved={isDesignApproved}
          designGallery={designGallery}
          currentDesignIndex={currentDesignIndex}
          onGenerateDesign={handleGenerateDesign}
          onUpdateDesign={handleUpdateDesign}
          onApproveDesign={handleApproveDesign}
          onNavigateDesign={navigateDesign}
          hasNextDesign={hasNextDesign}
          hasPrevDesign={hasPrevDesign}
        />
      </div>
    </DashboardLayout>
  );
}
