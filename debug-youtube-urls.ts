// Función mejorada para diagnosticar URLs de YouTube
function getSecureVideoUrl(url: string) {
  if (!url) return '';
  let videoId = '';
  
  console.log('🔍 URL original:', url);
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
      console.log('✅ YouTube v= format, videoId:', videoId);
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
      console.log('✅ YouTube youtu.be format, videoId:', videoId);
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split('?')[0];
      console.log('✅ YouTube embed format, videoId:', videoId);
    } else if (url.includes('/shorts/')) {
      videoId = url.split('/shorts/')[1].split('?')[0];
      console.log('✅ YouTube shorts format, videoId:', videoId);
    } else if (url.includes('/live/')) {
      videoId = url.split('/live/')[1].split('?')[0];
      console.log('✅ YouTube live format, videoId:', videoId);
    } else {
      console.log('❌ URL de YouTube no reconocida:', url);
      return url;
    }
    
    const secureUrl = `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&iv_load_policy=3&controls=1&hl=es&disablekb=1&fs=0&enablejsapi=1&origin=http://localhost:9002`;
    console.log('🔗 URL segura generada:', secureUrl);
    return secureUrl;
  }
  
  if (url.includes('vimeo.com')) {
    const vimeoId = url.split('/').pop()?.split('?')[0];
    console.log('✅ Vimeo, videoId:', vimeoId);
    return `https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0`;
  }
  
  console.log('❌ URL no reconocida como YouTube o Vimeo:', url);
  return url;
}

// URLs de prueba actualizadas
const testUrls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=ChannelName',
  'https://youtube.com/shorts/dQw4w9WgXcQ',
  'https://www.youtube.com/live/dQw4w9WgXcQ'
];

console.log('🧪 Probando URLs de YouTube (mejorado):');
testUrls.forEach(url => {
  console.log('\n---');
  getSecureVideoUrl(url);
});

export { getSecureVideoUrl };
