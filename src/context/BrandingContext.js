import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../API/axiosInstance';

export const BrandingContext = createContext();

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }) => {
    // Try to get cached branding from localStorage
    const getCachedBranding = () => {
        try {
            const cached = localStorage.getItem('cachedBranding');
            if (cached) {
                const parsed = JSON.parse(cached);
                return { ...parsed, loading: true }; // Keep loading true while fetching fresh data
            }
        } catch (e) {
            console.error('Error parsing cached branding:', e);
        }
        return null;
    };

    const [branding, setBranding] = useState(getCachedBranding() || {
        systemName: 'Meetza',
        systemNameColor: '#2c3e50',
        logoUrl: '',
        showPoweredBy: true,
        theme: 'light',
        termsHtml: '',
        privacyHtml: '',
        guidelinesHtml: '',
        authGoogleEnabled: true,
        domains: [],
        loading: true
    });

    const fetchBranding = useCallback(async () => {
        try {
            const res = await api.get(`/companies/id`);
            const data = res.data?.data || res.data;
            const settings = data?.settings || {};
            
            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                const newBranding = {
                    systemName: settings.system_name || data.name || 'Meetza',
                    systemNameColor: settings.system_name_color || '#2c3e50',
                    logoUrl: settings.logo_url || '',
                    showPoweredBy: true,
                    theme: settings.theme || 'light',
                    termsHtml: settings.terms_html || '',
                    privacyHtml: settings.privacy_html || '',
                    guidelinesHtml: settings.guidelines_html || '',
                    authGoogleEnabled: settings.auth_google_enabled !== false && settings.auth_google_enabled !== 0 && settings.auth_google_enabled !== '0',
                    domains: data.domains || [],
                    loading: false
                };

                setBranding(newBranding);
                
                // Cache the branding data (excluding loading state)
                const { loading, ...cacheData } = newBranding;
                localStorage.setItem('cachedBranding', JSON.stringify(cacheData));
                
                if (data.id) {
                    localStorage.setItem('currentCompanyId', data.id);
                }
            } else {
                // If no data returned, reset to default and clear cache
                const defaultBranding = {
                    systemName: 'Meetza',
                    systemNameColor: '#2c3e50',
                    logoUrl: '',
                    showPoweredBy: true,
                    theme: 'light',
                    termsHtml: '',
                    privacyHtml: '',
                    guidelinesHtml: '',
                    authGoogleEnabled: true,
                    domains: [],
                    loading: false
                };
                setBranding(defaultBranding);
                localStorage.removeItem('cachedBranding');
                localStorage.removeItem('currentCompanyId');
            }
        } catch (error) {
            console.error('Branding fetch error:', error);
            // If it's a 404 or 401, it might mean the company/session is gone, so clear cache
            if (error.response?.status === 404 || error.response?.status === 401) {
                localStorage.removeItem('cachedBranding');
                localStorage.removeItem('currentCompanyId');
            }
            setBranding(prev => ({ ...prev, loading: false }));
        }
    }, []);

    useEffect(() => {
        fetchBranding();
    }, [fetchBranding]);

    const updateBranding = (newData) => {
        setBranding(prev => ({
            ...prev,
            ...newData
        }));
    };

    return (
        <BrandingContext.Provider value={{ ...branding, refreshBranding: fetchBranding, updateBranding }}>
            {children}
        </BrandingContext.Provider>
    );
};
