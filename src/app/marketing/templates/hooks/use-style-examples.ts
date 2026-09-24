"use client";

import { useState, useEffect } from "react";

export function useStyleExamples(styleId: string = 'classic') {
  const [examples, setExamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExamples = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/styles/get-examples?styleId=${styleId}`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data && data.examples) {
          setExamples(data.examples);
        } else {
          setExamples([]);
        }
      } catch (err: any) {
        console.error('Error loading style examples:', err);
        setError(err.message || 'Error loading examples');
        setExamples([]); // Set empty array on error to prevent blank page
      } finally {
        setLoading(false);
      }
    };

    loadExamples();
  }, [styleId]);

  return { examples, loading, error };
}


