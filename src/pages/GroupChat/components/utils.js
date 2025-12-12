// Utility function to categorize resources from groupInfo based on category field from API
export const categorizeResources = (resources) => {
    const photos = [];
    const links = [];
    const documents = [];
    const audio = [];

    if (resources && Array.isArray(resources)) {
        resources.forEach(resource => {
            const { file_type, file_url, category } = resource;
            let classifiedAsPhoto = false;
            let classifiedAsDocument = false;
            let classifiedAsAudio = false;

            // Use category field from API as primary categorization
            let classifiedAsVideo = false;
            
            if (category === 'photos' || category === 'images') {
                photos.push(resource);
                classifiedAsPhoto = true;
            } else if (category === 'audio' || category === 'audios') {
                audio.push(resource);
                classifiedAsAudio = true;
            } else if (category === 'videos' || category === 'video') {
                // Videos should be in photos array for Media tab (since Media tab shows photos + videos)
                photos.push(resource);
                classifiedAsPhoto = true;
                classifiedAsVideo = true;
            } else if (category === 'documents' || category === 'files') {
                documents.push(resource);
                classifiedAsDocument = true;
            } else {
                // Fallback to file type/extension if category is not set
                const extension = extractExtension(resource);
                
                if (file_type?.startsWith('image/') || file_url?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
                    photos.push(resource);
                    classifiedAsPhoto = true;
                } else if (file_type?.startsWith('video/') || 
                          VIDEO_EXTENSIONS.includes(extension) ||
                          file_url?.match(/\.(mp4|mov|webm|mkv|avi)$/i)) {
                    // Videos should be in photos array for Media tab (since Media tab shows photos + videos)
                    photos.push(resource);
                    classifiedAsPhoto = true;
                    classifiedAsVideo = true;
                } else if (file_type?.startsWith('audio/') || 
                          AUDIO_EXTENSIONS.includes(extension) ||
                          file_url?.match(/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i)) {
                    audio.push(resource);
                    classifiedAsAudio = true;
                } else if (file_type?.includes('pdf') || file_type?.includes('doc') || file_type?.includes('docx') || file_type?.includes('xls') || file_type?.includes('xlsx') || file_type?.includes('ppt') || file_type?.includes('pptx') ||
                    file_url?.endsWith('.pdf') || file_url?.endsWith('.doc') || file_url?.endsWith('.docx') || file_url?.endsWith('.xls') || file_url?.endsWith('.xlsx') || file_url?.endsWith('.ppt') || file_url?.endsWith('.pptx')) {
                    documents.push(resource);
                    classifiedAsDocument = true;
                }
            }

            // Always mirror HTTP/HTTPS resources in links per requirement
            // BUT exclude audio files, photos, and videos - they should only appear in their respective categories
            if (file_url && (file_url.startsWith('http://') || file_url.startsWith('https://')) && !classifiedAsAudio && !classifiedAsPhoto && !classifiedAsVideo) {
                links.push(resource);
            }
        });
    }

    return { photos, links, documents, audio };
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv', 'avi'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'm4a', 'ogg'];

const isHttpLink = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);

const extractExtension = (item) => {
    if (item?.file_name && item.file_name.includes('.')) {
        return item.file_name.split('.').pop().toLowerCase();
    }

    const url = item?.media_url || item?.file_url;
    if (!url) return '';
    const cleanUrl = url.split('?')[0];
    if (cleanUrl.includes('.')) {
        return cleanUrl.split('.').pop().toLowerCase();
    }
    return '';
};

const resolveMediaCategory = (item) => {
    const mediaType = item?.media_type?.toLowerCase() || item?.file_type?.toLowerCase() || '';
    const extension = extractExtension(item);

    if (mediaType.includes('image') || IMAGE_EXTENSIONS.includes(extension)) {
        return 'images';
    }
    if (mediaType.includes('video') || VIDEO_EXTENSIONS.includes(extension)) {
        return 'videos';
    }
    if (mediaType.includes('audio') || AUDIO_EXTENSIONS.includes(extension)) {
        return 'audio';
    }
    if (mediaType.includes('link')) {
        return 'links';
    }
    const url = item?.media_url || item?.file_url;
    if (isHttpLink(url) && !extension) {
        return 'links';
    }
    return 'files';
};

export const categorizeMediaItems = (mediaItems = []) => {
    const categories = {
        images: [],
        videos: [],
        audio: [],
        files: [],
        links: []
    };

    if (Array.isArray(mediaItems)) {
        mediaItems.forEach((item) => {
            // Skip voice notes - they should only appear in chat messages, not in media section
            // But allow regular audio files to be stored
            const mediaType = item?.media_type?.toLowerCase() || item?.file_type?.toLowerCase() || '';
            const fileName = item?.file_name?.toLowerCase() || '';
            const extension = extractExtension(item);
            
            // Determine if it's a regular audio file by checking:
            // 1. media_type is 'audio' or starts with 'audio/'
            // 2. File extension is a known audio extension (mp3, wav, etc.)
            // 3. File name has an audio extension
            const isRegularAudio = mediaType === 'audio' || 
                                  mediaType.startsWith('audio/') ||
                                  AUDIO_EXTENSIONS.includes(extension);
            
            // Check if it's a voice note
            // Voice notes are identified by:
            // 1. media_type is explicitly 'voice' or 'voice_note'
            // 2. filename starts with 'voice-' (recorded voice notes)
            const isExplicitVoiceNote = mediaType === 'voice' || mediaType === 'voice_note';
            const isVoiceNoteFilename = fileName.startsWith('voice-');
            
            // Only skip if it's a voice note AND not a regular audio file
            // This ensures uploaded audio files are always stored, even if they have a 'voice-' prefix
            // (which shouldn't happen, but just in case)
            if ((isExplicitVoiceNote || isVoiceNoteFilename) && !isRegularAudio) {
                // Don't add voice notes to any category - they should only appear in chat
                console.log('Skipping voice note:', { mediaType, fileName, extension, isRegularAudio });
                return;
            }

            const bucket = resolveMediaCategory(item);
            if (categories[bucket]) {
                categories[bucket].push(item);
            } else {
                categories.files.push(item);
            }

            const url = item?.media_url || item?.file_url;
            if (isHttpLink(url) && bucket !== 'links') {
                categories.links.push(item);
            }
        });
    }

    return categories;
};
