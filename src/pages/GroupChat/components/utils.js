// Utility function to categorize resources from groupInfo based on category field from API
export const categorizeResources = (resources) => {
    const photos = [];
    const links = [];
    const documents = [];

    if (resources && Array.isArray(resources)) {
        resources.forEach(resource => {
            const { file_type, file_url, category } = resource;
            
            // Use category field from API as primary categorization
            if (category === 'photos' || category === 'images') {
                photos.push(resource);
            } else if (category === 'documents' || category === 'files') {
                documents.push(resource);
            } else {
                // Fallback to file type/extension if category is not set
                if (file_type?.startsWith('image/') || file_url?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
                    photos.push(resource);
                } else if (file_type?.includes('pdf') || file_type?.includes('doc') || file_type?.includes('docx') || file_type?.includes('xls') || file_type?.includes('xlsx') || file_type?.includes('ppt') || file_type?.includes('pptx') ||
                    file_url?.endsWith('.pdf') || file_url?.endsWith('.doc') || file_url?.endsWith('.docx') || file_url?.endsWith('.xls') || file_url?.endsWith('.xlsx') || file_url?.endsWith('.ppt') || file_url?.endsWith('.pptx')) {
                    documents.push(resource);
                }
            }
            
            // Add any resource with http/https URL to links (regardless of category)
            if (file_url && (file_url.startsWith('http://') || file_url.startsWith('https://'))) {
                links.push(resource);
            }
        });
    }

    return { photos, links, documents };
};

