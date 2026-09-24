"use client";

import { useState, useMemo, useCallback } from "react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import {
  collection,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { TemplateCollection } from "../types/template-types";
import { useToast } from "@/hooks/use-toast";

export function useCollections(profile: any) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isAdmin = profile?.roles?.includes('admin');

  // Query para todas las colecciones (Globales)
  const collectionsQuery = useMemoFirebase(() => {
    if (!profile?.uid) return null;
    // Removido el filtro where("ownerId", "==", profile.uid)
    return query(collection(db, "templateCollections"));
  }, [db, profile?.uid]);

  const { data: rawCollections, isLoading: isQueryLoading } =
    useCollection(collectionsQuery);

  // Colecciones ordenadas por fecha
  const collections = useMemo(() => {
    if (!rawCollections) return null;
    return [...rawCollections].sort((a: any, b: any) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [rawCollections]);

  // Crear nueva colección
  const createCollection = useCallback(
    async (name: string, directives: string) => {
      if (!profile?.uid) return;
      if (!isAdmin) {
        toast({
          title: "Acceso Denegado",
          description: "Solo los administradores pueden crear plantillas.",
          variant: "destructive",
        });
        return null;
      }

      setIsLoading(true);
      try {
        const newCollection: Partial<TemplateCollection> = {
          ownerId: profile.uid,
          name,
          directives,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: "generating",
          assets: {},
        };

        const docRef = doc(collection(db, "templateCollections"));
        await setDoc(docRef, newCollection);

        toast({
          title: "Colección creada",
          description: "La colección se ha creado exitosamente.",
        });

        return docRef.id;
      } catch (error) {
        console.error("Error creating collection:", error);
        toast({
          title: "Error",
          description: "No se pudo crear la colección.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [profile?.uid, db, toast],
  );

  // Eliminar colección
  const deleteCollection = useCallback(
    async (collectionId: string) => {
      if (!isAdmin) {
        toast({
          title: "Acceso Denegado",
          description: "Solo los administradores pueden eliminar plantillas.",
          variant: "destructive",
        });
        return;
      }
      setIsLoading(true);
      try {
        await deleteDoc(doc(db, "templateCollections", collectionId));

        toast({
          title: "Colección eliminada",
          description: "La colección se ha eliminado exitosamente.",
        });
      } catch (error) {
        console.error("Error deleting collection:", error);
        toast({
          title: "Error",
          description: "No se pudo eliminar la colección.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [db, toast],
  );

  // Actualizar colección
  const updateCollection = useCallback(
    async (collectionId: string, updates: Partial<TemplateCollection>) => {
      if (!isAdmin) {
        toast({
          title: "Acceso Denegado",
          description: "Solo los administradores pueden editar plantillas.",
          variant: "destructive",
        });
        return;
      }
      setIsLoading(true);
      try {
        await updateDoc(doc(db, "templateCollections", collectionId), {
          ...updates,
          updatedAt: serverTimestamp(),
        });

        toast({
          title: "Colección actualizada",
          description: "Los cambios se han guardado exitosamente.",
        });
      } catch (error) {
        console.error("Error updating collection:", error);
        toast({
          title: "Error",
          description: "No se pudo actualizar la colección.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [db, toast],
  );

  return {
    collections,
    isLoading: isLoading || isQueryLoading,
    createCollection,
    deleteCollection,
    updateCollection,
  };
}
