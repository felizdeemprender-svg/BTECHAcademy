import { ok, err } from '@/domain/shared/result';
import { unavailable } from '@/domain/shared/errors';
import type { PublishOptions, PublishResult, SocialPublisher } from '@/domain/marketing/social-publisher';

export class MetaGraphPublisher implements SocialPublisher {
  async publish(options: PublishOptions) {
    if (options.platform !== 'instagram') return err(unavailable('Plataforma no soportada por este adaptador: ' + options.platform));
    if (!options.videoUrl) return err(unavailable('La Graph API para Reels requiere una URL de video (videoUrl).'));
    
    try {
      let targetAccountId = options.credentials.accountId;
      if (!targetAccountId) {
        return err(unavailable('Falta el Account ID en la configuración del motor Meta.'));
      }

      // Intentar auto-resolver si el usuario pegó el ID de la Página de Facebook en vez del de Instagram
      try {
        const pageRes = await fetch(`https://graph.facebook.com/v19.0/${targetAccountId}?fields=instagram_business_account&access_token=${options.credentials.apiKey}`);
        const pageData = await pageRes.json();
        
        if (pageRes.ok) {
          if (pageData.instagram_business_account?.id) {
            targetAccountId = pageData.instagram_business_account.id;
          } else {
            // Es una FB Page pero no tiene IG vinculado
            return err(unavailable(`La página de Facebook ${targetAccountId} no tiene una cuenta de Instagram Business vinculada, o el token carece de permisos.`));
          }
        } else {
          // Si falló la consulta (por ej. porque YA es un IGUser o faltan permisos), lo dejamos pasar y que falle en el POST de media si es incorrecto.
          console.log('[MetaGraph] Error resolviendo FB Page, asumiendo que ya es IG ID:', pageData.error?.message);
        }
      } catch (err: any) {
        console.log('[MetaGraph] Fetch error en resolución:', err.message);
      }

      // 0. Gateway de Google Drive a Firebase Storage Temporal
      const videoUrls = options.videoUrl.split(',').map(u => u.trim()).filter(Boolean);
      const isCarousel = options.format === 'carousel' && videoUrls.length > 1;
      const isStory = options.format === 'story';

      let tempFileRefs: any[] = [];
      let finalUrls: string[] = [];

      for (const url of videoUrls) {
        let finalUrl = url;
        if (url.includes('drive.google.com')) {
          const driveIdMatch = url.match(/[-\w]{25,}/);
          if (driveIdMatch) {
            const driveId = driveIdMatch[0];
            console.log('[MetaGraph] Detectado link de Google Drive. Iniciando Gateway...', driveId);
            try {
              const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
              const res = await fetch(downloadUrl);
              const contentType = res.headers.get('content-type') || '';
              
              if (contentType.includes('text/html')) {
                 return err(unavailable(`El video de Drive es demasiado pesado para el Gateway automático (bloqueo de escaneo de Google). Usa un link directo a un MP4 o súbelo a tu Firebase.`));
              }

              const arrayBuffer = await res.arrayBuffer();
              let buffer = Buffer.from(arrayBuffer);
              
              // Add faststart and re-encode audio to 128k (Meta's strict requirement for some accounts)
              try {
                const os = require('os');
                const path = require('path');
                const fs = require('fs');
                const { execSync } = require('child_process');
                const tempIn = path.join(os.tmpdir(), `in_${driveId}.mp4`);
                const tempOut = path.join(os.tmpdir(), `out_${driveId}.mp4`);
                fs.writeFileSync(tempIn, buffer);
                execSync(`ffmpeg -y -i "${tempIn}" -c:v copy -c:a aac -b:a 128k -movflags faststart "${tempOut}"`, { stdio: 'ignore' });
                if (fs.existsSync(tempOut)) {
                  buffer = fs.readFileSync(tempOut);
                  fs.unlinkSync(tempOut);
                }
                fs.unlinkSync(tempIn);
              } catch (ffmpegErr) {
                console.log('[MetaGraph] Error applying faststart, proceeding with original buffer:', ffmpegErr);
              }
              
              const { adminStorage } = await import('@/firebase/admin');
              const bucket = adminStorage.bucket();
              const fileName = `temp_gateway/meta_video_${Date.now()}_${driveId}.mp4`;
              const tempFileRef = bucket.file(fileName);
              
              const uuid = require('crypto').randomUUID();
              await tempFileRef.save(buffer, { 
                contentType: 'video/mp4'
              });
              
              await tempFileRef.makePublic();
              finalUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURI(fileName)}`;
              tempFileRefs.push(tempFileRef);
              console.log(`[MetaGraph] Gateway exitoso. Tamaño: ${(buffer.length / 1024 / 1024).toFixed(2)} MB. Nueva URL:`, finalUrl);
            } catch (e: any) {
               return err(unavailable(`Fallo el Gateway de Drive: ${e.message}`));
            }
          }
        }
        finalUrls.push(finalUrl);
      }

      // 1. Inicializar contenedor de Media (Reel, Story o Carousel)
      let containerIdToPublish: string;

      if (isCarousel) {
        console.log('[MetaGraph] Iniciando protocolo CAROUSEL_ALBUM con', finalUrls.length, 'ítems.');
        const itemIds: string[] = [];
        
        // A. Crear un item container por cada video
        for (const fUrl of finalUrls) {
          const reqBody = {
            video_url: fUrl,
            media_type: 'VIDEO',
            is_carousel_item: 'true',
            access_token: options.credentials.apiKey
          };
          const createRes = await fetch(`https://graph.facebook.com/v19.0/${targetAccountId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(reqBody)
          });
          const createData = await createRes.json();
          if (createData.error) {
             for (const ref of tempFileRefs) await ref.delete().catch(()=>null);
             return err(unavailable(`Meta API rechazó un item del carrusel: ${createData.error.message}`));
          }
          itemIds.push(createData.id);
        }

        // B. Polling para cada item container
        for (const itemId of itemIds) {
          let isReady = false;
          let attempts = 0;
          while (!isReady && attempts < 20) {
            await new Promise(r => setTimeout(r, 4000));
            const statusRes = await fetch(`https://graph.facebook.com/v19.0/${itemId}?fields=status_code&access_token=${options.credentials.apiKey}`);
            const statusData = await statusRes.json();
            if (statusData.status_code === 'FINISHED') {
              isReady = true;
            } else if (statusData.status_code === 'ERROR') {
               for (const ref of tempFileRefs) await ref.delete().catch(()=>null);
               return err(unavailable(`Meta falló al procesar un item del carrusel (ID: ${itemId}).`));
            }
            attempts++;
          }
          if (!isReady) {
            for (const ref of tempFileRefs) await ref.delete().catch(()=>null);
            return err(unavailable(`Tiempo de espera agotado procesando items del carrusel.`));
          }
        }

        // C. Crear Carousel Container
        const carouselBody = {
          media_type: 'CAROUSEL',
          children: itemIds.join(','),
          caption: options.caption || '',
          access_token: options.credentials.apiKey
        };
        const createRes = await fetch(`https://graph.facebook.com/v19.0/${targetAccountId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(carouselBody)
        });
        const createData = await createRes.json();
        if (createData.error) {
           for (const ref of tempFileRefs) await ref.delete().catch(()=>null);
           return err(unavailable(`Meta API rechazó el Carousel Container: ${createData.error.message}`));
        }
        containerIdToPublish = createData.id;

      } else {
        // Single video (Story o Reel)
        const requestBody: Record<string, string> = {
          video_url: finalUrls[0],
          media_type: isStory ? 'STORIES' : 'REELS',
          access_token: options.credentials.apiKey
        };
        
        if (!isStory) {
          requestBody.caption = options.caption || '';
          requestBody.share_to_feed = 'true';
          requestBody.thumb_offset = '2000';
        }

        const createRes = await fetch(`https://graph.facebook.com/v19.0/${targetAccountId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(requestBody)
        });
        const createData = await createRes.json();
        
        if (createData.error) {
          for (const ref of tempFileRefs) await ref.delete().catch(()=>null);
          return err(unavailable(`Meta API rechazó el video: ${createData.error.message}`));
        }

        // Polling de Single Video
        let isReady = false;
        let attempts = 0;
        while (!isReady && attempts < 15) {
          await new Promise(r => setTimeout(r, 4000));
          const statusRes = await fetch(`https://graph.facebook.com/v19.0/${createData.id}?fields=status_code&access_token=${options.credentials.apiKey}`);
          const statusData = await statusRes.json();
          
          if (statusData.status_code === 'FINISHED') {
            isReady = true;
          } else if (statusData.status_code === 'ERROR') {
            const detail = statusData.status_code_info ? ` Detalle: ${JSON.stringify(statusData.status_code_info)}` : '';
            for (const ref of tempFileRefs) await ref.delete().catch(()=>null);
            return err(unavailable(`Meta falló al procesar el video. URL: ${finalUrls[0]} ${detail}`));
          }
          attempts++;
        }

        if (!isReady) {
          for (const ref of tempFileRefs) await ref.delete().catch(()=>null);
          return err(unavailable(`Tiempo de espera agotado. Meta tardó demasiado en procesar el video.`));
        }
        
        containerIdToPublish = createData.id;
      }

      // Meta a veces dice FINISHED pero internamente sus nodos no han sincronizado el video.
      // Damos 15 segundos enteros antes de intentar publicar para evitar el error 2207085.
      await new Promise(r => setTimeout(r, 15000));

      // 3. Publicar el contenedor principal
      let publishData: any = null;
      let pubAttempts = 0;
      let pubSuccess = false;

      while (!pubSuccess && pubAttempts < 5) {
        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${targetAccountId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            creation_id: containerIdToPublish,
            access_token: options.credentials.apiKey
          })
        });
        publishData = await publishRes.json();

        if (publishData.error) {
          console.log(`[MetaGraph] Detalle del Error de Publicación:`, JSON.stringify(publishData.error, null, 2));
        }

        if (publishData.error && (
          publishData.error.message.includes('Fatal') || 
          publishData.error.message.includes('Media ID is not available') ||
          publishData.error.error_subcode === 2207085 ||
          publishData.error.error_subcode === 2207027
        )) {
          console.log(`[MetaGraph] Error transitorio en intento ${pubAttempts + 1} (${publishData.error.error_subcode || 'N/A'}). Reintentando en 15s...`);
          await new Promise(r => setTimeout(r, 15000));
          pubAttempts++;
        } else if (publishData.error) {
          // Otro error que no es Fatal, cortamos el loop
          break;
        } else {
          pubSuccess = true;
        }
      }

      // 4. Limpieza del Gateway
      for (const ref of tempFileRefs) {
         try {
           await ref.delete();
           console.log('[MetaGraph] Archivo temporal del Gateway eliminado:', ref.name);
         } catch (e) {
           console.log('[MetaGraph] No se pudo borrar el archivo temporal:', e);
         }
      }

      if (!pubSuccess && publishData?.error) {
        return err(unavailable(`Error en la publicación final: ${publishData.error.message}`));
      }

      let finalUrl = `https://instagram.com/p/${publishData.id}`;
      try {
        const permalinkRes = await fetch(`https://graph.facebook.com/v19.0/${publishData.id}?fields=permalink_url&access_token=${options.credentials.apiKey}`);
        const permalinkData = await permalinkRes.json();
        if (permalinkData.permalink_url) {
          finalUrl = permalinkData.permalink_url;
        }
      } catch (e) {
        console.log('[MetaGraph] Error fetching permalink:', e);
      }

      return ok({ postId: publishData.id, url: finalUrl });
    } catch (e: any) {
      return err(unavailable(`Excepción de red conectando con Meta: ${e.message}`));
    }
  }
}
